/* global BABYLON */
import { AnimationControls } from './controls.js';

export class AudioViewer {
    constructor() {
        this.engine = null;
        this.scene = null;
        this.canvas = null;
        this.controls = null;
        this._bgHex = "#667eea";
        this._transparent = false;
    }

    async initialize(source) {
        // Clear any existing content
        const canvasZone = document.getElementById("canvasZone");
        canvasZone.innerHTML = '';

        // Create canvas for custom Babylon.js scene
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'renderCanvas';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        canvasZone.appendChild(this.canvas);

        canvasZone.style.background = '#001f3f';

        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            premultipliedAlpha: false, // Important for transparency
            alpha: true
        });
        this.scene = new BABYLON.Scene(this.engine);
        
        const c = BABYLON.Color3.FromHexString(this._bgHex);
        this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, 1);
        
        this.scene.createDefaultCameraOrLight(true, true, true);
        this.scene.activeCamera.attachControl(this.canvas, true);

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => this.engine.resize());

        let modelUrl, modelFormat, audioUrl;

        if (source.mode === 'filestore') {
            // Create blob URL from primary file
            const primaryFile = source.filesMap[source.primaryFilename];
            modelUrl = URL.createObjectURL(primaryFile);
            modelFormat = source.primaryFilename.split('.').pop().toLowerCase();
            
            audioUrl = source.audioUrl || null;
            if (!audioUrl) {
                // Search for audio in filesMap
                for (const [key, file] of Object.entries(source.filesMap)) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.endsWith('.mp3') || lowerKey.endsWith('.wav') || lowerKey.endsWith('.ogg')) {
                        audioUrl = URL.createObjectURL(file);
                        console.log(`Found audio file: ${key}`);
                        break;
                    }
                }
            }
        } else {
            modelUrl = source.url;
            modelFormat = source.format;
            audioUrl = source.audioUrl || null;
        }

        console.log(`AudioViewer - Model: ${modelFormat}, Audio: ${audioUrl ? 'YES' : 'NO'}`);

        const { container, animationGroups } = await this.loadModel(modelUrl, modelFormat);

        this.centerCameraOnModel(container.meshes);

        // Setup controls for animation playback (ALWAYS show - user needs to control animation)
        this.controls = new AnimationControls(this.scene);
        this.controls.setupEventListeners();
        this.controls.setAnimations(animationGroups);
        
        if (audioUrl) {
            this.controls.setAudio(audioUrl);
            console.log("Audio viewer initialized with audio synchronization");
        } else {
            console.log("Audio viewer initialized without audio (animation only)");
        }
        
        this.controls.showControls();
    }

    // Background & lighting controls to match SimpleViewer interface
    setBackgroundColor(hex) {
        if (!this.scene) return;
        this._bgHex = hex;
        
        const c = BABYLON.Color3.FromHexString(hex);
        const alpha = this._transparent ? 0 : 1;
        this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, alpha);

        const canvasZone = document.getElementById("canvasZone");
        if (canvasZone) {
            canvasZone.style.background = hex;
        }

        if (!this._transparent && this.canvas) {
            this.canvas.style.background = hex;
        }
    }

    setTransparentBackground(on) {
        if (!this.scene || !this.canvas) return;
        this._transparent = !!on;
        
        const c = BABYLON.Color3.FromHexString(this._bgHex);
        this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, this._transparent ? 0 : 1);
        
        this.canvas.style.background = this._transparent ? "transparent" : this._bgHex;
        
        const canvasZone = document.getElementById("canvasZone");
        if (canvasZone) {
            canvasZone.style.background = this._transparent ? "transparent" : this._bgHex;
        }
        
        if (this.engine) {
            this.engine.setHardwareScalingLevel(1); // Refresh rendering
        }
    }

    setLightIntensity(v) {
        // Find lights in scene and adjust
        const lights = this.scene.lights;
        if (lights && lights.length > 0) {
            lights.forEach(light => {
                light.intensity = parseFloat(v);
            });
        }
    }

    setEnvironmentIntensity(v) {
        if (this.scene) {
            this.scene.environmentIntensity = parseFloat(v);
        }
    }

    async loadModel(modelUrl, modelFormat) {
        console.log(`Loading model format: ${modelFormat} from ${modelUrl}`);
        
        try {
            // Use SceneLoader.ImportMeshAsync with proper parameters
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",           // meshNames (empty = load all)
                "",           // rootUrl (empty because we use full URL in sceneFilename)
                modelUrl,     // sceneFilename (the full blob URL)
                this.scene,   // scene
                null,         // onProgress callback
                `.${modelFormat}` // pluginExtension - force specific loader
            );

            const meshes = result.meshes;
            const animationGroups = result.animationGroups || [];

            console.log(`Successfully loaded ${meshes.length} meshes, ${animationGroups.length} animation groups`);

            const filteredAnimationGroups = animationGroups.filter(
                group => !group.name.startsWith("Key")
            );
            
            filteredAnimationGroups.forEach(group => {
                group.stop();
                group.reset();
            });

            return { 
                container: { meshes }, 
                animationGroups: filteredAnimationGroups 
            };

        } catch (error) {
            console.error(`Error loading ${modelFormat} file:`, error);
            throw new Error(`Failed to load ${modelFormat} file: ${error.message}`);
        }
    }

    centerCameraOnModel(meshes) {
        this.scene.executeWhenReady(() => {
            if (!meshes || meshes.length === 0) {
                console.warn("No meshes to center camera on");
                return;
            }

            let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

            let hasValidBounds = false;

            meshes.forEach(mesh => {
                if (!mesh.getBoundingInfo) return;
                
                try {
                    const meshMin = mesh.getBoundingInfo().boundingBox.minimumWorld;
                    const meshMax = mesh.getBoundingInfo().boundingBox.maximumWorld;

                    min = BABYLON.Vector3.Minimize(min, meshMin);
                    max = BABYLON.Vector3.Maximize(max, meshMax);
                    hasValidBounds = true;
                } catch (e) {
                    console.warn("Could not get bounds for mesh:", mesh.name);
                }
            });

            if (!hasValidBounds) {
                console.warn("No valid bounding boxes found");
                return;
            }

            const center = min.add(max).scale(0.5);
            const size = max.subtract(min);
            const maxDim = Math.max(size.x, size.y, size.z);
            const radius = maxDim * 1.5;

            const camera = this.scene.activeCamera;
            if (camera && camera instanceof BABYLON.ArcRotateCamera) {
                camera.target = center;
                camera.radius = radius;
                camera.alpha = Math.PI / 2;  // Look from front
                camera.beta = Math.PI / 2.5;  // Look slightly up
                console.log(`Camera centered on model (size: ${maxDim.toFixed(2)})`);

                camera.lowerAlphaLimit = null;
                camera.upperAlphaLimit = null;
                camera.lowerBetaLimit = null;
                camera.upperBetaLimit = null;
            }
        });
    }
}