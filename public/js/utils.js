/* global BABYLON */

/**
 * Common utility functions for 3D viewers
 * Shared between SimpleViewer and AudioViewer
 */

// ============================================================================
// CAMERA UTILITIES
// ============================================================================

/**
 * Calculate bounding box for a set of meshes
 * @param {Array} meshes
 * @returns {Object}
 */
export function calculateBoundingBox(meshes) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    meshes.forEach(mesh => {
        if (!mesh || !mesh.getBoundingInfo) return;
        
        const bounds = mesh.getBoundingInfo().boundingBox;
        const min = bounds.minimumWorld;
        const max = bounds.maximumWorld;

        minX = Math.min(minX, min.x);
        minY = Math.min(minY, min.y);
        minZ = Math.min(minZ, min.z);
        maxX = Math.max(maxX, max.x);
        maxY = Math.max(maxY, max.y);
        maxZ = Math.max(maxZ, max.z);
    });

    const center = new BABYLON.Vector3(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
    );

    const size = new BABYLON.Vector3(
        maxX - minX,
        maxY - minY,
        maxZ - minZ
    );

    return {
        min: new BABYLON.Vector3(minX, minY, minZ),
        max: new BABYLON.Vector3(maxX, maxY, maxZ),
        center,
        size
    };
}

/**
 * Frame camera to view animated model (centered, allows rotation)
 * @param {BABYLON.ArcRotateCamera} camera
 * @param {BABYLON.Scene} scene
 * @param {Array} meshes
 * @param {Object} options - Optional configuration
 * @param {number} options.radiusMultiplier - Multiplier for camera distance (default: 1.5)
 * @param {number} options.alpha - Camera horizontal angle in radians (default: Math.PI / 2)
 * @param {number} options.beta - Camera vertical angle in radians (default: Math.PI / 2.5)
 */
export function centerCameraOnModel(camera, scene, meshes, options = {}) {
    const {
        radiusMultiplier = 1.5,
        alpha = Math.PI / 2,
        beta = Math.PI / 2.5
    } = options;

    if (!scene || !camera || !meshes || meshes.length === 0) return;

    scene.executeWhenReady(() => {
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
        const radius = maxDim * radiusMultiplier;

        if (camera instanceof BABYLON.ArcRotateCamera) {
            camera.target = center;
            camera.radius = radius;
            camera.alpha = alpha;
            camera.beta = beta;
            
            console.log(`Camera centered on model (size: ${maxDim.toFixed(2)})`);

            camera.lowerAlphaLimit = null;
            camera.upperAlphaLimit = null;
            camera.lowerBetaLimit = null;
            camera.upperBetaLimit = null;
        }
    });
}

/**
 * Frame camera for static model (fit entire model in view)
 * @param {BABYLON.ArcRotateCamera} camera
 * @param {Array} meshes
 * @param {Object} options - Optional configuration
 * @param {number} options.radiusMultiplier - Multiplier for camera distance (default: 1.5)
 * @param {number} options.alpha - Camera horizontal angle in radians (default: Math.PI / 2)
 * @param {number} options.beta - Camera vertical angle in radians (default: Math.PI / 2.5)
 * @param {number} options.lowerRadiusLimit - Minimum zoom distance (default: 0.01)
 * @param {number} options.upperRadiusMultiplier - Multiplier for max zoom based on model size (default: 100)
 * @param {number} options.panningSensibility - Panning sensitivity (default: 1000)
 * @param {number} options.angularSensibilityX - Horizontal rotation sensitivity (default: 1000)
 * @param {number} options.angularSensibilityY - Vertical rotation sensitivity (default: 1000)
 */
export function frameCameraForStaticModel(camera, meshes, options = {}) {
    const {
        radiusMultiplier = 1.5,
        alpha = Math.PI / 2,
        beta = Math.PI / 2.5,
        lowerRadiusLimit = 0.01,
        upperRadiusMultiplier = 100,
        panningSensibility = 1000,
        angularSensibilityX = 1000,
        angularSensibilityY = 1000
    } = options;

    if (!camera || !meshes || meshes.length === 0) return;

    // Refresh bounding info for all meshes
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
            console.log(`Mesh "${mesh.name}" bounds: min=${bb.minimumWorld}, max=${bb.maximumWorld}`);
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
    const radius = maxDim * radiusMultiplier;

    if (camera instanceof BABYLON.ArcRotateCamera) {
        camera.target = center;
        camera.radius = radius;
        camera.alpha = alpha;
        camera.beta = beta;

        camera.lowerAlphaLimit = null;
        camera.upperAlphaLimit = null;
        camera.lowerBetaLimit = null;
        camera.upperBetaLimit = null;
        
        const nearPlane = Math.max(0.01, maxDim * 0.001);
        const farPlane = Math.max(100000, radius * 1000);
        
        camera.lowerRadiusLimit = lowerRadiusLimit;
        camera.upperRadiusLimit = maxDim * upperRadiusMultiplier;
        camera.minZ = nearPlane;
        camera.maxZ = farPlane;
        
        camera.panningSensibility = panningSensibility;
        camera.angularSensibilityX = angularSensibilityX;
        camera.angularSensibilityY = angularSensibilityY;
        
        console.log(`Camera framed: center=(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}), radius=${radius.toFixed(2)}, size=${maxDim.toFixed(2)}`);
        console.log(`Near plane: ${nearPlane.toFixed(4)}, far plane: ${farPlane.toFixed(2)}`);
    }
}

/**
 * Setup camera clipping planes and zoom limits
 * @param {BABYLON.Camera} camera
 * @param {Object} options 
 */
export function setupCameraLimits(camera, options = {}) {
    const {
        minZ = 0.01,
        maxZ = 2000,
        lowerRadiusLimit = 0.01,
        upperRadiusLimit = 800
    } = options;

    if (camera) {
        camera.minZ = minZ;
        camera.maxZ = maxZ;
        
        if (camera instanceof BABYLON.ArcRotateCamera) {
            camera.lowerRadiusLimit = lowerRadiusLimit;
            camera.upperRadiusLimit = upperRadiusLimit;
        }
    }
}

// ============================================================================
// SCENE UTILITIES
// ============================================================================

/**
 * Set scene background color
 * @param {BABYLON.Scene} scene
 * @param {HTMLCanvasElement} canvas
 * @param {string} hex
 * @param {boolean} transparent
 */
export function setBackgroundColor(scene, canvas, hex, transparent = false) {
    if (!scene) return;
    
    const c = BABYLON.Color3.FromHexString(hex);
    const alpha = transparent ? 0 : 1;
    scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, alpha);

    const canvasZone = document.getElementById("canvasZone");
    if (canvasZone) {
        canvasZone.style.background = transparent ? "transparent" : hex;
    }

    if (!transparent && canvas) {
        canvas.style.background = hex;
    }

    const envHelper = scene._environmentHelper || scene.environmentHelper;
    if (envHelper && envHelper.setMainColor) {
        envHelper.setMainColor(c);
    }
}

/**
 * Set scene background transparency
 * @param {BABYLON.Scene} scene
 * @param {HTMLCanvasElement} canvas
 * @param {string} bgHex
 * @param {boolean} transparent
 */
export function setTransparentBackground(scene, canvas, bgHex, transparent) {
    if (!scene || !canvas) return;
    
    const c = BABYLON.Color3.FromHexString(bgHex);
    scene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, transparent ? 0 : 1);
    
    canvas.style.background = transparent ? "transparent" : bgHex;
    
    const canvasZone = document.getElementById("canvasZone");
    if (canvasZone) {
        canvasZone.style.background = transparent ? "transparent" : bgHex;
    }
    
    if (scene.getEngine()) {
        scene.getEngine().setHardwareScalingLevel(1);
    }
}

/**
 * Set lighting intensity for all lights in scene
 * @param {BABYLON.Scene} scene
 * @param {number} intensity
 */
export function setLightIntensity(scene, intensity) {
    if (!scene) return;
    
    const lights = scene.lights;
    if (lights && lights.length > 0) {
        lights.forEach(light => {
            light.intensity = Math.max(0, Number(intensity) || 0);
        });
    }
}

/**
 * Set environment texture intensity
 * @param {BABYLON.Scene} scene
 * @param {number} intensity
 */
export function setEnvironmentIntensity(scene, intensity) {
    if (!scene) return;
    scene.environmentIntensity = Math.max(0, Number(intensity) || 0);
}

// ============================================================================
// MESH UTILITIES
// ============================================================================

/**
 * Apply close-zoom fix to prevent meshes from disappearing
 * @param {Array} meshes
 */
export function applyCloseZoomFix(meshes) {
    if (!meshes) return;
    
    meshes.forEach(mesh => {
        if (mesh) {
            mesh.alwaysSelectAsActiveMesh = true;
        }
    });
    
    console.log(`Applied close-zoom fix to ${meshes.length} meshes`);
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Convert hex color to Babylon Color4
 * @param {string} hex
 * @param {number} alpha
 * @returns {BABYLON.Color4}
 */
export function hexToColor4(hex, alpha = 1) {
    const c = BABYLON.Color3.FromHexString(hex);
    return new BABYLON.Color4(c.r, c.g, c.b, alpha);
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Get file extension from filename
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get base name without extension
 * @param {string} filename
 * @returns {string}
 */
export function getBaseName(filename) {
    if (!filename) return '';
    return filename.replace(/\.[^.]+$/, '');
}