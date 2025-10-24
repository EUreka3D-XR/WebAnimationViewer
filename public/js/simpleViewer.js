/* global BABYLON */
import { AnimationControls } from './controls.js';
import * as Utils from './utils.js';

export class SimpleViewer {
  constructor() {
    this.viewerElement = null;
    this.engine = null;
    this.scene = null;
    this.canvas = null;
    this._registeredKeys = [];
    this._hemi = null;
    this._dirLight = null;
    this._envHelper = null;
    this._bgHex = "#667eea";
    this._transparent = false;
    this.controls = null;
    this._maxRetries = 3;  // Maximum number of retry attempts. This is useful due to large files
  }

  async initialize(source) {
    // Clear any existing content
    const canvasZone = document.getElementById("canvasZone");
    canvasZone.innerHTML = '';

    // Set up canvas/engine/scene
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'renderCanvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    canvasZone.appendChild(this.canvas);

    canvasZone.style.background = this._bgHex;

    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      premultipliedAlpha: false,  // Important for transparency
      alpha: true
    });
    
    this.scene = new BABYLON.Scene(this.engine);

    const c = BABYLON.Color3.FromHexString(this._bgHex);
    this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, 1);

    // Create ArcRotateCamera for better control. This differs from audioViewr
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 2,
      10,
      BABYLON.Vector3.Zero(),
      this.scene
    );
    camera.attachControl(this.canvas, true);
    
    // Set proper clipping planes from the start
    camera.minZ = 0.01;
    camera.maxZ = 10000;
    camera.lowerRadiusLimit = 0.01;
    
    camera.wheelPrecision = 50;
    camera.pinchPrecision = 50;

    this._hemi = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    this._hemi.intensity = 1.2;

    this._dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), this.scene);
    this._dirLight.intensity = 0.8;

    this._envHelper = this.scene.createDefaultEnvironment({ 
      createGround: false, 
      createSkybox: false 
    });

    this.setBackgroundColor(this._bgHex);
    this.setTransparentBackground(false);

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());

    await this._loadModel(source);
    
    // Wait for the scene to be fully ready before signaling completion
    await this._waitForSceneReady();
  }
  
  async _waitForSceneReady() {
    return new Promise((resolve) => {
      this.scene.executeWhenReady(() => {
        // Wait for at least one render frame to ensure the model is actually visible
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  setBackgroundColor(hex) {
    if (!this.scene) return;
    this._bgHex = hex;
    Utils.setBackgroundColor(this.scene, this.canvas, hex, this._transparent);
  }

  setTransparentBackground(on) {
    if (!this.scene || !this.canvas) return;
    this._transparent = !!on;
    Utils.setTransparentBackground(this.scene, this.canvas, this._bgHex, this._transparent);
  }

  setLightIntensity(v) {
    Utils.setLightIntensity(this.scene, v);
  }

  setEnvironmentIntensity(v) {
    Utils.setEnvironmentIntensity(this.scene, v);
  }

  async _loadModel(source) {
    let attempts = 0;
    let lastError = null;

    while (attempts < this._maxRetries) {
      try {
        attempts++;
        console.log(`Load attempt ${attempts}/${this._maxRetries}`);

        await this._loadModelInternal(source);

        console.log('Model loaded successfully');
        return;

        
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempts} failed:`, error);
        
        // Clean up before retry
        await this._cleanup();
        
        if (attempts < this._maxRetries) {
          console.log(`Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.error('All retry attempts failed');
    throw lastError;
  }

  async _cleanup() {
    console.log('Cleaning up scene...');
    
    if (this.scene) {
      this.scene.meshes.slice().forEach(mesh => {
        try {
          if (mesh.dispose) {
            mesh.dispose(false, true);
          }
        } catch (e) {
          console.warn('Error disposing mesh:', e);
        }
      });
    }
    
    this._unregisterFiles();
    
    if (window.gc) {
      window.gc();
    }
  }

  async _loadModelInternal(source) {
    this._unregisterFiles();

    const pluginFor = {
      glb: '.glb',
      gltf: '.gltf',
      obj: '.obj',
      stl: '.stl',
      ply: '.ply',
      splat: '.splat'
    };

    let result;

    if (source.mode === 'filestore') {
      const ext = (source.primaryFilename.split('.').pop() || '').toLowerCase();
      
      // Special handling for PLY files (detect type and convert if needed)
      if (ext === 'ply') {
        const plyFile = source.filesMap[source.primaryFilename];
        const plyInfo = await this._detectPLYType(plyFile);
        console.log (`Detected PLY type: ${plyInfo.type}`);
        
        if (plyInfo.type === 'mesh_with_uv' || plyInfo.type === 'mesh') {
          console.log('Mesh PLY detected - converting to mesh...');
          result = await this._convertPLYToGLB(plyFile);
        } else if (plyInfo.type === 'gaussian_splat') {
          console.log('Gaussian Splat PLY detected - loading with Babylon loader...');
        } else if (plyInfo.type === 'point_cloud') {
          console.log('Point cloud PLY detected - creating point cloud visualization...');
          result = await this._createPointCloud(plyFile);
        } else {
          throw new Error(`Unsupported PLY type: ${plyInfo.type}`);
        }
      }
      
      // If result is not set (either not PLY or Gaussian Splat PLY), use standard loader
      if (!result) {
        for (const [relPath, file] of Object.entries(source.filesMap)) {
          const k1 = relPath.toLowerCase();
          const base = relPath.split('/').pop().toLowerCase();
          BABYLON.FilesInputStore.FilesToLoad[k1] = file;
          BABYLON.FilesInputStore.FilesToLoad[base] = file;
          this._registeredKeys.push(k1, base);
        }

        const pluginExt = pluginFor[ext] || undefined;
        result = await BABYLON.SceneLoader.ImportMeshAsync(
          "",
          "file:",
          source.primaryFilename,
          this.scene,
          null,
          pluginExt
        );
      }
    } else {
      const ext = (source.format || '').toLowerCase();
      const pluginExt = pluginFor[ext] || undefined;

      result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "",
        source.url,
        this.scene,
        null,
        pluginExt
      );
    }

    console.log(`Loaded ${result.meshes.length} meshes, ${result.animationGroups?.length || 0} animations`);

    // Ensure meshes render properly at all distances
    Utils.applyCloseZoomFix(result.meshes);

    const animationGroups = result.animationGroups || [];
    const filteredAnimationGroups = animationGroups.filter(
      group => !group.name.startsWith("Key")
    );

    if (filteredAnimationGroups.length > 0) {
      console.log(`Found ${filteredAnimationGroups.length} animations - showing controls`);
      
      filteredAnimationGroups.forEach(group => {
        group.stop();
        group.reset();
      });

      this.controls = new AnimationControls(this.scene);
      this.controls.setupEventListeners();
      this.controls.setAnimations(filteredAnimationGroups);
      this.controls.showControls();

      this._centerAnimatedModel(result.meshes);
    } else {
      this._frameCamera(result.meshes);
      console.log('No animations found - hiding controls');
      
      const controlsElement = document.getElementById("controls");
      if (controlsElement) {
        controlsElement.style.display = 'none';
      }
    }
  }

  _frameCamera(meshes) {
    const camera = this.scene.activeCamera;
    // Use default settings which match the original working code
    Utils.frameCameraForStaticModel(camera, meshes);
  }

  _centerAnimatedModel(meshes) {
    const camera = this.scene.activeCamera;
    // Use default settings which match the original working code
    Utils.centerCameraOnModel(camera, this.scene, meshes);
  }

  async _detectPLYType(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const headerText = new TextDecoder('utf-8').decode(uint8Array.slice(0, 8192));
        const lines = headerText.split(/\r?\n/);
        
        const hasFaces = lines.some(l => /^element\s+face\s+\d+/i.test(l));
        const hasPerFaceUV = lines.some(l => /property\s+list\s+\w+\s+float\s+texcoord/i.test(l));
        const hasSH = lines.some(l => l.includes('f_dc_') || l.includes('f_rest_') || 
                                      l.includes('scale_') || l.includes('rot_') ||
                                      l.includes('opacity'));
        
        let type;
        if (hasSH) {
          type = 'gaussian_splat';
        } else if (hasFaces && hasPerFaceUV) {
          type = 'mesh_with_uv'; // Problematic PLY that needs conversion
        } else if (hasFaces) {
          type = 'mesh';
        } else {
          type = 'point_cloud';
        }
        
        console.log(`PLY Type: ${type}, hasFaces: ${hasFaces}, hasUV: ${hasPerFaceUV}, hasSH: ${hasSH}`);
        
        resolve({ type, hasFaces, hasPerFaceUV, hasSH });
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  _convertPLYToGLB(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const view = new DataView(arrayBuffer);
          
          console.log('Converting PLY to GLB...');
          
          let offset = 0, header = "", nl = 0;
          while (true) {
            const c = view.getUint8(offset++);
            header += String.fromCharCode(c);
            if (header.endsWith("end_header\n")) break;
            if (++nl > 1e6) throw new Error("Bad PLY header");
          }
          
          const headerLines = header.trim().split(/\r?\n/);
          const get = (re) => (headerLines.find(l => re.test(l)) || "").match(re);
          
          const vMatch = get(/^element\s+vertex\s+(\d+)/i);
          const fMatch = get(/^element\s+face\s+(\d+)/i);
          const nVerts = vMatch ? parseInt(vMatch[1], 10) : 0;
          const nFaces = fMatch ? parseInt(fMatch[1], 10) : 0;
          
          console.log(`PLY has ${nVerts} vertices, ${nFaces} faces`);
          
          const pos = new Float32Array(nVerts * 3);
          const col = new Float32Array(nVerts * 4);
          
          let minX = Infinity, minY = Infinity, minZ = Infinity;
          let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
          
          for (let i = 0; i < nVerts; i++) {
            const base = offset + i * (4 * 3 + 1 * 3);
            const x = view.getFloat32(base + 0, true);
            const y = view.getFloat32(base + 4, true);
            const z = view.getFloat32(base + 8, true);
            
            pos[i * 3 + 0] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;
            
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
            
            const r = view.getUint8(base + 12);
            const g = view.getUint8(base + 13);
            const b = view.getUint8(base + 14);
            col[i * 4 + 0] = r / 255;
            col[i * 4 + 1] = g / 255;
            col[i * 4 + 2] = b / 255;
            col[i * 4 + 3] = 1.0;
          }
          
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const centerZ = (minZ + maxZ) / 2;
          
          console.log(`Original bounds: min=(${minX.toFixed(2)}, ${minY.toFixed(2)}, ${minZ.toFixed(2)}), max=(${maxX.toFixed(2)}, ${maxY.toFixed(2)}, ${maxZ.toFixed(2)})`);
          console.log(`Centering at: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`);
          
          for (let i = 0; i < nVerts; i++) {
            pos[i * 3 + 0] -= centerX;
            pos[i * 3 + 1] -= centerY;
            pos[i * 3 + 2] -= centerZ;
          }
          
          offset += nVerts * (4 * 3 + 3);
          
          const outPos = [];
          const outUVs = [];
          const outCol = [];
          const outIdx = [];
          
          let vCounter = 0;
          const readUint8 = () => view.getUint8(offset++);
          const readInt32 = () => { const x = view.getInt32(offset, true); offset += 4; return x; };
          const readFloat = () => { const x = view.getFloat32(offset, true); offset += 4; return x; };
          
          for (let f = 0; f < nFaces; f++) {
            const n = readUint8();
            const idx = new Array(n);
            for (let i = 0; i < n; i++) idx[i] = readInt32();
            
            const tlen = readUint8();
            const tcoords = new Array(tlen);
            for (let i = 0; i < tlen; i++) tcoords[i] = readFloat();
            
            for (let tri = 0; tri < n - 2; tri++) {
              const triIdx = [idx[0], idx[tri + 1], idx[tri + 2]];
              const uvCorners = [
                [tcoords[0], tcoords[1]],
                [tcoords[(tri + 1) * 2], tcoords[(tri + 1) * 2 + 1]],
                [tcoords[(tri + 2) * 2], tcoords[(tri + 2) * 2 + 1]],
              ];
              
              for (let c = 0; c < 3; c++) {
                const vi = triIdx[c];
                outPos.push(pos[vi * 3 + 0], pos[vi * 3 + 1], pos[vi * 3 + 2]);
                outCol.push(col[vi * 4 + 0], col[vi * 4 + 1], col[vi * 4 + 2], col[vi * 4 + 3]);
                outUVs.push(uvCorners[c][0], uvCorners[c][1]);
                outIdx.push(vCounter++);
              }
            }
          }
          
          console.log(`Converted to ${outPos.length / 3} vertices`);
          
          const mesh = new BABYLON.Mesh("ply-converted", this.scene);
          
          // Apply rotation to fix coordinate system (rotate 90° around X to swap Y/Z)
          mesh.rotation.x = -Math.PI / 2; // Rotate -90 degrees around X axis
          
          const vd = new BABYLON.VertexData();
          vd.positions = Float32Array.from(outPos);
          vd.indices = Uint32Array.from(outIdx);
          vd.uvs = Float32Array.from(outUVs);
          
          vd.normals = [];
          BABYLON.VertexData.ComputeNormals(vd.positions, vd.indices, vd.normals);
          
          vd.applyToMesh(mesh);
          
          const colorBuffer = new BABYLON.Buffer(
            this.scene.getEngine(),
            Float32Array.from(outCol),
            true,
            4
          );
          mesh.setVerticesBuffer(colorBuffer.createVertexBuffer(BABYLON.VertexBuffer.ColorKind, 0, 4));
          
          const material = new BABYLON.StandardMaterial("plyMaterial", this.scene);
          material.diffuseColor = new BABYLON.Color3(1, 1, 1);
          material.backFaceCulling = false;
          mesh.material = material;
          mesh.useVertexColors = true;
          
          mesh.refreshBoundingInfo();
          mesh.computeWorldMatrix(true);
          
          const bounds = mesh.getBoundingInfo();
          console.log('Converted mesh bounds (centered):', {
            min: bounds.boundingBox.minimumWorld,
            max: bounds.boundingBox.maximumWorld,
            center: bounds.boundingBox.centerWorld
          });
          
          console.log('PLY converted successfully');
          
          resolve({
            meshes: [mesh],
            animationGroups: []
          });
          
        } catch (error) {
          console.error('Error converting PLY to GLB:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read PLY file'));
      reader.readAsArrayBuffer(file);
    });
  }

  _createPointCloud(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log('Creating point cloud visualization...');
          
          // Read header to determine format
          const headerText = new TextDecoder('utf-8').decode(uint8Array.slice(0, 8192));
          
          let offset = 0, header = "", nl = 0;
          const tempView = new DataView(arrayBuffer);
          while (true) {
            const c = tempView.getUint8(offset++);
            header += String.fromCharCode(c);
            if (header.endsWith("end_header\n")) break;
            if (++nl > 1e6) throw new Error("Bad PLY header");
          }
          
          const headerLines = header.trim().split(/\r?\n/);
          const get = (re) => (headerLines.find(l => re.test(l)) || "").match(re);
          
          const vMatch = get(/^element\s+vertex\s+(\d+)/i);
          const nVerts = vMatch ? parseInt(vMatch[1], 10) : 0;
          
          // Check if binary or ASCII
          const isBinary = headerText.includes('format binary_little_endian') || 
                          headerText.includes('format binary_big_endian');
          const isASCII = headerText.includes('format ascii');
          
          console.log(`Point cloud has ${nVerts} vertices, format: ${isBinary ? 'binary' : 'ASCII'}`);
          
          const positions = [];
          const colors = [];
          
          let minX = Infinity, minY = Infinity, minZ = Infinity;
          let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
          
          if (isASCII) {
            // ASCII format
            const textData = new TextDecoder('utf-8').decode(uint8Array);
            const dataLines = textData.split(/\r?\n/);
            
            let dataStartLine = 0;
            for (let i = 0; i < dataLines.length; i++) {
              if (dataLines[i].trim() === 'end_header') {
                dataStartLine = i + 1;
                break;
              }
            }
            
            for (let i = 0; i < nVerts; i++) {
              const line = dataLines[dataStartLine + i].trim();
              if (!line) continue;
              
              const values = line.split(/\s+/);
              const x = parseFloat(values[0]);
              const y = parseFloat(values[1]);
              const z = parseFloat(values[2]);
              
              minX = Math.min(minX, x); maxX = Math.max(maxX, x);
              minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
              
              positions.push(x, y, z);
              
              if (values.length >= 6) {
                const r = parseInt(values[3]) / 255;
                const g = parseInt(values[4]) / 255;
                const b = parseInt(values[5]) / 255;
                colors.push(r, g, b, 1.0);
              } else {
                colors.push(0.8, 0.8, 0.8, 1.0);
              }
            }
          } else {
            // Binary format - parse property structure carefully
            const view = new DataView(arrayBuffer);
            
            // Analyze properties to determine exact byte layout
            const properties = [];
            let inVertexElement = false;
            
            for (const line of headerLines) {
              if (line.trim().startsWith('element vertex')) {
                inVertexElement = true;
                continue;
              }
              if (line.trim().startsWith('element')) {
                inVertexElement = false;
              }
              if (inVertexElement && line.trim().startsWith('property')) {
                const parts = line.trim().split(/\s+/);
                const type = parts[1]; // float, uchar, etc.
                const name = parts[2]; // x, y, z, red, etc.
                properties.push({ type, name });
              }
            }
            
            console.log('Properties detected:', properties.map(p => `${p.name}(${p.type})`).join(', '));
            
            // Calculate vertex size based on actual properties
            let vertexSize = 0;
            properties.forEach(prop => {
              if (prop.type === 'float' || prop.type === 'float32') vertexSize += 4;
              else if (prop.type === 'double' || prop.type === 'float64') vertexSize += 8;
              else if (prop.type === 'uchar' || prop.type === 'uint8') vertexSize += 1;
              else if (prop.type === 'short' || prop.type === 'int16') vertexSize += 2;
              else if (prop.type === 'int' || prop.type === 'int32') vertexSize += 4;
            });
            
            console.log(`Calculated vertex size: ${vertexSize} bytes`);
            
            // Read vertices according to actual property layout
            let currentOffset = offset;
            
            for (let i = 0; i < nVerts && currentOffset + vertexSize <= view.byteLength; i++) {
              let propOffset = 0;
              let x, y, z, r = 0.8, g = 0.8, b = 0.8;
              
              for (const prop of properties) {
                let value;
                
                if (prop.type === 'float' || prop.type === 'float32') {
                  value = view.getFloat32(currentOffset + propOffset, true);
                  propOffset += 4;
                } else if (prop.type === 'double' || prop.type === 'float64') {
                  value = view.getFloat64(currentOffset + propOffset, true);
                  propOffset += 8;
                } else if (prop.type === 'uchar' || prop.type === 'uint8') {
                  value = view.getUint8(currentOffset + propOffset);
                  propOffset += 1;
                } else if (prop.type === 'short' || prop.type === 'int16') {
                  value = view.getInt16(currentOffset + propOffset, true);
                  propOffset += 2;
                } else if (prop.type === 'int' || prop.type === 'int32') {
                  value = view.getInt32(currentOffset + propOffset, true);
                  propOffset += 4;
                }
                
                // Assign to appropriate variable
                if (prop.name === 'x') x = value;
                else if (prop.name === 'y') y = value;
                else if (prop.name === 'z') z = value;
                else if (prop.name === 'red') r = value / 255;
                else if (prop.name === 'green') g = value / 255;
                else if (prop.name === 'blue') b = value / 255;
              }
              
              currentOffset += vertexSize;
              
              // Validate and store
              if (!isNaN(x) && !isNaN(y) && !isNaN(z) && 
                  isFinite(x) && isFinite(y) && isFinite(z)) {
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
                
                positions.push(x, y, z);
                colors.push(r, g, b, 1.0);
              }
            }
          }
          
          console.log(`Read ${positions.length / 3} valid vertices`);
          console.log(`Bounds: min=(${minX.toFixed(2)}, ${minY.toFixed(2)}, ${minZ.toFixed(2)}), max=(${maxX.toFixed(2)}, ${maxY.toFixed(2)}, ${maxZ.toFixed(2)})`);
          
          if (positions.length === 0 || !isFinite(minX)) {
            throw new Error('No valid vertices found in point cloud');
          }
          
          // Center the point cloud
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const centerZ = (minZ + maxZ) / 2;
          
          console.log(`Centering point cloud at: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`);
          
          const actualVertCount = positions.length / 3;
          for (let i = 0; i < actualVertCount; i++) {
            positions[i * 3 + 0] -= centerX;
            positions[i * 3 + 1] -= centerY;
            positions[i * 3 + 2] -= centerZ;
          }
          
          // Create point cloud system
          const pcs = new BABYLON.PointsCloudSystem("pointCloud", 1, this.scene);
          
          pcs.addPoints(actualVertCount, (particle, i) => {
            particle.position = new BABYLON.Vector3(
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2]
            );
            particle.color = new BABYLON.Color4(
              colors[i * 4],
              colors[i * 4 + 1],
              colors[i * 4 + 2],
              colors[i * 4 + 3]
            );
          });
          
          pcs.buildMeshAsync().then((mesh) => {
            mesh.name = "pointCloud";
            
            mesh.rotation.x = -Math.PI / 2; // Rotate -90 degrees around X axis
            
            const material = new BABYLON.StandardMaterial("pointCloudMat", this.scene);
            material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            material.disableLighting = true;
            material.pointsCloud = true;
            material.pointSize = 2;
            mesh.material = material;
            
            mesh.refreshBoundingInfo();
            mesh.computeWorldMatrix(true);
            
            console.log('Point cloud created successfully');
            
            resolve({
              meshes: [mesh],
              animationGroups: []
            });
          });
          
        } catch (error) {
          console.error('Error creating point cloud:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read PLY file'));
      reader.readAsArrayBuffer(file);
    });
  }

  _unregisterFiles() {
    if (this._registeredKeys.length) {
      for (const k of this._registeredKeys) {
        delete BABYLON.FilesInputStore.FilesToLoad[k];
      }
      this._registeredKeys = [];
    }
  }
}