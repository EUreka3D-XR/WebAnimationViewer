/* global JSZip */

export class AnimationLoader {
  constructor() {
    this.proxyUrl = "http://localhost:3000/proxy?url=";
    this.supportedModelExtensions = /\.(glb|gltf|obj|stl|splat|ply)$/i;
    this.supportedAudioExtensions = /\.(mp3|wav|ogg)$/i;
    this.supported360Extensions = /\.(jpg|jpeg|png)$/i;
    this.supportedTextExtensions = /\.(txt|md)$/i;
  }

  getIdFromPath() {
    const id = window.location.pathname.substring(1);
    return id || null;
  }

  constructDownloadUrl(id) {
    const sanitizedId = encodeURIComponent(id);
    return `https://datahub.egi.eu/api/v3/onezone/shares/data/${sanitizedId}/content`;
  }

  _extFromUrl(url) {
    try {
      const u = new URL(url);
      const path = u.pathname.toLowerCase();
      const m = path.match(/\.(glb|gltf|obj|stl|splat|ply)$/i);
      return m ? m[1].toLowerCase() : null;
    } catch { return null; }
  }

  async detectFileType(blob, urlHint = null) {
    const hint = urlHint ? this._extFromUrl(urlHint) : null;
    if (hint) return { type: hint === 'zip' ? 'zip' : 'model', format: hint };

    // Magic-bytes sniff (glb, gltf-json, ply, stl)
    const header = await blob.slice(0, 128).arrayBuffer();
    const bytes = new Uint8Array(header);

    // ZIP
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { type: 'zip', format: null };
    }
    // GLB
    if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) {
      return { type: 'model', format: 'glb' };
    }
    // GLTF JSON
    const text = new TextDecoder('utf-8').decode(bytes);
    if (text.trim().startsWith('{')) {
      const full = new TextDecoder('utf-8').decode(new Uint8Array(await blob.slice(0, 512).arrayBuffer()));
      if (full.includes('"asset"') && full.includes('"version"')) return { type: 'model', format: 'gltf' };
    }
    // PLY ASCII
    if (bytes[0] === 0x70 && bytes[1] === 0x6C && bytes[2] === 0x79) return { type: 'model', format: 'ply' };
    // STL ASCII
    if (text.startsWith('solid')) return { type: 'model', format: 'stl' };
    // STL Binary heuristic
    if (blob.size > 84) {
      const stlHeader = new DataView(await blob.slice(80, 84).arrayBuffer()).getUint32(0, true);
      const expected = 84 + (stlHeader * 50);
      if (expected === blob.size) return { type: 'model', format: 'stl' };
    }
    // OBJ guess (starts with 'v ' or '#')
    if ((bytes[0] === 0x76 && bytes[1] === 0x20) || bytes[0] === 0x23) return { type: 'model', format: 'obj' };

    // Unknown – let caller use URL extension if available
    return { type: 'model', format: 'unknown' };
  }

  async loadFromUrl(fileUrl) {
    const proxiedUrl = `${this.proxyUrl}${fileUrl}`;
    const response = await fetch(proxiedUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const blob = await response.blob();

    const { type, format } = await this.detectFileType(blob, fileUrl);
    
    if (type === 'zip') {
      return await this._loadZipFile(blob);
    } else {
      // Case 1: Direct model file (no zip)
      return await this._loadDirectModel(blob, format, fileUrl);
    }
  }

  /**
   * Case 1: Direct model file (.glb, .ply, .obj, splat)
   */
  async _loadDirectModel(blob, format, fileUrl) {
    const ext = format && format !== 'unknown' ? format : (this._extFromUrl(fileUrl) || 'glb');
    const fname = `model.${ext}`;
    const file = new File([blob], fname, { type: blob.type || 'application/octet-stream' });

    return {
      loadCase: 1,
      description: 'Single model file',
      mode: 'filestore',
      viewerType: 'simple',
      primaryFilename: fname,
      filesMap: { [fname]: file },
      hasAudio: false,
      hasPanorama: false,
      hasDescription: false,
      scenes: null,
      manifest: {
        name: `Model (${ext.toUpperCase()})`,
        version: 'auto-generated',
        schemaVersion: '1.0',
        source: 'auto-generated',
        sceneTitle: 'Model Scene'
      }
    };
  }

  /**
   * Analyze ZIP contents and determine which case it represents
   */
  async _loadZipFile(blob) {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const entries = Object.values(zip.files).filter(e => !e.dir);
    
    const manifestEntry = entries.find(e => 
      e.name.toLowerCase() === 'animation_manifest.json' || 
      e.name.toLowerCase().endsWith('/animation_manifest.json')
    );
    
    if (manifestEntry) {
      console.log('Found animation_manifest.json manifest - using structured loading');
      return await this._loadFromManifest(zip, entries, manifestEntry);
    }
    
    console.log('No manifest found - using auto-detection');
    
    const analysis = this._analyzeZipStructure(entries);
    console.log('ZIP Analysis:', analysis);
    
    // Case 5: Multiple scenes in subfolders
    if (analysis.hasSubfolders && analysis.sceneCount > 1) {
      return await this._loadMultiSceneZip(zip, entries, analysis);
    }
    
    // Case 4: Single scene with panorama, audio, and description
    if (analysis.hasPanorama && analysis.hasAudio && analysis.hasDescription) {
      return await this._loadFullSceneZip(zip, entries, analysis);
    }
    
    // Case 3: Model + audio and/or panorama
    if (analysis.hasAudio || analysis.hasPanorama) {
      return await this._loadModelWithAudioZip(zip, entries, analysis);
    }
    
    // Case 2: Model only (or model with textures for .obj)
    return await this._loadModelOnlyZip(zip, entries, analysis);
  }

  /**
   * Load ZIP using animation_manifest.json manifest
   */
  async _loadFromManifest(zip, entries, manifestEntry) {
    try {
      const manifestText = await manifestEntry.async("text");
      const manifest = JSON.parse(manifestText);
      
      console.log('✅ Manifest loaded:', manifest);
      
      if (!manifest.scenes || !Array.isArray(manifest.scenes)) {
        throw new Error('Invalid manifest: missing "scenes" array');
      }
      
      if (manifest.scenes.length === 0) {
        throw new Error('Invalid manifest: "scenes" array is empty');
      }
      
      if (manifest.scenes.length === 1) {
        return await this._loadSingleSceneFromManifest(zip, manifest, manifest.scenes[0]);
      }
      
      return await this._loadMultiSceneFromManifest(zip, manifest);
      
    } catch (error) {
      console.error('❌ Failed to parse manifest:', error);
      console.log('⚠️ Falling back to auto-detection');
      
      const analysis = this._analyzeZipStructure(entries);
      
      if (analysis.hasSubfolders && analysis.sceneCount > 1) {
        return await this._loadMultiSceneZip(zip, entries, analysis);
      } else if (analysis.hasAudio) {
        return await this._loadModelWithAudioZip(zip, entries, analysis);
      } else {
        return await this._loadModelOnlyZip(zip, entries, analysis);
      }
    }
  }

  /**
   * Load single scene from manifest
   */
  async _loadSingleSceneFromManifest(zip, manifest, sceneConfig) {
    const filesMap = {};
    let audioUrl = null;
    let panoramaUrl = null;
    let description = null;
    
    const files = sceneConfig.files || {};
    
    if (!files.model) {
      throw new Error(`Scene "${sceneConfig.id}" missing model file path`);
    }
    
    const modelEntry = zip.file(files.model);
    if (!modelEntry) {
      throw new Error(`Model file not found: ${files.model}`);
    }
    
    const modelBlob = await modelEntry.async("blob");
    const modelFileName = files.model.split('/').pop();
    filesMap[files.model] = new File([modelBlob], modelFileName, { 
      type: modelBlob.type || 'application/octet-stream' 
    });
    
    // Load associated texture files (for OBJ models)
    // Find MTL file and textures with matching base name
    const modelDir = files.model.substring(0, files.model.lastIndexOf('/'));
    const modelBaseName = files.model.split('/').pop().replace(/\.[^.]+$/, '');
    const modelDirPrefix = modelDir ? modelDir + '/' : '';
    
    if (modelDir) {
      const textures = Object.values(zip.files).filter(f => 
        !f.dir && 
        f.name.startsWith(modelDirPrefix) && 
        f.name !== files.model &&
        f.name !== files.background && // Exclude panorama
        (
          // MTL file with same base name
          (f.name.toLowerCase().endsWith('.mtl') && 
           f.name.split('/').pop().replace(/\.[^.]+$/, '') === modelBaseName) ||
          // Texture images with matching base name
          (/\.(jpg|jpeg|png)$/i.test(f.name) && 
           f.name.split('/').pop().toLowerCase().includes(modelBaseName.toLowerCase())) ||
          // Binary files (glTF)
          f.name.toLowerCase().endsWith('.bin')
        )
      );
      
      for (const texEntry of textures) {
        const texBlob = await texEntry.async("blob");
        const texFileName = texEntry.name.split('/').pop();
        filesMap[texEntry.name] = new File([texBlob], texFileName, { 
          type: texBlob.type || 'application/octet-stream' 
        });
      }
    }
    
    if (files.audio) {
      const audioEntry = zip.file(files.audio);
      if (audioEntry) {
        const audioBlob = await audioEntry.async("blob");
        audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
      } else {
        console.warn(`Audio file not found: ${files.audio}`);
      }
    }
    
    if (files.background) {
      const bgEntry = zip.file(files.background);
      if (bgEntry) {
        const bgBlob = await bgEntry.async("blob");
        panoramaUrl = URL.createObjectURL(bgBlob);
      } else {
        console.warn(`Background file not found: ${files.background}`);
      }
    }
    
    if (files.description) {
      const descEntry = zip.file(files.description);
      if (descEntry) {
        description = await descEntry.async("text");
      } else {
        console.warn(`Description file not found: ${files.description}`);
      }
    }
    
    const hasAudio = !!audioUrl;
    const hasPanorama = !!panoramaUrl;
    const hasDescription = !!description;
    
    let loadCase = 2; // Default: model only
    let caseDescription = 'Model file from manifest';
    
    if (hasAudio && hasPanorama && hasDescription) {
      loadCase = 4;
      caseDescription = 'Full scene with model, panorama, audio, and description (from manifest)';
    } else if (hasAudio || hasPanorama) {
      loadCase = 3;
      caseDescription = 'Model with' + (hasAudio ? ' audio' : '') + (hasAudio && hasPanorama ? ' and' : '') + (hasPanorama ? ' panorama' : '') + ' (from manifest)';
    }
    
    return {
      loadCase,
      description: caseDescription,
      mode: 'filestore',
      viewerType: (hasAudio || hasPanorama) ? 'audio' : 'simple',
      primaryFilename: files.model,
      filesMap,
      audioUrl,
      panoramaUrl,
      sceneDescription: description,
      hasAudio,
      hasPanorama,
      hasDescription,
      scenes: null,
      manifest: {
        name: manifest.package?.name || 'Animation Package',
        version: manifest.package?.version || '1.0',
        schemaVersion: manifest.schemaVersion || '1.0',
        source: 'user-provided',
        sceneTitle: sceneConfig.title || sceneConfig.id
      }
    };
  }

  /**
   * Load multiple scenes from manifest
   */
  async _loadMultiSceneFromManifest(zip, manifest) {
    const scenes = [];
    
    for (const sceneConfig of manifest.scenes) {
      try {
        const scene = await this._loadSceneFromManifestConfig(zip, sceneConfig);
        scenes.push(scene);
        console.log(`✅ Loaded scene "${sceneConfig.title || sceneConfig.id}" from manifest`);
      } catch (error) {
        console.error(`❌ Failed to load scene "${sceneConfig.id}":`, error);
      }
    }
    
    if (scenes.length === 0) {
      throw new Error("No valid scenes could be loaded from manifest");
    }
    
    // Find default scene index
    let defaultSceneIndex = 0;
    if (manifest.defaultSceneId) {
      const defaultIndex = scenes.findIndex(s => s.id === manifest.defaultSceneId);
      if (defaultIndex !== -1) {
        defaultSceneIndex = defaultIndex;
      }
    }
    
    return {
      loadCase: 5,
      description: `Multiple scenes from manifest (${scenes.length} scenes)`,
      mode: 'multi-scene',
      viewerType: 'audio',
      scenes,
      hasAudio: scenes.some(s => s.hasAudio),
      hasPanorama: scenes.some(s => s.hasPanorama),
      hasDescription: scenes.some(s => s.hasDescription),
      currentSceneIndex: defaultSceneIndex,
      manifest: {
        name: manifest.package?.name || 'Animation Package',
        version: manifest.package?.version || '1.0',
        schemaVersion: manifest.schemaVersion || '1.0',
        source: 'user-provided'
      }
    };
  }

  /**
   * Load a single scene from manifest config
   */
  async _loadSceneFromManifestConfig(zip, sceneConfig) {
    const filesMap = {};
    let audioUrl = null;
    let panoramaUrl = null;
    let description = null;
    
    const files = sceneConfig.files || {};
    
    if (!files.model) {
      throw new Error(`Scene "${sceneConfig.id}" missing model file path`);
    }
    
    const modelEntry = zip.file(files.model);
    if (!modelEntry) {
      throw new Error(`Model file not found: ${files.model}`);
    }
    
    const modelBlob = await modelEntry.async("blob");
    const modelFileName = files.model.split('/').pop();
    filesMap[files.model] = new File([modelBlob], modelFileName, { 
      type: modelBlob.type || 'application/octet-stream' 
    });
    
    // Load associated texture files (for OBJ models)
    // Find MTL file and textures with matching base name
    const modelDir = files.model.substring(0, files.model.lastIndexOf('/'));
    const modelBaseName = files.model.split('/').pop().replace(/\.[^.]+$/, '');
    const modelDirPrefix = modelDir ? modelDir + '/' : '';
    
    if (modelDir) {
      const textures = Object.values(zip.files).filter(f => 
        !f.dir && 
        f.name.startsWith(modelDirPrefix) && 
        f.name !== files.model &&
        f.name !== files.background && // Exclude panorama
        (
          // MTL file with same base name
          (f.name.toLowerCase().endsWith('.mtl') && 
           f.name.split('/').pop().replace(/\.[^.]+$/, '') === modelBaseName) ||
          // Texture images with matching base name
          (/\.(jpg|jpeg|png)$/i.test(f.name) && 
           f.name.split('/').pop().toLowerCase().includes(modelBaseName.toLowerCase())) ||
          // Binary files (glTF)
          f.name.toLowerCase().endsWith('.bin')
        )
      );
      
      for (const texEntry of textures) {
        const texBlob = await texEntry.async("blob");
        const texFileName = texEntry.name.split('/').pop();
        filesMap[texEntry.name] = new File([texBlob], texFileName, { 
          type: texBlob.type || 'application/octet-stream' 
        });
      }
    }
    
    if (files.audio) {
      const audioEntry = zip.file(files.audio);
      if (audioEntry) {
        const audioBlob = await audioEntry.async("blob");
        audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
      } else {
        console.warn(`Audio file not found: ${files.audio}`);
      }
    }
    
    if (files.background) {
      const bgEntry = zip.file(files.background);
      if (bgEntry) {
        const bgBlob = await bgEntry.async("blob");
        panoramaUrl = URL.createObjectURL(bgBlob);
      } else {
        console.warn(`Background file not found: ${files.background}`);
      }
    }
    
    if (files.description) {
      const descEntry = zip.file(files.description);
      if (descEntry) {
        description = await descEntry.async("text");
      } else {
        console.warn(`Description file not found: ${files.description}`);
      }
    }
    
    return {
      id: sceneConfig.id,
      name: sceneConfig.title || sceneConfig.id,
      primaryFilename: files.model,
      filesMap,
      audioUrl,
      panoramaUrl,
      sceneDescription: description,
      hasAudio: !!audioUrl,
      hasPanorama: !!panoramaUrl,
      hasDescription: !!description
    };
  }

  /**
   * Analyze the structure of ZIP contents
   */
  _analyzeZipStructure(entries) {
    const analysis = {
      modelFiles: [],
      audioFiles: [],
      panoramaFiles: [],
      descriptionFiles: [],
      textureFiles: [],
      subfolders: new Set(),
      hasSubfolders: false,
      sceneCount: 0,
      hasAudio: false,
      hasPanorama: false,
      hasDescription: false
    };

    for (const entry of entries) {
      const name = entry.name;
      const lower = name.toLowerCase();
      const pathParts = name.split('/').filter(p => p);
      
      if (pathParts.length > 1) {
        analysis.subfolders.add(pathParts[0]);
        analysis.hasSubfolders = true;
      }
      
      if (this.supportedModelExtensions.test(lower)) {
        analysis.modelFiles.push(entry);
      } else if (this.supportedAudioExtensions.test(lower)) {
        analysis.audioFiles.push(entry);
        analysis.hasAudio = true;
      } else if (this.supported360Extensions.test(lower) && 
                 (lower.includes('360') || lower.includes('background') || lower.includes('bg') || lower.includes('panorama'))) {
        analysis.panoramaFiles.push(entry);
        analysis.hasPanorama = true;
      } else if (this.supportedTextExtensions.test(lower)) {
        analysis.descriptionFiles.push(entry);
        analysis.hasDescription = true;
      }
    }
    
    // Find texture files that match model names (for OBJ models)
    // Look for .mtl files and texture images with matching base names
    for (const modelFile of analysis.modelFiles) {
      const modelPath = modelFile.name;
      const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
      const modelBaseName = modelPath.split('/').pop().replace(/\.[^.]+$/, '');
      const modelDirPrefix = modelDir ? modelDir + '/' : '';
      
      const mtlFiles = entries.filter(e => 
        !e.dir &&
        e.name.toLowerCase().endsWith('.mtl') &&
        e.name.startsWith(modelDirPrefix) &&
        e.name.split('/').pop().replace(/\.[^.]+$/, '') === modelBaseName
      );
      
      const textureImages = entries.filter(e => 
        !e.dir &&
        /\.(jpg|jpeg|png)$/i.test(e.name) &&
        e.name.startsWith(modelDirPrefix) &&
        !analysis.panoramaFiles.includes(e) &&
        e.name.split('/').pop().toLowerCase().includes(modelBaseName.toLowerCase())
      );
      
      const binFiles = entries.filter(e =>
        !e.dir &&
        e.name.toLowerCase().endsWith('.bin') &&
        e.name.startsWith(modelDirPrefix)
      );
      
      analysis.textureFiles.push(...mtlFiles, ...textureImages, ...binFiles);
    }
    
    analysis.textureFiles = [...new Set(analysis.textureFiles)];
    
    if (analysis.hasSubfolders) {
      const sceneFolders = Array.from(analysis.subfolders).filter(folder => {
        return analysis.modelFiles.some(mf => mf.name.startsWith(folder + '/'));
      });
      analysis.sceneCount = sceneFolders.length;
    } else {
      analysis.sceneCount = analysis.modelFiles.length > 0 ? 1 : 0;
    }
    
    return analysis;
  }

  /**
   * Case 2: Model only (or with textures)
   */
  async _loadModelOnlyZip(zip, entries, analysis) {
    const filesMap = {};
    
    if (analysis.modelFiles.length === 0) {
      throw new Error("No model file found in ZIP.");
    }
    
    const primaryModel = analysis.modelFiles[0];
    const modelFileName = primaryModel.name.split('/').pop();
    const modelExt = modelFileName.split('.').pop().toUpperCase();
    
    // Load model and related files (textures, materials)
    const relevantFiles = [...analysis.modelFiles, ...analysis.textureFiles];
    
    for (const entry of relevantFiles) {
      const fileBlob = await entry.async("blob");
      const fileName = entry.name.split('/').pop();
      filesMap[entry.name] = new File([fileBlob], fileName, { 
        type: fileBlob.type || 'application/octet-stream' 
      });
    }
    
    return {
      loadCase: 2,
      description: 'Model file with textures (OBJ) or standalone',
      mode: 'filestore',
      viewerType: 'simple',
      primaryFilename: primaryModel.name,
      filesMap,
      hasAudio: false,
      hasPanorama: false,
      hasDescription: false,
      scenes: null,
      manifest: {
        name: `Model Package (${modelExt})`,
        version: 'auto-generated',
        schemaVersion: '1.0',
        source: 'auto-generated',
        sceneTitle: modelFileName.replace(/\.[^.]+$/, '')
      }
    };
  }

  /**
   * Case 3: Model + Audio (with or without panorama)
   */
  async _loadModelWithAudioZip(zip, entries, analysis) {
    const filesMap = {};
    let audioUrl = null;
    let panoramaUrl = null;
    
    if (analysis.modelFiles.length === 0) {
      throw new Error("No model file found in ZIP.");
    }
    
    const primaryModel = analysis.modelFiles[0];
    
    // Load model and textures
    const modelRelatedFiles = [...analysis.modelFiles, ...analysis.textureFiles];
    for (const entry of modelRelatedFiles) {
      const fileBlob = await entry.async("blob");
      const fileName = entry.name.split('/').pop();
      filesMap[entry.name] = new File([fileBlob], fileName, { 
        type: fileBlob.type || 'application/octet-stream' 
      });
    }
    
    // Load audio
    if (analysis.audioFiles.length > 0) {
      const audioEntry = analysis.audioFiles[0];
      const audioBlob = await audioEntry.async("blob");
      audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
    }
    
    // Load panorama if present
    if (analysis.panoramaFiles.length > 0) {
      const panoramaEntry = analysis.panoramaFiles[0];
      const panoramaBlob = await panoramaEntry.async("blob");
      panoramaUrl = URL.createObjectURL(panoramaBlob);
    }
    
    const modelFileName = primaryModel.name.split('/').pop();
    const modelExt = modelFileName.split('.').pop().toUpperCase();
    
    const hasAudio = !!audioUrl;
    const hasPanorama = !!panoramaUrl;
    
    return {
      loadCase: 3,
      description: 'Model with' + (hasAudio ? ' audio' : '') + (hasAudio && hasPanorama ? ' and' : '') + (hasPanorama ? ' panorama' : ''),
      mode: 'filestore',
      viewerType: 'audio',
      primaryFilename: primaryModel.name,
      filesMap,
      audioUrl,
      panoramaUrl,
      hasAudio,
      hasPanorama,
      hasDescription: false,
      scenes: null,
      manifest: {
        name: `Animation Package (${modelExt})`,
        version: 'auto-generated',
        schemaVersion: '1.0',
        source: 'auto-generated',
        sceneTitle: modelFileName.replace(/\.[^.]+$/, '')
      }
    };
  }

  /**
   * Case 4: Full scene (model + panorama + audio + description)
   */
  async _loadFullSceneZip(zip, entries, analysis) {
    const filesMap = {};
    let audioUrl = null;
    let panoramaUrl = null;
    let description = null;
    
    if (analysis.modelFiles.length === 0) {
      throw new Error("No model file found in ZIP.");
    }
    
    const primaryModel = analysis.modelFiles[0];
    
    // Load model and textures
    const modelRelatedFiles = [...analysis.modelFiles, ...analysis.textureFiles];
    for (const entry of modelRelatedFiles) {
      const fileBlob = await entry.async("blob");
      const fileName = entry.name.split('/').pop();
      filesMap[entry.name] = new File([fileBlob], fileName, { 
        type: fileBlob.type || 'application/octet-stream' 
      });
    }
    
    // Load audio
    if (analysis.audioFiles.length > 0) {
      const audioEntry = analysis.audioFiles[0];
      const audioBlob = await audioEntry.async("blob");
      audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
    }
    
    // Load panorama
    if (analysis.panoramaFiles.length > 0) {
      const panoramaEntry = analysis.panoramaFiles[0];
      const panoramaBlob = await panoramaEntry.async("blob");
      panoramaUrl = URL.createObjectURL(panoramaBlob);
    }
    
    // Load description
    if (analysis.descriptionFiles.length > 0) {
      const descEntry = analysis.descriptionFiles[0];
      description = await descEntry.async("text");
    }
    
    const modelFileName = primaryModel.name.split('/').pop();
    const modelExt = modelFileName.split('.').pop().toUpperCase();
    
    return {
      loadCase: 4,
      description: 'Full scene with model, panorama, audio, and description',
      mode: 'filestore',
      viewerType: 'audio',
      primaryFilename: primaryModel.name,
      filesMap,
      audioUrl,
      panoramaUrl,
      sceneDescription: description,
      hasAudio: true,
      hasPanorama: true,
      hasDescription: true,
      scenes: null,
      manifest: {
        name: `Full Scene Package (${modelExt})`,
        version: 'auto-generated',
        schemaVersion: '1.0',
        source: 'auto-generated',
        sceneTitle: modelFileName.replace(/\.[^.]+$/, '')
      }
    };
  }

  /**
   * Case 5: Multiple scenes in subfolders
   */
  async _loadMultiSceneZip(zip, entries, analysis) {
    const scenes = [];
    const folders = Array.from(analysis.subfolders);
    
    for (const folderName of folders) {
      const folderPrefix = folderName + '/';
      const folderEntries = entries.filter(e => e.name.startsWith(folderPrefix));
      
      // Analyze this folder
      const folderAnalysis = this._analyzeZipStructure(folderEntries);
      
      if (folderAnalysis.modelFiles.length === 0) {
        console.warn(`Skipping folder "${folderName}" - no model file found`);
        continue;
      }
      
      const scene = await this._loadSceneFromFolder(zip, folderEntries, folderAnalysis, folderName);
      scenes.push(scene);
    }
    
    if (scenes.length === 0) {
      throw new Error("No valid scenes found in ZIP subfolders.");
    }
    
    return {
      loadCase: 5,
      description: `Multiple scenes (${scenes.length} scenes found)`,
      mode: 'multi-scene',
      viewerType: 'audio',
      scenes,
      hasAudio: scenes.some(s => s.hasAudio),
      hasPanorama: scenes.some(s => s.hasPanorama),
      hasDescription: scenes.some(s => s.hasDescription),
      currentSceneIndex: 0,
      manifest: {
        name: `Multi-Scene Package (${scenes.length} scenes)`,
        version: 'auto-generated',
        schemaVersion: '1.0',
        source: 'auto-generated'
      }
    };
  }

  /**
   * Load a single scene from a folder
   */
  async _loadSceneFromFolder(zip, folderEntries, folderAnalysis, folderName) {
    const filesMap = {};
    let audioUrl = null;
    let panoramaUrl = null;
    let description = null;
    
    const primaryModel = folderAnalysis.modelFiles[0];
    
    // Load model and textures
    const modelRelatedFiles = [...folderAnalysis.modelFiles, ...folderAnalysis.textureFiles];
    for (const entry of modelRelatedFiles) {
      const fileBlob = await entry.async("blob");
      const fileName = entry.name.split('/').pop();
      filesMap[entry.name] = new File([fileBlob], fileName, { 
        type: fileBlob.type || 'application/octet-stream' 
      });
    }
    
    // Load audio
    if (folderAnalysis.audioFiles.length > 0) {
      const audioEntry = folderAnalysis.audioFiles[0];
      const audioBlob = await audioEntry.async("blob");
      audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
    }
    
    // Load panorama
    if (folderAnalysis.panoramaFiles.length > 0) {
      const panoramaEntry = folderAnalysis.panoramaFiles[0];
      const panoramaBlob = await panoramaEntry.async("blob");
      panoramaUrl = URL.createObjectURL(panoramaBlob);
    }
    
    // Load description
    if (folderAnalysis.descriptionFiles.length > 0) {
      const descEntry = folderAnalysis.descriptionFiles[0];
      description = await descEntry.async("text");
    }
    
    return {
      name: folderName,
      primaryFilename: primaryModel.name,
      filesMap,
      audioUrl,
      panoramaUrl,
      sceneDescription: description,
      hasAudio: !!audioUrl,
      hasPanorama: !!panoramaUrl,
      hasDescription: !!description
    };
  }
}