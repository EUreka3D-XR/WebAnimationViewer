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
        this.photoDome = null;
    }

    async initialize(source) {
        const canvasZone = document.getElementById("canvasZone");
        canvasZone.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'renderCanvas';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        canvasZone.appendChild(this.canvas);

        canvasZone.style.background = '#001f3f';

        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            premultipliedAlpha: false,
            alpha: true
        });
        this.scene = new BABYLON.Scene(this.engine);
        
        const c = BABYLON.Color3.FromHexString(this._bgHex);
        this.scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, 1);
        
        this.scene.createDefaultCameraOrLight(true, true, false);
        
        this._envHelper = this.scene.createDefaultEnvironment({
            createGround: false,
            createSkybox: false
        });
        
        this.scene.activeCamera.attachControl(this.canvas, true);

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => this.engine.resize());

        let modelUrl, modelFormat, audioUrl, panoramaUrl;

        if (source.mode === 'filestore') {
            const primaryFile = source.filesMap[source.primaryFilename];
            modelUrl = URL.createObjectURL(primaryFile);
            modelFormat = source.primaryFilename.split('.').pop().toLowerCase();
            
            audioUrl = source.audioUrl || null;
            panoramaUrl = source.panoramaUrl || null;
            
            if (!audioUrl) {
                for (const [key, file] of Object.entries(source.filesMap)) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.endsWith('.mp3') || lowerKey.endsWith('.wav') || lowerKey.endsWith('.ogg')) {
                        audioUrl = URL.createObjectURL(file);
                        console.log(`Found audio file: ${key}`);
                        break;
                    }
                }
            }
            
            if (!panoramaUrl) {
                for (const [key, file] of Object.entries(source.filesMap)) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('360') || lowerKey.includes('panorama') || lowerKey.includes('equirectangular')) {
                        panoramaUrl = URL.createObjectURL(file);
                        console.log(`Found 360° image: ${key}`);
                        break;
                    }
                }
            }
        } else {
            modelUrl = source.url;
            modelFormat = source.format;
            audioUrl = source.audioUrl || null;
            panoramaUrl = source.panoramaUrl || null;
        }

        console.log(`AudioViewer - Model: ${modelFormat}, Audio: ${audioUrl ? 'YES' : 'NO'}, Panorama: ${panoramaUrl ? 'YES' : 'NO'}`);

        const { container, animationGroups } = await this.loadModel(modelUrl, modelFormat);

        if (animationGroups.length > 0 && panoramaUrl) {
            this.create360Background(panoramaUrl);
        }

        if (animationGroups.length > 0) {
            this.centerCameraOnModel(container.meshes);
        } else {
            this.frameCameraForStaticModel(container.meshes);
        }

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

    create360Background(imageUrl) {
        try {
            if (this.photoDome) {
                this.photoDome.dispose();
            }

            this.photoDome = new BABYLON.PhotoDome(
                "photoDome",
                imageUrl,
                {
                    resolution: 128,
                    size: 1000,
                    useDirectMapping: false
                },
                this.scene
            );

            // Make PhotoDome a pure backdrop - no lighting interactions
            const domeMesh = this.photoDome.mesh;
            const mat = domeMesh.material;
            
            // Make it pure backdrop - unlit
            mat.disableLighting = true;
            if ("unlit" in mat) mat.unlit = true;
            mat.alphaMode = BABYLON.Engine.ALPHA_DISABLE;
            
            // Render first, behind everything
            domeMesh.renderingGroupId = 0;
            domeMesh.isPickable = false;
            domeMesh.alwaysSelectAsActiveMesh = false;

            this._setupPhotoDomeRotation();
            this._setupPhotoDomeZoom();

            console.log("360° background created as pure backdrop");
        } catch (error) {
            console.error("Failed to create 360° background:", error);
        }
    }

    _setupPhotoDomeRotation() {
        if (!this.photoDome) return;

        let isRotating = false;
        let lastX = 0;
        let lastY = 0;

        this.canvas.addEventListener('pointerdown', (evt) => {
            if (evt.altKey && evt.button === 0) {
                isRotating = true;
                lastX = evt.clientX;
                lastY = evt.clientY;
                evt.preventDefault();
            }
        });

        this.canvas.addEventListener('pointermove', (evt) => {
            if (isRotating) {
                const deltaX = evt.clientX - lastX;
                const deltaY = evt.clientY - lastY;

                this.photoDome.mesh.rotation.y += deltaX * 0.005;
                this.photoDome.mesh.rotation.x += deltaY * 0.005;

                lastX = evt.clientX;
                lastY = evt.clientY;
                evt.preventDefault();
            }
        });

        this.canvas.addEventListener('pointerup', (evt) => {
            if (evt.button === 0) {
                isRotating = false;
            }
        });

        console.log("PhotoDome rotation enabled: Alt+Left-drag to rotate environment");
    }

    _setupPhotoDomeZoom() {
        if (!this.photoDome) {
            console.error("Cannot setup PhotoDome zoom: PhotoDome not initialized");
            return;
        }

        const camera = this.scene.activeCamera;
        if (!camera) {
            console.error("Cannot setup PhotoDome zoom: No active camera");
            return;
        }

        let photoDomeScale = 1.0;
        const minScale = 0.2;
        const maxScale = 5.0;

        const wheelHandler = (evt) => {
            if (evt.shiftKey) {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();
                
                const prevPrecision = camera.wheelPrecision;
                camera.wheelPrecision = 0;
                
                const delta = evt.deltaY > 0 ? 0.05 : -0.05;
                
                const newScale = photoDomeScale + delta;
                photoDomeScale = Math.max(minScale, Math.min(maxScale, newScale));
                
                this.photoDome.mesh.scaling.x = photoDomeScale;
                this.photoDome.mesh.scaling.y = photoDomeScale;
                this.photoDome.mesh.scaling.z = photoDomeScale;
                
                console.log(`🌍 PhotoDome scale: ${photoDomeScale.toFixed(2)}x (Shift+Wheel)`);
                
                setTimeout(() => {
                    camera.wheelPrecision = prevPrecision;
                }, 50);
                
                return false;
            }
        };

        this.canvas.addEventListener('wheel', wheelHandler, { passive: false, capture: true });

        console.log("PhotoDome zoom enabled: Hold SHIFT + Mouse Wheel to zoom environment independently");
    }

    switch360Background(newImageUrl) {
        if (!this.photoDome) {
            console.warn("No PhotoDome exists to switch");
            return;
        }

        // Create fade out animation
        const fadeOutAnimation = new BABYLON.Animation(
            "fadeOut",
            "mesh.material.alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        fadeOutAnimation.setKeys([
            { frame: 0, value: 1 },
            { frame: 60, value: 0 }
        ]);

        const anim = this.scene.beginDirectAnimation(
            this.photoDome,
            [fadeOutAnimation],
            0,
            60,
            false
        );

        anim.onAnimationEnd = () => {
            const oldDome = this.photoDome;
            
            this.photoDome = new BABYLON.PhotoDome(
                "photoDome",
                newImageUrl,
                {
                    resolution: 64,
                    size: 1000,
                    useDirectMapping: false
                },
                this.scene
            );
            this.photoDome.mesh.material.alpha = 0;

            oldDome.dispose();

            const fadeInAnimation = new BABYLON.Animation(
                "fadeIn",
                "mesh.material.alpha",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            fadeInAnimation.setKeys([
                { frame: 0, value: 0 },
                { frame: 60, value: 1 }
            ]);

            this.scene.beginDirectAnimation(
                this.photoDome,
                [fadeInAnimation],
                0,
                60,
                false
            );
        };
    }

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
            this.engine.setHardwareScalingLevel(1);
        }
    }

    setLightIntensity(v) {
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
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "",
                modelUrl,
                this.scene,
                null,
                `.${modelFormat}`
            );

            const meshes = result.meshes;
            const animationGroups = result.animationGroups || [];

            console.log(`Successfully loaded ${meshes.length} meshes, ${animationGroups.length} animation groups`);

            // Ensure meshes render properly at all distances
            meshes.forEach(mesh => {
                if (mesh) {
                    // Disable frustum culling so mesh always renders even when camera is very close
                    mesh.alwaysSelectAsActiveMesh = true;
                }
            });

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
                    console.warn("Could not get bounds for mesh:", mesh.name, e);
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
                camera.alpha = Math.PI / 2;
                camera.beta = Math.PI / 2.5;
                console.log(`Camera centered on model (size: ${maxDim.toFixed(2)})`);

                camera.lowerAlphaLimit = null;
                camera.upperAlphaLimit = null;
                camera.lowerBetaLimit = null;
                camera.upperBetaLimit = null;
                
                camera.lowerRadiusLimit = 0.01;  // Allow VERY close zoom
                camera.upperRadiusLimit = 800;
                
                camera.minZ = 0.01;
                camera.maxZ = 2000;
                
                camera.panningSensibility = 50;
                camera.wheelPrecision = 5;
                
                camera.panningAxis = new BABYLON.Vector3(1, 1, 1);
                camera.panningDistanceLimit = null;
                camera.panningOriginTarget = BABYLON.Vector3.Zero();
                
                camera.angularSensibilityX = 1000;
                camera.angularSensibilityY = 1000;
                
                console.log("Camera controls: Left-drag = rotate, Ctrl+Left-drag = pan, Wheel = zoom model, Alt+Left-drag = rotate environment, Shift+Wheel = zoom environment");
            }
        });
    }

    frameCameraForStaticModel(meshes) {
        if (!meshes || meshes.length === 0) return;

        meshes.forEach(mesh => {
            if (mesh.refreshBoundingInfo) {
                mesh.refreshBoundingInfo();
                mesh.computeWorldMatrix(true);
            }
        });

        let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
        let hasValidBounds = false;

        meshes.forEach(mesh => {
            if (!mesh.getBoundingInfo) return;
            const vertCount = mesh.getTotalVertices ? mesh.getTotalVertices() : 0;
            if (vertCount === 0) {
                console.log(`Skipping mesh "${mesh.name}" - no vertices`);
                return;
            }
            
            try {
                const bb = mesh.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
                hasValidBounds = true;
            } catch (e) {
                console.warn(`Error getting bounds for mesh "${mesh.name}":`, e);
            }
        });

        if (!hasValidBounds) {
            console.warn("No valid bounding boxes found for camera framing");
            return;
        }

        const center = BABYLON.Vector3.Center(min, max);
        const size = max.subtract(min);
        const maxDim = Math.max(size.x, size.y, size.z);
        const radius = maxDim * 1.5;

        const camera = this.scene.activeCamera;
        if (camera && camera instanceof BABYLON.ArcRotateCamera) {
            camera.target = center;
            camera.radius = radius;
            camera.alpha = Math.PI / 2;
            camera.beta = Math.PI / 2.5;

            camera.lowerAlphaLimit = null;
            camera.upperAlphaLimit = null;
            camera.lowerBetaLimit = null;
            camera.upperBetaLimit = null;
            
            const nearPlane = Math.max(0.01, maxDim * 0.001);
            const farPlane = Math.max(100000, radius * 1000);
            
            camera.lowerRadiusLimit = 0.01;  // Allow VERY close zoom
            camera.upperRadiusLimit = maxDim * 100;
            camera.minZ = nearPlane;
            camera.maxZ = farPlane;
            
            camera.panningSensibility = 1000;
            camera.angularSensibilityX = 1000;
            camera.angularSensibilityY = 1000;
            
            console.log(`Static model framed: center=(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}), radius=${radius.toFixed(2)}, size=${maxDim.toFixed(2)}`);
        }
    }
}