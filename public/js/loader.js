/* global JSZip */

export class AnimationLoader {
  constructor() {
    this.proxyUrl = "http://localhost:3000/proxy?url=";
    this.supportedModelExtensions = /\.(glb|gltf|obj|stl|splat|ply)$/i;
    this.supportedAudioExtensions = /\.mp3$/i;
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
      return await this._loadDirectModel(blob, format, fileUrl);
    }
  }

  async _loadDirectModel(blob, format, fileUrl) {
    const ext = format && format !== 'unknown' ? format : (this._extFromUrl(fileUrl) || 'glb');
    const fname = `model.${ext}`;
    const file = new File([blob], fname, { type: blob.type || 'application/octet-stream' });

    return {
      mode: 'filestore',
      primaryFilename: fname,
      filesMap: { [fname]: file },
      hasAudio: false
    };
  }

  async _loadZipFile(blob) {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const filesMap = {};
    let primary = null;
    let audioUrl = null;
    let hasAudio = false;

    const entries = Object.values(zip.files).filter(e => !e.dir);

    for (const entry of entries) {
      const lower = entry.name.toLowerCase();

      if (!hasAudio && this.supportedAudioExtensions.test(lower)) {
        const audioBlob = await entry.async("blob");
        audioUrl = URL.createObjectURL(new Blob([audioBlob], { type: "audio/mpeg" }));
        hasAudio = true;
        continue;
      }

      if (!primary && this.supportedModelExtensions.test(lower)) {
        primary = entry.name;
      }

      const fileBlob = await entry.async("blob");

      filesMap[entry.name] = new File([fileBlob], entry.name.split('/').pop(), { type: fileBlob.type || 'application/octet-stream' });
    }

    if (!primary) {
      throw new Error("Model file not found in ZIP.");
    }

    return {
      mode: 'filestore',
      primaryFilename: primary,   // can include subfolders
      filesMap,                   // includes model + deps (mtl/bin/textures)
      audioUrl,
      hasAudio
    };
  }
}