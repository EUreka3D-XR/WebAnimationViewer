import { AnimationLoader } from './loader.js';
import { SimpleViewer } from './simpleViewer.js';
import { AudioViewer } from './audioViewer.js';

class App {
  constructor() {
    this.loader = null;
    this.viewer = null;

    this.zipUrlInput = document.getElementById("zipUrlInput");
    this.loadZipBtn = document.getElementById("loadZipBtn");
    this.zipLoaderControls = document.getElementById("zipLoaderControls");
    this.loadingScreen = document.getElementById("loadingScreen");
    this.viewerControls = document.getElementById("viewerControls");
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
      const source = await this.loader.loadFromUrl(fileUrl);

      // Determine which viewer to use based on presence of audio
      const hasAudio = source.audioUrl || (source.filesMap && Object.keys(source.filesMap).some(key => 
        key.toLowerCase().endsWith('.mp3') || 
        key.toLowerCase().endsWith('.wav') || 
        key.toLowerCase().endsWith('.ogg')
      ));

      if (hasAudio) {
        console.log('Audio detected - using AudioViewer');
        this.viewer = new AudioViewer();
      } else {
        console.log('No audio detected - using SimpleViewer');
        this.viewer = new SimpleViewer();
      }

      await this.viewer.initialize(source);

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
}

(async function () {
  const app = new App();
  await app.initialize();
})();