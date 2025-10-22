import { AnimationLoader } from './loader.js';
import { SimpleViewer } from './simpleViewer.js';
import { AudioViewer } from './audioViewer.js';

class App {
  constructor() {
    this.loader = null;
    this.viewer = null;
    this.currentSource = null;
    this.currentSceneDescription = null;

    this.zipUrlInput = document.getElementById("zipUrlInput");
    this.loadZipBtn = document.getElementById("loadZipBtn");
    this.zipLoaderControls = document.getElementById("zipLoaderControls");
    this.loadingScreen = document.getElementById("loadingScreen");
    this.viewerControls = document.getElementById("viewerControls");
    this.sceneSelect = document.getElementById("sceneSelect");
    this.infoBtn = document.getElementById("infoBtn");
  }

  async initialize() {
    this.loader = new AnimationLoader();
    this._setupManualLoad();
    await this._checkAutoLoad();
  }

  _setupManualLoad() {
    this.loadZipBtn.addEventListener("click", async () => {
      const fileUrl = this.zipUrlInput.value.trim();
      if (!fileUrl) {
        alert("Please enter a valid file URL.");
        return;
      }
      await this._loadContent(fileUrl);
    });
  }

  async _checkAutoLoad() {
    const fileId = this.loader.getIdFromPath();
    if (fileId) {
      this.zipLoaderControls.style.display = 'none';
      const fileUrl = this.loader.constructDownloadUrl(fileId);
      await this._loadContent(fileUrl);
    } else {
      if (this.loadingScreen) {
        this.loadingScreen.style.display = 'none';
      }
    }
  }

  async _loadContent(fileUrl) {
    try {
      this._updateLoadingMessage('Loading content...');
      const source = await this.loader.loadFromUrl(fileUrl);
      this.currentSource = source;

      console.log(`Load Case ${source.loadCase}: ${source.description}`);
      
      switch (source.loadCase) {
        case 1:
        case 2:
          // Simple model viewing (Cases 1 & 2)
          await this._loadSimpleModel(source);
          break;
          
        case 3:
        case 4:
          // Model with audio/panorama (Cases 3 & 4)
          await this._loadModelWithAudio(source);
          break;
          
        case 5:
          // Multiple scenes (Case 5)
          await this._loadMultipleScenes(source);
          break;
          
        default:
          throw new Error(`Unknown load case: ${source.loadCase}`);
      }

      this._setupViewerControls();
      
      if (this.loadingScreen) {
        this.loadingScreen.style.display = 'none';
      }

    } catch (err) {
      console.error("Error loading content:", err);
      
      if (this.loadingScreen) {
        this.loadingScreen.style.display = 'none';
      }
      
      alert("Failed to load content: " + err.message);
    }
  }

  /**
   * Load simple model (Cases 1 & 2)
   */
  async _loadSimpleModel(source) {
    this._updateLoadingMessage('Initializing 3D viewer...');
    console.log('Using SimpleViewer for model without audio');
    
    this.viewer = new SimpleViewer();
    await this.viewer.initialize(source);
    
    // Check if model has multiple animations (Case 6)
    if (this.viewer.scene && this.viewer.scene.animationGroups && 
        this.viewer.scene.animationGroups.length > 1) {
      this._showAnimationSelector(this.viewer.scene.animationGroups);
    }
  }

  /**
   * Load model with audio/panorama (Cases 3 & 4)
   */
  async _loadModelWithAudio(source) {
    this._updateLoadingMessage('Initializing 3D viewer...');
    console.log('✅ Using AudioViewer for model with audio/panorama');
    
    // Show manifest info if available
    if (source.manifest) {
      console.log(`📦 Package: ${source.manifest.name}${source.manifest.version ? ' v' + source.manifest.version : ''}`);
      if (source.manifest.sceneTitle) {
        console.log(`🎬 Scene: ${source.manifest.sceneTitle}`);
      }
    }
    
    this.viewer = new AudioViewer();
    await this.viewer.initialize(source);
    
    // Show description if available (Case 4)
    if (source.hasDescription && source.sceneDescription) {
      this.currentSceneDescription = source.sceneDescription;
      const title = source.manifest?.sceneTitle || 'Scene Information';
      this._setupInfoButton(this.currentSceneDescription, title);
    }
    
    // Check if model has multiple animations (Case 6)
    if (this.viewer.scene && this.viewer.scene.animationGroups && 
        this.viewer.scene.animationGroups.length > 1) {
      this._showAnimationSelector(this.viewer.scene.animationGroups);
    }
  }

  /**
   * Load multiple scenes (Case 5)
   */
  async _loadMultipleScenes(source) {
    if (!source.scenes || source.scenes.length === 0) {
      throw new Error("No scenes found in multi-scene package");
    }
    
    console.log(`✅ Loading multi-scene package with ${source.scenes.length} scenes`);
    
    // Show manifest info if available
    if (source.manifest) {
      console.log(`📦 Package: ${source.manifest.name}${source.manifest.version ? ' v' + source.manifest.version : ''}`);
    }
    
    // Populate scene selector
    this._populateSceneSelector(source.scenes);
    
    // Load scene at default index
    const startIndex = source.currentSceneIndex || 0;
    await this._loadScene(source.scenes[startIndex], startIndex);
  }

  /**
   * Load a specific scene from multi-scene package
   */
  async _loadScene(scene, sceneIndex) {
    // Show loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'flex';
    }
    this._updateLoadingMessage(`Initializing scene: ${scene.name}...`);
    
    // Create source object compatible with viewers
    const sceneSource = {
      mode: 'filestore',
      primaryFilename: scene.primaryFilename,
      filesMap: scene.filesMap,
      audioUrl: scene.audioUrl,
      panoramaUrl: scene.panoramaUrl,
      hasAudio: scene.hasAudio,
      hasPanorama: scene.hasPanorama
    };
    
    // Dispose existing viewer if any
    if (this.viewer) {
      // Dispose controls (audio, timeline, etc.)
      if (this.viewer.controls && typeof this.viewer.controls.dispose === 'function') {
        this.viewer.controls.dispose();
      }
      
      // Dispose engine
      if (this.viewer.engine) {
        this.viewer.engine.dispose();
      }
      
      this.viewer = null;
    }
    
    // Create appropriate viewer
    if (scene.hasAudio) {
      this.viewer = new AudioViewer();
    } else {
      this.viewer = new SimpleViewer();
    }
    
    await this.viewer.initialize(sceneSource);
    
    // Hide loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'none';
    }
    
    // Setup description button if available
    if (scene.hasDescription && scene.sceneDescription) {
      this.currentSceneDescription = scene.sceneDescription;
      this._setupInfoButton(scene.sceneDescription, scene.name);
    } else {
      // Hide info button if no description
      if (this.infoBtn) {
        this.infoBtn.style.display = 'none';
      }
      this.currentSceneDescription = null;
    }
    
    // Update current scene index
    if (this.currentSource) {
      this.currentSource.currentSceneIndex = sceneIndex;
    }
    
    console.log(`✅ Scene "${scene.name}" loaded successfully`);
  }

  /**
   * Populate scene selector dropdown (Case 5)
   */
  _populateSceneSelector(scenes) {
    if (!this.sceneSelect || !scenes || scenes.length === 0) return;
    
    // Clear existing options
    this.sceneSelect.innerHTML = '';
    
    // Add scene options
    scenes.forEach((scene, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = scene.name;
      this.sceneSelect.appendChild(option);
    });
    
    // Show the scene selector
    this.sceneSelect.style.display = 'inline-block';
    
    // Add change listener
    this.sceneSelect.addEventListener('change', async (e) => {
      const sceneIndex = parseInt(e.target.value);
      if (this.currentSource && this.currentSource.scenes) {
        await this._loadScene(this.currentSource.scenes[sceneIndex], sceneIndex);
      }
    });
    
    console.log(`✅ Scene selector populated with ${scenes.length} scenes`);
  }

  /**
   * Setup info button for scene descriptions
   */
  _setupInfoButton(description, title = 'Scene Information') {
    if (!this.infoBtn) return;
    
    // Store description for later
    this.currentSceneDescription = description;
    
    // Show the info button
    this.infoBtn.style.display = 'inline-block';
    
    // Remove existing listener if any
    const newInfoBtn = this.infoBtn.cloneNode(true);
    this.infoBtn.parentNode.replaceChild(newInfoBtn, this.infoBtn);
    this.infoBtn = newInfoBtn;
    
    // Add click listener
    this.infoBtn.addEventListener('click', () => {
      this._showSceneDescription(description, title);
    });
    
    console.log('✅ Info button activated');
  }

  /**
   * Show animation selector for models with multiple animations (Case 6)
   */
  _showAnimationSelector(animationGroups) {
    const select = document.getElementById('animationSelect');
    if (!select) return;
    
    console.log(`✅ Model has ${animationGroups.length} animations - showing selector`);
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add options for each animation
    animationGroups.forEach((group, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = group.name || `Animation ${index + 1}`;
      select.appendChild(option);
    });
    
    // Show the controls container
    const controlsContainer = document.getElementById('controls');
    if (controlsContainer) {
      controlsContainer.style.display = 'block';
    }
  }

  /**
   * Show package info (Case 5 with manifest)
   */
  _showPackageInfo(manifest) {
    // Display package info in console for now
    // Could add a UI element in the future
    console.log('📦 Animation Package Information:');
    console.log(`   Name: ${manifest.name}`);
    if (manifest.version) console.log(`   Version: ${manifest.version}`);
    if (manifest.schemaVersion) console.log(`   Schema: ${manifest.schemaVersion}`);
  }

  /**
   * Show scene description (Case 4 & 5)
   */
  _showSceneDescription(description, sceneName = null) {
    // Remove existing description if any
    const existing = document.getElementById('sceneDescription');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'sceneDescription';
    container.className = 'scene-description';
    container.innerHTML = `
      <div class="description-header">
        <h3>${sceneName || 'Scene Information'}</h3>
        <button id="closeDescription">×</button>
      </div>
      <div class="description-content">
        ${this._formatDescription(description)}
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add close button listener
    document.getElementById('closeDescription').addEventListener('click', () => {
      container.remove();
    });
    
    console.log('✅ Scene description displayed');
  }

  /**
   * Format description text (preserve line breaks, etc.)
   */
  _formatDescription(text) {
    return text
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
      .join('');
  }

  /**
   * Update loading screen message
   */
  _updateLoadingMessage(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      const messageEl = loadingScreen.querySelector('p');
      if (messageEl) {
        messageEl.textContent = message;
      }
      loadingScreen.style.display = 'flex';
    }
  }

  /**
   * Setup viewer controls (background, lighting, etc.)
   */
  _setupViewerControls() {
    if (this.viewerControls) {
      this.viewerControls.style.display = 'block';
    }

    const colorInput = document.getElementById("bgColor");
    const transparentChk = document.getElementById("bgTransparent");
    const lightSlider = document.getElementById("lightIntensity");
    const envSlider = document.getElementById("envIntensity");
    const lightValue = document.getElementById("lightValue");
    const envValue = document.getElementById("envValue");

    if (colorInput) {
      colorInput.addEventListener("input", (e) => this.viewer.setBackgroundColor(e.target.value));
    }
    if (transparentChk) {
      transparentChk.addEventListener("change", (e) => this.viewer.setTransparentBackground(e.target.checked));
    }
    if (lightSlider) {
      lightSlider.addEventListener("input", (e) => {
        this.viewer.setLightIntensity(e.target.value);
        if (lightValue) lightValue.textContent = parseFloat(e.target.value).toFixed(1);
      });
    }
    if (envSlider) {
      envSlider.addEventListener("input", (e) => {
        this.viewer.setEnvironmentIntensity(e.target.value);
        if (envValue) envValue.textContent = parseFloat(e.target.value).toFixed(1);
      });
    }
  }
}

(async function () {
  const app = new App();
  await app.initialize();
})();