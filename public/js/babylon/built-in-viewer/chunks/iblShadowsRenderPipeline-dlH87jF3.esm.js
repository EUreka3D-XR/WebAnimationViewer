import { w as RenderTargetTexture, C as Constants, a as PostProcess, O as Observable, o as Matrix, x as Vector4, L as Logger, n as EffectRenderer, f as EffectWrapper, T as Texture, h as Color4, g as Engine, V as Vector3, y as MaterialPluginBase, z as PBRBaseMaterial, A as MaterialDefines, _ as __decorate, s as serialize, D as expandToProperty, e as RegisterClass, E as EngineStore, Q as Quaternion } from './index-PgAdAgf8.esm.js';
import { ShaderMaterial } from './shaderMaterial-1MDPXouT.esm.js';
import { M as MultiRenderTarget, G as GeometryBufferRenderer } from './geometryBufferRenderer-Cbq89n5o.esm.js';
import { P as ProceduralTexture } from './iblCdfGenerator-MM_ZMInZ.esm.js';
import { P as PostProcessRenderPipeline, a as PostProcessRenderEffect } from './postProcessRenderEffect-BdKhAR29.esm.js';
import { R as RawTexture } from './rawTexture-C1LxPWXb.esm.js';
import { OpenPBRMaterial } from './openPbrMaterial-CC89Te4d.esm.js';
import { S as StandardMaterial } from './standardMaterial-BiA_FIld.esm.js';
import './geometryBufferRendererSceneComponent-nsN5bokt.esm.js';
import './iblCdfGeneratorSceneComponent-D7XLVEop.esm.js';
import './engine.multiRender-BaQgfyzv.esm.js';
import './bumpFragment-CTn3Oogh.esm.js';
import './helperFunctions-BwqynSvG.esm.js';
import './sceneUboDeclaration-BrCYfMie.esm.js';
import './bumpVertex-CWCWqH1E.esm.js';

/**
 * Voxel-based shadow rendering for IBL's.
 * This should not be instanciated directly, as it is part of a scene component
 * @internal
 * @see https://playground.babylonjs.com/#8R5SSE#222
 */
class _IblShadowsVoxelRenderer {
    /**
     * Return the voxel grid texture.
     * @returns The voxel grid texture.
     */
    getVoxelGrid() {
        if (this._triPlanarVoxelization) {
            return this._voxelGridRT;
        }
        else {
            return this._voxelGridZaxis;
        }
    }
    /**
     * The debug pass post process
     * @returns The debug pass post process
     */
    getDebugPassPP() {
        if (!this._voxelDebugPass) {
            this._createDebugPass();
        }
        return this._voxelDebugPass;
    }
    /**
     * Whether to use tri-planar voxelization. More expensive, but can help with artifacts.
     */
    get triPlanarVoxelization() {
        return this._triPlanarVoxelization;
    }
    /**
     * Whether to use tri-planar voxelization. More expensive, but can help with artifacts.
     */
    set triPlanarVoxelization(enabled) {
        if (this._triPlanarVoxelization === enabled) {
            return;
        }
        this._triPlanarVoxelization = enabled;
        this._disposeVoxelTextures();
        this._createTextures();
    }
    /**
     * Set the matrix to use for scaling the world space to voxel space
     * @param matrix The matrix to use for scaling the world space to voxel space
     */
    setWorldScaleMatrix(matrix) {
        this._invWorldScaleMatrix = matrix;
    }
    /**
     * @returns Whether voxelization is currently happening.
     */
    isVoxelizationInProgress() {
        return this._voxelizationInProgress;
    }
    /**
     * Resolution of the voxel grid. The final resolution will be 2^resolutionExp.
     */
    get voxelResolutionExp() {
        return this._voxelResolutionExp;
    }
    /**
     * Resolution of the voxel grid. The final resolution will be 2^resolutionExp.
     */
    set voxelResolutionExp(resolutionExp) {
        if (this._voxelResolutionExp === resolutionExp && this._voxelGridZaxis) {
            return;
        }
        this._voxelResolutionExp = Math.round(Math.min(Math.max(resolutionExp, 3), 9));
        this._voxelResolution = Math.pow(2.0, this._voxelResolutionExp);
        this._disposeVoxelTextures();
        this._createTextures();
    }
    /**
     * Shows only the voxels that were rendered along a particular axis (while using triPlanarVoxelization).
     * If not set, the combined voxel grid will be shown.
     * Note: This only works when the debugMipNumber is set to 0 because we don't generate mips for each axis.
     * @param axis The axis to show (0 = x, 1 = y, 2 = z)
     */
    set voxelDebugAxis(axis) {
        this._voxelDebugAxis = axis;
    }
    get voxelDebugAxis() {
        return this._voxelDebugAxis;
    }
    /**
     * Sets params that control the position and scaling of the debug display on the screen.
     * @param x Screen X offset of the debug display (0-1)
     * @param y Screen Y offset of the debug display (0-1)
     * @param widthScale X scale of the debug display (0-1)
     * @param heightScale Y scale of the debug display (0-1)
     */
    setDebugDisplayParams(x, y, widthScale, heightScale) {
        this._debugSizeParams.set(x, y, widthScale, heightScale);
    }
    /**
     * The mip level to show in the debug display
     * @param mipNum The mip level to show in the debug display
     */
    setDebugMipNumber(mipNum) {
        this._debugMipNumber = mipNum;
    }
    /**
     * Sets the name of the debug pass
     */
    get debugPassName() {
        return this._debugPassName;
    }
    /**
     * Enable or disable the debug view for this pass
     */
    get voxelDebugEnabled() {
        return this._voxelDebugEnabled;
    }
    set voxelDebugEnabled(enabled) {
        if (this._voxelDebugEnabled === enabled) {
            return;
        }
        this._voxelDebugEnabled = enabled;
        if (enabled) {
            this._voxelSlabDebugRT = new RenderTargetTexture("voxelSlabDebug", { width: this._engine.getRenderWidth(), height: this._engine.getRenderHeight() }, this._scene, {
                generateDepthBuffer: true,
                generateMipMaps: false,
                type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                format: Constants.TEXTUREFORMAT_RGBA,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            });
            this._voxelSlabDebugRT.noPrePassRenderer = true;
        }
        if (this._voxelSlabDebugRT) {
            this._removeVoxelRTs([this._voxelSlabDebugRT]);
        }
        // Add the slab debug RT if needed.
        if (this._voxelDebugEnabled) {
            this._addRTsForRender([this._voxelSlabDebugRT], this._includedMeshes, this._voxelDebugAxis, 1, true);
            this._setDebugBindingsBound = this._setDebugBindings.bind(this);
            this._scene.onBeforeRenderObservable.add(this._setDebugBindingsBound);
        }
        else {
            this._scene.onBeforeRenderObservable.removeCallback(this._setDebugBindingsBound);
        }
    }
    /**
     * Creates the debug post process effect for this pass
     */
    _createDebugPass() {
        const isWebGPU = this._engine.isWebGPU;
        if (!this._voxelDebugPass) {
            const debugOptions = {
                width: this._engine.getRenderWidth(),
                height: this._engine.getRenderHeight(),
                textureFormat: Constants.TEXTUREFORMAT_RGBA,
                textureType: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                uniforms: ["sizeParams", "mipNumber"],
                samplers: ["voxelTexture", "voxelSlabTexture"],
                engine: this._engine,
                reusable: false,
                shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
                extraInitializations: (useWebGPU, list) => {
                    if (this._isVoxelGrid3D) {
                        if (useWebGPU) {
                            list.push(import('./iblVoxelGrid3dDebug.fragment-Cs17LiV5.esm.js'));
                        }
                        else {
                            list.push(import('./iblVoxelGrid3dDebug.fragment-CFCWmEke.esm.js'));
                        }
                        return;
                    }
                    if (useWebGPU) {
                        list.push(import('./iblVoxelGrid2dArrayDebug.fragment-a1S_G_wC.esm.js'));
                    }
                    else {
                        list.push(import('./iblVoxelGrid2dArrayDebug.fragment-Cw7V3Dbu.esm.js'));
                    }
                },
            };
            this._voxelDebugPass = new PostProcess(this.debugPassName, this._isVoxelGrid3D ? "iblVoxelGrid3dDebug" : "iblVoxelGrid2dArrayDebug", debugOptions);
            this._voxelDebugPass.onApplyObservable.add((effect) => {
                if (this._voxelDebugAxis === 0) {
                    effect.setTexture("voxelTexture", this._voxelGridXaxis);
                }
                else if (this._voxelDebugAxis === 1) {
                    effect.setTexture("voxelTexture", this._voxelGridYaxis);
                }
                else if (this._voxelDebugAxis === 2) {
                    effect.setTexture("voxelTexture", this._voxelGridZaxis);
                }
                else {
                    effect.setTexture("voxelTexture", this.getVoxelGrid());
                }
                effect.setTexture("voxelSlabTexture", this._voxelSlabDebugRT);
                effect.setVector4("sizeParams", this._debugSizeParams);
                effect.setFloat("mipNumber", this._debugMipNumber);
            });
        }
    }
    /**
     * Instanciates the voxel renderer
     * @param scene Scene to attach to
     * @param iblShadowsRenderPipeline The render pipeline this pass is associated with
     * @param resolutionExp Resolution of the voxel grid. The final resolution will be 2^resolutionExp.
     * @param triPlanarVoxelization Whether to use tri-planar voxelization. More expensive, but can help with artifacts.
     * @returns The voxel renderer
     */
    constructor(scene, iblShadowsRenderPipeline, resolutionExp = 6, triPlanarVoxelization = true) {
        this._voxelMrtsXaxis = [];
        this._voxelMrtsYaxis = [];
        this._voxelMrtsZaxis = [];
        this._isVoxelGrid3D = true;
        /**
         * Observable that triggers when the voxelization is complete
         */
        this.onVoxelizationCompleteObservable = new Observable();
        this._renderTargets = [];
        this._triPlanarVoxelization = true;
        this._voxelizationInProgress = false;
        this._invWorldScaleMatrix = Matrix.Identity();
        this._voxelResolution = 64;
        this._voxelResolutionExp = 6;
        this._mipArray = [];
        this._voxelDebugEnabled = false;
        this._voxelDebugAxis = -1;
        this._debugSizeParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._includedMeshes = [];
        this._debugMipNumber = 0;
        this._debugPassName = "Voxelization Debug Pass";
        this._scene = scene;
        this._engine = scene.getEngine();
        this._triPlanarVoxelization = triPlanarVoxelization;
        if (!this._engine.getCaps().drawBuffersExtension) {
            Logger.Error("Can't do voxel rendering without the draw buffers extension.");
        }
        const isWebGPU = this._engine.isWebGPU;
        this._maxDrawBuffers = this._engine.getCaps().maxDrawBuffers || 0;
        this._copyMipEffectRenderer = new EffectRenderer(this._engine);
        this._copyMipEffectWrapper = new EffectWrapper({
            engine: this._engine,
            fragmentShader: "copyTexture3DLayerToTexture",
            useShaderStore: true,
            uniformNames: ["layerNum"],
            samplerNames: ["textureSampler"],
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await import('./copyTexture3DLayerToTexture.fragment-CnfOUMsn.esm.js');
                }
                else {
                    await import('./copyTexture3DLayerToTexture.fragment-C83XV-F7.esm.js');
                }
            },
        });
        this.voxelResolutionExp = resolutionExp;
    }
    _generateMipMaps() {
        const iterations = Math.ceil(Math.log2(this._voxelResolution));
        for (let i = 1; i < iterations + 1; i++) {
            this._generateMipMap(i);
        }
    }
    _generateMipMap(lodLevel) {
        // Generate a mip map for the given level by triggering the render of the procedural mip texture.
        const mipTarget = this._mipArray[lodLevel - 1];
        if (!mipTarget) {
            return;
        }
        mipTarget.setTexture("srcMip", lodLevel === 1 ? this.getVoxelGrid() : this._mipArray[lodLevel - 2]);
        mipTarget.render();
    }
    _copyMipMaps() {
        const iterations = Math.ceil(Math.log2(this._voxelResolution));
        for (let i = 1; i < iterations + 1; i++) {
            this._copyMipMap(i);
        }
    }
    _copyMipMap(lodLevel) {
        // Now, copy this mip into the mip chain of the voxel grid.
        // TODO - this currently isn't working. "textureSampler" isn't being properly set to mipTarget.
        const mipTarget = this._mipArray[lodLevel - 1];
        if (!mipTarget) {
            return;
        }
        const voxelGrid = this.getVoxelGrid();
        let rt;
        if (voxelGrid instanceof RenderTargetTexture && voxelGrid.renderTarget) {
            rt = voxelGrid.renderTarget;
        }
        else {
            rt = voxelGrid._rtWrapper;
        }
        if (rt) {
            this._copyMipEffectRenderer.saveStates();
            const bindSize = mipTarget.getSize().width;
            // Render to each layer of the voxel grid.
            for (let layer = 0; layer < bindSize; layer++) {
                this._engine.bindFramebuffer(rt, 0, bindSize, bindSize, true, lodLevel, layer);
                this._copyMipEffectRenderer.applyEffectWrapper(this._copyMipEffectWrapper);
                this._copyMipEffectWrapper.effect.setTexture("textureSampler", mipTarget);
                this._copyMipEffectWrapper.effect.setInt("layerNum", layer);
                this._copyMipEffectRenderer.draw();
                this._engine.unBindFramebuffer(rt, true);
            }
            this._copyMipEffectRenderer.restoreStates();
        }
    }
    _computeNumberOfSlabs() {
        return Math.ceil(this._voxelResolution / this._maxDrawBuffers);
    }
    _createTextures() {
        const isWebGPU = this._engine.isWebGPU;
        const size = {
            width: this._voxelResolution,
            height: this._voxelResolution,
            layers: this._isVoxelGrid3D ? undefined : this._voxelResolution,
            depth: this._isVoxelGrid3D ? this._voxelResolution : undefined,
        };
        const voxelAxisOptions = {
            generateDepthBuffer: false,
            generateMipMaps: false,
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: Constants.TEXTUREFORMAT_R,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        };
        // We can render up to maxDrawBuffers voxel slices of the grid per render.
        // We call this a slab.
        const numSlabs = this._computeNumberOfSlabs();
        const voxelCombinedOptions = {
            generateDepthBuffer: false,
            generateMipMaps: true,
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: Constants.TEXTUREFORMAT_R,
            samplingMode: Constants.TEXTURE_NEAREST_NEAREST_MIPNEAREST,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await import('./iblCombineVoxelGrids.fragment-CgAzhU8T.esm.js');
                }
                else {
                    await import('./iblCombineVoxelGrids.fragment-BjS_fk-a.esm.js');
                }
            },
        };
        if (this._triPlanarVoxelization) {
            this._voxelGridXaxis = new RenderTargetTexture("voxelGridXaxis", size, this._scene, voxelAxisOptions);
            this._voxelGridYaxis = new RenderTargetTexture("voxelGridYaxis", size, this._scene, voxelAxisOptions);
            this._voxelGridZaxis = new RenderTargetTexture("voxelGridZaxis", size, this._scene, voxelAxisOptions);
            this._voxelMrtsXaxis = this._createVoxelMRTs("x_axis_", this._voxelGridXaxis, numSlabs);
            this._voxelMrtsYaxis = this._createVoxelMRTs("y_axis_", this._voxelGridYaxis, numSlabs);
            this._voxelMrtsZaxis = this._createVoxelMRTs("z_axis_", this._voxelGridZaxis, numSlabs);
            this._voxelGridRT = new ProceduralTexture("combinedVoxelGrid", size, "iblCombineVoxelGrids", this._scene, voxelCombinedOptions, false);
            this._scene.proceduralTextures.splice(this._scene.proceduralTextures.indexOf(this._voxelGridRT), 1);
            this._voxelGridRT.setFloat("layer", 0.0);
            this._voxelGridRT.setTexture("voxelXaxisSampler", this._voxelGridXaxis);
            this._voxelGridRT.setTexture("voxelYaxisSampler", this._voxelGridYaxis);
            this._voxelGridRT.setTexture("voxelZaxisSampler", this._voxelGridZaxis);
            // We will render this only after voxelization is completed for the 3 axes.
            this._voxelGridRT.autoClear = false;
            this._voxelGridRT.wrapU = Texture.CLAMP_ADDRESSMODE;
            this._voxelGridRT.wrapV = Texture.CLAMP_ADDRESSMODE;
        }
        else {
            this._voxelGridZaxis = new RenderTargetTexture("voxelGridZaxis", size, this._scene, voxelCombinedOptions);
            this._voxelMrtsZaxis = this._createVoxelMRTs("z_axis_", this._voxelGridZaxis, numSlabs);
        }
        const generateVoxelMipOptions = {
            generateDepthBuffer: false,
            generateMipMaps: false,
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: Constants.TEXTUREFORMAT_R,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await import('./iblGenerateVoxelMip.fragment-DzdyNAIX.esm.js');
                }
                else {
                    await import('./iblGenerateVoxelMip.fragment-ccg1DYdd.esm.js');
                }
            },
        };
        this._mipArray = new Array(Math.ceil(Math.log2(this._voxelResolution)));
        for (let mipIdx = 1; mipIdx <= this._mipArray.length; mipIdx++) {
            const mipDim = this._voxelResolution >> mipIdx;
            const mipSize = { width: mipDim, height: mipDim, depth: mipDim };
            this._mipArray[mipIdx - 1] = new ProceduralTexture("voxelMip" + mipIdx, mipSize, "iblGenerateVoxelMip", this._scene, generateVoxelMipOptions, false);
            this._scene.proceduralTextures.splice(this._scene.proceduralTextures.indexOf(this._mipArray[mipIdx - 1]), 1);
            const mipTarget = this._mipArray[mipIdx - 1];
            mipTarget.autoClear = false;
            mipTarget.wrapU = Texture.CLAMP_ADDRESSMODE;
            mipTarget.wrapV = Texture.CLAMP_ADDRESSMODE;
            mipTarget.setTexture("srcMip", mipIdx > 1 ? this._mipArray[mipIdx - 2] : this.getVoxelGrid());
            mipTarget.setInt("layerNum", 0);
        }
        this._createVoxelMaterials();
    }
    _createVoxelMRTs(name, voxelRT, numSlabs) {
        voxelRT.wrapU = Texture.CLAMP_ADDRESSMODE;
        voxelRT.wrapV = Texture.CLAMP_ADDRESSMODE;
        voxelRT.noPrePassRenderer = true;
        const mrtArray = [];
        const targetTypes = new Array(this._maxDrawBuffers).fill(this._isVoxelGrid3D ? Constants.TEXTURE_3D : Constants.TEXTURE_2D_ARRAY);
        for (let mrtIndex = 0; mrtIndex < numSlabs; mrtIndex++) {
            let layerIndices = new Array(this._maxDrawBuffers).fill(0);
            layerIndices = layerIndices.map((value, index) => mrtIndex * this._maxDrawBuffers + index);
            let textureNames = new Array(this._maxDrawBuffers).fill("");
            textureNames = textureNames.map((value, index) => "voxel_grid_" + name + (mrtIndex * this._maxDrawBuffers + index));
            const mrt = new MultiRenderTarget("mrt_" + name + mrtIndex, { width: this._voxelResolution, height: this._voxelResolution, depth: this._isVoxelGrid3D ? this._voxelResolution : undefined }, this._maxDrawBuffers, // number of draw buffers
            this._scene, {
                types: new Array(this._maxDrawBuffers).fill(Constants.TEXTURETYPE_UNSIGNED_BYTE),
                samplingModes: new Array(this._maxDrawBuffers).fill(Constants.TEXTURE_TRILINEAR_SAMPLINGMODE),
                generateMipMaps: false,
                targetTypes,
                formats: new Array(this._maxDrawBuffers).fill(Constants.TEXTUREFORMAT_R),
                faceIndex: new Array(this._maxDrawBuffers).fill(0),
                layerIndex: layerIndices,
                layerCounts: new Array(this._maxDrawBuffers).fill(this._voxelResolution),
                generateDepthBuffer: false,
                generateStencilBuffer: false,
            }, textureNames);
            mrt.clearColor = new Color4(0, 0, 0, 1);
            mrt.noPrePassRenderer = true;
            for (let i = 0; i < this._maxDrawBuffers; i++) {
                mrt.setInternalTexture(voxelRT.getInternalTexture(), i);
            }
            mrtArray.push(mrt);
        }
        return mrtArray;
    }
    _disposeVoxelTextures() {
        this._stopVoxelization();
        for (let i = 0; i < this._voxelMrtsZaxis.length; i++) {
            if (this._triPlanarVoxelization) {
                this._voxelMrtsXaxis[i].dispose(true);
                this._voxelMrtsYaxis[i].dispose(true);
            }
            this._voxelMrtsZaxis[i].dispose(true);
        }
        if (this._triPlanarVoxelization) {
            this._voxelGridXaxis?.dispose();
            this._voxelGridYaxis?.dispose();
            this._voxelGridRT?.dispose();
        }
        this._voxelGridZaxis?.dispose();
        for (const mip of this._mipArray) {
            mip.dispose();
        }
        this._voxelMaterial?.dispose();
        this._voxelSlabDebugMaterial?.dispose();
        this._mipArray = [];
        this._voxelMrtsXaxis = [];
        this._voxelMrtsYaxis = [];
        this._voxelMrtsZaxis = [];
    }
    _createVoxelMaterials() {
        const isWebGPU = this._engine.isWebGPU;
        this._voxelMaterial = new ShaderMaterial("voxelization", this._scene, "iblVoxelGrid", {
            uniforms: ["world", "viewMatrix", "invWorldScale", "nearPlane", "farPlane", "stepSize"],
            defines: ["MAX_DRAW_BUFFERS " + this._maxDrawBuffers],
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./iblVoxelGrid.fragment-BNV30Jwx.esm.js'), import('./iblVoxelGrid.vertex-Dz3njYfq.esm.js')]);
                }
                else {
                    await Promise.all([import('./iblVoxelGrid.fragment-BggcxGIE.esm.js'), import('./iblVoxelGrid.vertex-BvO9vy8t.esm.js')]);
                }
            },
        });
        this._voxelMaterial.cullBackFaces = false;
        this._voxelMaterial.backFaceCulling = false;
        this._voxelMaterial.depthFunction = Engine.ALWAYS;
        this._voxelSlabDebugMaterial = new ShaderMaterial("voxelSlabDebug", this._scene, "iblVoxelSlabDebug", {
            uniforms: ["world", "viewMatrix", "cameraViewMatrix", "projection", "invWorldScale", "nearPlane", "farPlane", "stepSize"],
            defines: ["MAX_DRAW_BUFFERS " + this._maxDrawBuffers],
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./iblVoxelSlabDebug.fragment-phXEEcap.esm.js'), import('./iblVoxelSlabDebug.vertex-Dbsiti2D.esm.js')]);
                }
                else {
                    await Promise.all([import('./iblVoxelSlabDebug.fragment-B4kMOt0D.esm.js'), import('./iblVoxelSlabDebug.vertex-COBaGjxO.esm.js')]);
                }
            },
        });
    }
    _setDebugBindings() {
        this._voxelSlabDebugMaterial.setMatrix("projection", this._scene.activeCamera.getProjectionMatrix());
        this._voxelSlabDebugMaterial.setMatrix("cameraViewMatrix", this._scene.activeCamera.getViewMatrix());
    }
    /**
     * Checks if the voxel renderer is ready to voxelize scene
     * @returns true if the voxel renderer is ready to voxelize scene
     */
    isReady() {
        let allReady = this.getVoxelGrid().isReady();
        for (let i = 0; i < this._mipArray.length; i++) {
            const mipReady = this._mipArray[i].isReady();
            allReady &&= mipReady;
        }
        if (!allReady || this._voxelizationInProgress) {
            return false;
        }
        return true;
    }
    /**
     * If the MRT's are already in the list of render targets, this will
     * remove them so that they don't get rendered again.
     */
    _stopVoxelization() {
        // If the MRT's are already in the list of render targets, remove them.
        this._removeVoxelRTs(this._voxelMrtsXaxis);
        this._removeVoxelRTs(this._voxelMrtsYaxis);
        this._removeVoxelRTs(this._voxelMrtsZaxis);
    }
    _removeVoxelRTs(rts) {
        // const currentRTs = this._scene.customRenderTargets;
        const rtIdx = this._renderTargets.findIndex((rt) => {
            if (rt === rts[0]) {
                return true;
            }
            return false;
        });
        if (rtIdx >= 0) {
            this._renderTargets.splice(rtIdx, rts.length);
        }
        else {
            const rtIdx = this._scene.customRenderTargets.findIndex((rt) => {
                if (rt === rts[0]) {
                    return true;
                }
                return false;
            });
            if (rtIdx >= 0) {
                this._scene.customRenderTargets.splice(rtIdx, rts.length);
            }
        }
    }
    /**
     * Renders voxel grid of scene for IBL shadows
     * @param includedMeshes
     */
    updateVoxelGrid(includedMeshes) {
        this._stopVoxelization();
        this._includedMeshes = includedMeshes;
        this._voxelizationInProgress = true;
        if (this._triPlanarVoxelization) {
            this._addRTsForRender(this._voxelMrtsXaxis, includedMeshes, 0);
            this._addRTsForRender(this._voxelMrtsYaxis, includedMeshes, 1);
            this._addRTsForRender(this._voxelMrtsZaxis, includedMeshes, 2);
        }
        else {
            this._addRTsForRender(this._voxelMrtsZaxis, includedMeshes, 2);
        }
        if (this._voxelDebugEnabled) {
            this._addRTsForRender([this._voxelSlabDebugRT], includedMeshes, this._voxelDebugAxis, 1, true);
        }
        this._renderVoxelGridBound = this._renderVoxelGrid.bind(this);
        this._scene.onAfterRenderObservable.add(this._renderVoxelGridBound);
    }
    _renderVoxelGrid() {
        if (this._voxelizationInProgress) {
            let allReady = this.getVoxelGrid().isReady();
            for (let i = 0; i < this._mipArray.length; i++) {
                const mipReady = this._mipArray[i].isReady();
                allReady &&= mipReady;
            }
            for (let i = 0; i < this._renderTargets.length; i++) {
                const rttReady = this._renderTargets[i].isReadyForRendering();
                allReady &&= rttReady;
            }
            if (allReady) {
                for (const rt of this._renderTargets) {
                    rt.render();
                }
                this._stopVoxelization();
                if (this._triPlanarVoxelization) {
                    this._voxelGridRT.render();
                }
                this._generateMipMaps();
                // eslint-disable-next-line @typescript-eslint/no-floating-promises, github/no-then
                this._copyMipEffectWrapper.effect.whenCompiledAsync().then(() => {
                    this._copyMipMaps();
                    this._scene.onAfterRenderObservable.removeCallback(this._renderVoxelGridBound);
                    this._voxelizationInProgress = false;
                    this.onVoxelizationCompleteObservable.notifyObservers();
                });
            }
        }
    }
    _addRTsForRender(mrts, includedMeshes, axis, shaderType = 0, continuousRender = false) {
        const slabSize = 1.0 / this._computeNumberOfSlabs();
        let voxelMaterial;
        if (shaderType === 0) {
            voxelMaterial = this._voxelMaterial;
        }
        else {
            voxelMaterial = this._voxelSlabDebugMaterial;
        }
        // We need to update the world scale uniform for every mesh being rendered to the voxel grid.
        for (let mrtIndex = 0; mrtIndex < mrts.length; mrtIndex++) {
            const mrt = mrts[mrtIndex];
            mrt.renderList = [];
            const nearPlane = mrtIndex * slabSize;
            const farPlane = (mrtIndex + 1) * slabSize;
            const stepSize = slabSize / this._maxDrawBuffers;
            const cameraPosition = new Vector3(0, 0, 0);
            let targetPosition = new Vector3(0, 0, 1);
            if (axis === 0) {
                targetPosition = new Vector3(1, 0, 0);
            }
            else if (axis === 1) {
                targetPosition = new Vector3(0, 1, 0);
            }
            let upDirection = new Vector3(0, 1, 0);
            if (axis === 1) {
                upDirection = new Vector3(1, 0, 0);
            }
            mrt.onBeforeRenderObservable.add(() => {
                voxelMaterial.setMatrix("viewMatrix", Matrix.LookAtLH(cameraPosition, targetPosition, upDirection));
                voxelMaterial.setMatrix("invWorldScale", this._invWorldScaleMatrix);
                voxelMaterial.setFloat("nearPlane", nearPlane);
                voxelMaterial.setFloat("farPlane", farPlane);
                voxelMaterial.setFloat("stepSize", stepSize);
            });
            // Set this material on every mesh in the scene (for this RT)
            if (includedMeshes.length === 0) {
                return;
            }
            for (const mesh of includedMeshes) {
                if (mesh) {
                    if (mesh.subMeshes && mesh.subMeshes.length > 0) {
                        mrt.renderList?.push(mesh);
                        mrt.setMaterialForRendering(mesh, voxelMaterial);
                    }
                    const meshes = mesh.getChildMeshes();
                    for (const childMesh of meshes) {
                        if (childMesh.subMeshes && childMesh.subMeshes.length > 0) {
                            mrt.renderList?.push(childMesh);
                            mrt.setMaterialForRendering(childMesh, voxelMaterial);
                        }
                    }
                }
            }
        }
        // Add the MRT's to render.
        if (continuousRender) {
            for (const mrt of mrts) {
                if (this._scene.customRenderTargets.indexOf(mrt) === -1) {
                    this._scene.customRenderTargets.push(mrt);
                }
            }
        }
        else {
            this._renderTargets = this._renderTargets.concat(mrts);
        }
    }
    /**
     * Called by the pipeline to resize resources.
     */
    resize() {
        this._voxelSlabDebugRT?.resize({ width: this._scene.getEngine().getRenderWidth(), height: this._scene.getEngine().getRenderHeight() });
    }
    /**
     * Disposes the voxel renderer and associated resources
     */
    dispose() {
        this._disposeVoxelTextures();
        if (this._voxelSlabDebugRT) {
            this._removeVoxelRTs([this._voxelSlabDebugRT]);
            this._voxelSlabDebugRT.dispose();
        }
        if (this._voxelDebugPass) {
            this._voxelDebugPass.dispose();
        }
        // TODO - dispose all created voxel materials.
    }
}

/**
 * Build cdf maps for IBL importance sampling during IBL shadow computation.
 * This should not be instantiated directly, as it is part of a scene component
 * @internal
 */
class _IblShadowsVoxelTracingPass {
    /**
     * The opacity of the shadow cast from the voxel grid
     */
    get voxelShadowOpacity() {
        return this._voxelShadowOpacity;
    }
    /**
     * The opacity of the shadow cast from the voxel grid
     */
    set voxelShadowOpacity(value) {
        this._voxelShadowOpacity = value;
    }
    /**
     * The opacity of the screen-space shadow
     */
    get ssShadowOpacity() {
        return this._ssShadowOpacity;
    }
    /**
     * The opacity of the screen-space shadow
     */
    set ssShadowOpacity(value) {
        this._ssShadowOpacity = value;
    }
    /**
     * The number of samples used in the screen space shadow pass.
     */
    get sssSamples() {
        return this._sssSamples;
    }
    /**
     * The number of samples used in the screen space shadow pass.
     */
    set sssSamples(value) {
        this._sssSamples = value;
    }
    /**
     * The stride used in the screen space shadow pass. This controls the distance between samples.
     */
    get sssStride() {
        return this._sssStride;
    }
    /**
     * The stride used in the screen space shadow pass. This controls the distance between samples.
     */
    set sssStride(value) {
        this._sssStride = value;
    }
    /**
     * The maximum distance that the screen-space shadow will be able to occlude.
     */
    get sssMaxDist() {
        return this._sssMaxDist;
    }
    /**
     * The maximum distance that the screen-space shadow will be able to occlude.
     */
    set sssMaxDist(value) {
        this._sssMaxDist = value;
    }
    /**
     * The thickness of the screen-space shadow
     */
    get sssThickness() {
        return this._sssThickness;
    }
    /**
     * The thickness of the screen-space shadow
     */
    set sssThickness(value) {
        this._sssThickness = value;
    }
    /**
     * The bias to apply to the voxel sampling in the direction of the surface normal of the geometry.
     */
    get voxelNormalBias() {
        return this._voxelNormalBias;
    }
    set voxelNormalBias(value) {
        this._voxelNormalBias = value;
    }
    /**
     * The bias to apply to the voxel sampling in the direction of the light.
     */
    get voxelDirectionBias() {
        return this._voxelDirectionBias;
    }
    set voxelDirectionBias(value) {
        this._voxelDirectionBias = value;
    }
    /**
     * The number of directions to sample for the voxel tracing.
     */
    get sampleDirections() {
        return this._sampleDirections;
    }
    /**
     * The number of directions to sample for the voxel tracing.
     */
    set sampleDirections(value) {
        this._sampleDirections = value;
    }
    /**
     * The current rotation of the environment map, in radians.
     */
    get envRotation() {
        return this._envRotation;
    }
    /**
     * The current rotation of the environment map, in radians.
     */
    set envRotation(value) {
        this._envRotation = value;
    }
    /**
     * Returns the output texture of the pass.
     * @returns The output texture.
     */
    getOutputTexture() {
        return this._outputTexture;
    }
    /**
     * Gets the debug pass post process. This will create the resources for the pass
     * if they don't already exist.
     * @returns The post process
     */
    getDebugPassPP() {
        if (!this._debugPassPP) {
            this._createDebugPass();
        }
        return this._debugPassPP;
    }
    /**
     * The name of the debug pass
     */
    get debugPassName() {
        return this._debugPassName;
    }
    /**
     * Set the matrix to use for scaling the world space to voxel space
     * @param matrix The matrix to use for scaling the world space to voxel space
     */
    setWorldScaleMatrix(matrix) {
        this._invWorldScaleMatrix = matrix;
    }
    /**
     * Render the shadows in color rather than black and white.
     * This is slightly more expensive than black and white shadows but can be much
     * more accurate when the strongest lights in the IBL are non-white.
     */
    set coloredShadows(value) {
        this._coloredShadows = value;
    }
    get coloredShadows() {
        return this._coloredShadows;
    }
    /**
     * Sets params that control the position and scaling of the debug display on the screen.
     * @param x Screen X offset of the debug display (0-1)
     * @param y Screen Y offset of the debug display (0-1)
     * @param widthScale X scale of the debug display (0-1)
     * @param heightScale Y scale of the debug display (0-1)
     */
    setDebugDisplayParams(x, y, widthScale, heightScale) {
        this._debugSizeParams.set(x, y, widthScale, heightScale);
    }
    /**
     * Creates the debug post process effect for this pass
     */
    _createDebugPass() {
        const isWebGPU = this._engine.isWebGPU;
        if (!this._debugPassPP) {
            const debugOptions = {
                width: this._engine.getRenderWidth(),
                height: this._engine.getRenderHeight(),
                uniforms: ["sizeParams"],
                samplers: ["debugSampler"],
                engine: this._engine,
                reusable: true,
                shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
                extraInitializations: (useWebGPU, list) => {
                    if (useWebGPU) {
                        list.push(import('./iblShadowDebug.fragment-Ce-atf-8.esm.js'));
                    }
                    else {
                        list.push(import('./iblShadowDebug.fragment-LIaBZTHL.esm.js'));
                    }
                },
            };
            this._debugPassPP = new PostProcess(this.debugPassName, "iblShadowDebug", debugOptions);
            this._debugPassPP.autoClear = false;
            this._debugPassPP.onApplyObservable.add((effect) => {
                // update the caustic texture with what we just rendered.
                effect.setTexture("debugSampler", this._outputTexture);
                effect.setVector4("sizeParams", this._debugSizeParams);
            });
        }
    }
    /**
     * Instantiates the shadow voxel-tracing pass
     * @param scene Scene to attach to
     * @param iblShadowsRenderPipeline The IBL shadows render pipeline
     * @returns The shadow voxel-tracing pass
     */
    constructor(scene, iblShadowsRenderPipeline) {
        this._voxelShadowOpacity = 1.0;
        this._sssSamples = 16;
        this._sssStride = 8;
        this._sssMaxDist = 0.05;
        this._sssThickness = 0.5;
        this._ssShadowOpacity = 1.0;
        this._cameraInvView = Matrix.Identity();
        this._cameraInvProj = Matrix.Identity();
        this._invWorldScaleMatrix = Matrix.Identity();
        this._frameId = 0;
        this._sampleDirections = 4;
        this._shadowParameters = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._sssParameters = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._opacityParameters = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._voxelBiasParameters = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._voxelNormalBias = 1.4;
        this._voxelDirectionBias = 1.75;
        /**
         * Is the effect enabled
         */
        this.enabled = true;
        /** Enable the debug view for this pass */
        this.debugEnabled = false;
        this._debugPassName = "Voxel Tracing Debug Pass";
        /** The default rotation of the environment map will align the shadows with the default lighting orientation */
        this._envRotation = 0.0;
        this._coloredShadows = false;
        this._debugVoxelMarchEnabled = false;
        this._debugSizeParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._renderWhenGBufferReady = null;
        this._scene = scene;
        this._engine = scene.getEngine();
        this._renderPipeline = iblShadowsRenderPipeline;
        this._createTextures();
    }
    _createTextures() {
        const defines = this._createDefines();
        const isWebGPU = this._engine.isWebGPU;
        const textureOptions = {
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: Constants.TEXTUREFORMAT_RGBA,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./iblShadowVoxelTracing.fragment-0nXVJJqC.esm.js')]);
                }
                else {
                    await Promise.all([import('./iblShadowVoxelTracing.fragment-DmR_KbZA.esm.js')]);
                }
            },
        };
        this._outputTexture = new ProceduralTexture("voxelTracingPass", {
            width: this._engine.getRenderWidth(),
            height: this._engine.getRenderHeight(),
        }, "iblShadowVoxelTracing", this._scene, textureOptions);
        this._outputTexture.refreshRate = -1;
        this._outputTexture.autoClear = false;
        this._outputTexture.defines = defines;
        // Need to set all the textures first so that the effect gets created with the proper uniforms.
        this._setBindings(this._scene.activeCamera);
        this._renderWhenGBufferReady = this._render.bind(this);
        // Don't start rendering until the first vozelization is done.
        this._renderPipeline.onVoxelizationCompleteObservable.addOnce(() => {
            this._scene.geometryBufferRenderer.getGBuffer().onAfterRenderObservable.add(this._renderWhenGBufferReady);
        });
    }
    _createDefines() {
        let defines = "";
        if (this._scene.useRightHandedSystem) {
            defines += "#define RIGHT_HANDED\n";
        }
        if (this._debugVoxelMarchEnabled) {
            defines += "#define VOXEL_MARCH_DIAGNOSTIC_INFO_OPTION 1u\n";
        }
        if (this._coloredShadows) {
            defines += "#define COLOR_SHADOWS 1u\n";
        }
        return defines;
    }
    _setBindings(camera) {
        this._outputTexture.defines = this._createDefines();
        this._outputTexture.setMatrix("viewMtx", camera.getViewMatrix());
        this._outputTexture.setMatrix("projMtx", camera.getProjectionMatrix());
        camera.getProjectionMatrix().invertToRef(this._cameraInvProj);
        camera.getViewMatrix().invertToRef(this._cameraInvView);
        this._outputTexture.setMatrix("invProjMtx", this._cameraInvProj);
        this._outputTexture.setMatrix("invViewMtx", this._cameraInvView);
        this._outputTexture.setMatrix("wsNormalizationMtx", this._invWorldScaleMatrix);
        this._frameId++;
        let rotation = 0.0;
        if (this._scene.environmentTexture) {
            rotation = this._scene.environmentTexture.rotationY ?? 0;
        }
        rotation = this._scene.useRightHandedSystem ? -(rotation + 0.5 * Math.PI) : rotation - 0.5 * Math.PI;
        rotation = rotation % (2.0 * Math.PI);
        this._shadowParameters.set(this._sampleDirections, this._frameId, 1.0, rotation);
        this._outputTexture.setVector4("shadowParameters", this._shadowParameters);
        const voxelGrid = this._renderPipeline._getVoxelGridTexture();
        const highestMip = Math.floor(Math.log2(voxelGrid.getSize().width));
        this._voxelBiasParameters.set(this._voxelNormalBias, this._voxelDirectionBias, highestMip, 0.0);
        this._outputTexture.setVector4("voxelBiasParameters", this._voxelBiasParameters);
        // SSS Options.
        this._sssParameters.set(this._sssSamples, this._sssStride, this._sssMaxDist, this._sssThickness);
        this._outputTexture.setVector4("sssParameters", this._sssParameters);
        this._opacityParameters.set(this._voxelShadowOpacity, this._ssShadowOpacity, 0.0, 0.0);
        this._outputTexture.setVector4("shadowOpacity", this._opacityParameters);
        this._outputTexture.setTexture("voxelGridSampler", voxelGrid);
        this._outputTexture.setTexture("blueNoiseSampler", this._renderPipeline._getNoiseTexture());
        const cdfGenerator = this._scene.iblCdfGenerator;
        if (!cdfGenerator) {
            Logger.Warn("IBLShadowsVoxelTracingPass: Can't bind for render because iblCdfGenerator is not enabled.");
            return false;
        }
        this._outputTexture.setTexture("icdfSampler", cdfGenerator.getIcdfTexture());
        if (this._coloredShadows && this._scene.environmentTexture) {
            this._outputTexture.setTexture("iblSampler", this._scene.environmentTexture);
        }
        const geometryBufferRenderer = this._scene.geometryBufferRenderer;
        if (!geometryBufferRenderer) {
            Logger.Warn("IBLShadowsVoxelTracingPass: Can't bind for render because GeometryBufferRenderer is not enabled.");
            return false;
        }
        const depthIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.SCREENSPACE_DEPTH_TEXTURE_TYPE);
        this._outputTexture.setTexture("depthSampler", geometryBufferRenderer.getGBuffer().textures[depthIndex]);
        const wnormalIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE);
        this._outputTexture.setTexture("worldNormalSampler", geometryBufferRenderer.getGBuffer().textures[wnormalIndex]);
        return true;
    }
    _render() {
        if (this.enabled && this._outputTexture.isReady() && this._outputTexture.getEffect()?.isReady()) {
            if (this._setBindings(this._scene.activeCamera)) {
                this._outputTexture.render();
            }
        }
    }
    /**
     * Called by render pipeline when canvas resized.
     * @param scaleFactor The factor by which to scale the canvas size.
     */
    resize(scaleFactor = 1.0) {
        const newSize = {
            width: Math.max(1.0, Math.floor(this._engine.getRenderWidth() * scaleFactor)),
            height: Math.max(1.0, Math.floor(this._engine.getRenderHeight() * scaleFactor)),
        };
        // Don't resize if the size is the same as the current size.
        if (this._outputTexture.getSize().width === newSize.width && this._outputTexture.getSize().height === newSize.height) {
            return;
        }
        this._outputTexture.resize(newSize, false);
    }
    /**
     * Checks if the pass is ready
     * @returns true if the pass is ready
     */
    isReady() {
        return (this._outputTexture.isReady() &&
            !(this._debugPassPP && !this._debugPassPP.isReady()) &&
            this._scene.iblCdfGenerator &&
            this._scene.iblCdfGenerator.getIcdfTexture().isReady() &&
            this._renderPipeline._getVoxelGridTexture().isReady());
    }
    /**
     * Disposes the associated resources
     */
    dispose() {
        if (this._scene.geometryBufferRenderer && this._renderWhenGBufferReady) {
            const gBuffer = this._scene.geometryBufferRenderer.getGBuffer();
            gBuffer.onAfterRenderObservable.removeCallback(this._renderWhenGBufferReady);
        }
        this._outputTexture.dispose();
        if (this._debugPassPP) {
            this._debugPassPP.dispose();
        }
    }
}

/**
 * This should not be instanciated directly, as it is part of a scene component
 * @internal
 */
class _IblShadowsSpatialBlurPass {
    /**
     * Returns the output texture of the pass.
     * @returns The output texture.
     */
    getOutputTexture() {
        return this._outputTexture;
    }
    /**
     * Gets the debug pass post process
     * @returns The post process
     */
    getDebugPassPP() {
        if (!this._debugPassPP) {
            this._createDebugPass();
        }
        return this._debugPassPP;
    }
    /**
     * Sets the name of the debug pass
     */
    get debugPassName() {
        return this._debugPassName;
    }
    /**
     * The scale of the voxel grid in world space. This is used to scale the blur radius in world space.
     * @param scale The scale of the voxel grid in world space.
     */
    setWorldScale(scale) {
        this._worldScale = scale;
    }
    /**
     * Sets params that control the position and scaling of the debug display on the screen.
     * @param x Screen X offset of the debug display (0-1)
     * @param y Screen Y offset of the debug display (0-1)
     * @param widthScale X scale of the debug display (0-1)
     * @param heightScale Y scale of the debug display (0-1)
     */
    setDebugDisplayParams(x, y, widthScale, heightScale) {
        this._debugSizeParams.set(x, y, widthScale, heightScale);
    }
    /**
     * Creates the debug post process effect for this pass
     */
    _createDebugPass() {
        if (!this._debugPassPP) {
            const isWebGPU = this._engine.isWebGPU;
            const debugOptions = {
                width: this._engine.getRenderWidth(),
                height: this._engine.getRenderHeight(),
                textureFormat: Constants.TEXTUREFORMAT_RGBA,
                textureType: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                uniforms: ["sizeParams"],
                samplers: ["debugSampler"],
                engine: this._engine,
                reusable: false,
                shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
                extraInitializations: (useWebGPU, list) => {
                    if (useWebGPU) {
                        list.push(import('./iblShadowDebug.fragment-Ce-atf-8.esm.js'));
                    }
                    else {
                        list.push(import('./iblShadowDebug.fragment-LIaBZTHL.esm.js'));
                    }
                },
            };
            this._debugPassPP = new PostProcess(this.debugPassName, "iblShadowDebug", debugOptions);
            this._debugPassPP.autoClear = false;
            this._debugPassPP.onApplyObservable.add((effect) => {
                // update the caustic texture with what we just rendered.
                effect.setTexture("debugSampler", this._outputTexture);
                effect.setVector4("sizeParams", this._debugSizeParams);
            });
        }
    }
    /**
     * Instanciates the importance sampling renderer
     * @param scene Scene to attach to
     * @param iblShadowsRenderPipeline The IBL shadows render pipeline
     * @returns The importance sampling renderer
     */
    constructor(scene, iblShadowsRenderPipeline) {
        this._worldScale = 1.0;
        this._blurParameters = new Vector4(0.0, 0.0, 0.0, 0.0);
        /**
         * Is the effect enabled
         */
        this.enabled = true;
        this._debugPassName = "Spatial Blur Debug Pass";
        /** Enable the debug view for this pass */
        this.debugEnabled = false;
        this._debugSizeParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._renderWhenGBufferReady = null;
        this._scene = scene;
        this._engine = scene.getEngine();
        this._renderPipeline = iblShadowsRenderPipeline;
        this._createTextures();
    }
    _createTextures() {
        const isWebGPU = this._engine.isWebGPU;
        const textureOptions = {
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            format: Constants.TEXTUREFORMAT_RGBA,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateMipMaps: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./iblShadowSpatialBlur.fragment-8jTWR2W_.esm.js')]);
                }
                else {
                    await Promise.all([import('./iblShadowSpatialBlur.fragment-BWKv1uyE.esm.js')]);
                }
            },
        };
        this._outputTexture = new ProceduralTexture("spatialBlurPass", {
            width: this._engine.getRenderWidth(),
            height: this._engine.getRenderHeight(),
        }, "iblShadowSpatialBlur", this._scene, textureOptions, false, false, Constants.TEXTURETYPE_UNSIGNED_BYTE);
        this._outputTexture.refreshRate = -1;
        this._outputTexture.autoClear = false;
        // Need to set all the textures first so that the effect gets created with the proper uniforms.
        this._setBindings();
        this._renderWhenGBufferReady = this._render.bind(this);
        // Don't start rendering until the first vozelization is done.
        this._renderPipeline.onVoxelizationCompleteObservable.addOnce(() => {
            this._scene.geometryBufferRenderer.getGBuffer().onAfterRenderObservable.add(this._renderWhenGBufferReady);
        });
    }
    _setBindings() {
        this._outputTexture.setTexture("voxelTracingSampler", this._renderPipeline._getVoxelTracingTexture());
        const iterationCount = 1;
        this._blurParameters.set(iterationCount, this._worldScale, 0.0, 0.0);
        this._outputTexture.setVector4("blurParameters", this._blurParameters);
        const geometryBufferRenderer = this._scene.geometryBufferRenderer;
        if (!geometryBufferRenderer) {
            return false;
        }
        const depthIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.SCREENSPACE_DEPTH_TEXTURE_TYPE);
        this._outputTexture.setTexture("depthSampler", geometryBufferRenderer.getGBuffer().textures[depthIndex]);
        const wnormalIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE);
        this._outputTexture.setTexture("worldNormalSampler", geometryBufferRenderer.getGBuffer().textures[wnormalIndex]);
        return true;
    }
    _render() {
        if (this.enabled && this._outputTexture.isReady() && this._outputTexture.getEffect()?.isReady()) {
            if (this._setBindings()) {
                this._outputTexture.render();
            }
        }
    }
    /**
     * Called by render pipeline when canvas resized.
     * @param scaleFactor The factor by which to scale the canvas size.
     */
    resize(scaleFactor = 1.0) {
        const newSize = {
            width: Math.max(1.0, Math.floor(this._engine.getRenderWidth() * scaleFactor)),
            height: Math.max(1.0, Math.floor(this._engine.getRenderHeight() * scaleFactor)),
        };
        // Don't resize if the size is the same as the current size.
        if (this._outputTexture.getSize().width === newSize.width && this._outputTexture.getSize().height === newSize.height) {
            return;
        }
        this._outputTexture.resize(newSize, false);
    }
    /**
     * Checks if the pass is ready
     * @returns true if the pass is ready
     */
    isReady() {
        return this._outputTexture.isReady() && !(this._debugPassPP && !this._debugPassPP.isReady());
    }
    /**
     * Disposes the associated resources
     */
    dispose() {
        if (this._scene.geometryBufferRenderer && this._renderWhenGBufferReady) {
            const gBuffer = this._scene.geometryBufferRenderer.getGBuffer();
            gBuffer.onAfterRenderObservable.removeCallback(this._renderWhenGBufferReady);
        }
        this._outputTexture.dispose();
        if (this._debugPassPP) {
            this._debugPassPP.dispose();
        }
    }
}

/**
 * This should not be instantiated directly, as it is part of a scene component
 * @internal
 */
class _IblShadowsAccumulationPass {
    /**
     * Returns the output texture of the pass.
     * @returns The output texture.
     */
    getOutputTexture() {
        return this._outputTexture;
    }
    /**
     * Gets the debug pass post process
     * @returns The post process
     */
    getDebugPassPP() {
        if (!this._debugPassPP) {
            this._createDebugPass();
        }
        return this._debugPassPP;
    }
    /**
     * Gets the name of the debug pass
     * @returns The name of the debug pass
     */
    get debugPassName() {
        return this._debugPassName;
    }
    /**
     * A value that controls how much of the previous frame's accumulation to keep.
     * The higher the value, the faster the shadows accumulate but the more potential ghosting you'll see.
     */
    get remanence() {
        return this._remanence;
    }
    /**
     * A value that controls how much of the previous frame's accumulation to keep.
     * The higher the value, the faster the shadows accumulate but the more potential ghosting you'll see.
     */
    set remanence(value) {
        this._remanence = value;
    }
    /**
     * Reset the accumulation.
     */
    get reset() {
        return this._reset;
    }
    /**
     * Reset the accumulation.
     */
    set reset(value) {
        this._reset = value;
    }
    /**
     * Tell the pass that the camera is moving. This will cause the accumulation
     * rate to change.
     */
    set isMoving(value) {
        this._isMoving = value;
    }
    /**
     * Sets params that control the position and scaling of the debug display on the screen.
     * @param x Screen X offset of the debug display (0-1)
     * @param y Screen Y offset of the debug display (0-1)
     * @param widthScale X scale of the debug display (0-1)
     * @param heightScale Y scale of the debug display (0-1)
     */
    setDebugDisplayParams(x, y, widthScale, heightScale) {
        this._debugSizeParams.set(x, y, widthScale, heightScale);
    }
    /**
     * Creates the debug post process effect for this pass
     */
    _createDebugPass() {
        if (!this._debugPassPP) {
            const isWebGPU = this._engine.isWebGPU;
            const debugOptions = {
                width: this._engine.getRenderWidth(),
                height: this._engine.getRenderHeight(),
                textureFormat: Constants.TEXTUREFORMAT_RGBA,
                textureType: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                uniforms: ["sizeParams"],
                samplers: ["debugSampler"],
                engine: this._engine,
                reusable: false,
                shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
                extraInitializations: (useWebGPU, list) => {
                    if (useWebGPU) {
                        list.push(import('./iblShadowDebug.fragment-Ce-atf-8.esm.js'));
                    }
                    else {
                        list.push(import('./iblShadowDebug.fragment-LIaBZTHL.esm.js'));
                    }
                },
            };
            this._debugPassPP = new PostProcess(this.debugPassName, "iblShadowDebug", debugOptions);
            this._debugPassPP.autoClear = false;
            this._debugPassPP.onApplyObservable.add((effect) => {
                // update the caustic texture with what we just rendered.
                effect.setTexture("debugSampler", this._outputTexture);
                effect.setVector4("sizeParams", this._debugSizeParams);
            });
        }
    }
    /**
     * Instantiates the accumulation pass
     * @param scene Scene to attach to
     * @param iblShadowsRenderPipeline The IBL shadows render pipeline
     * @returns The accumulation pass
     */
    constructor(scene, iblShadowsRenderPipeline) {
        this._accumulationParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        /** Enable the debug view for this pass */
        this.debugEnabled = false;
        /**
         * Is the effect enabled
         */
        this.enabled = true;
        /**
         * Observable that triggers when the accumulation texture is ready
         */
        this.onReadyObservable = new Observable();
        this._debugPassName = "Shadow Accumulation Debug Pass";
        this._remanence = 0.9;
        this._reset = true;
        this._isMoving = false;
        this._debugSizeParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        this._renderWhenGBufferReady = null;
        this._scene = scene;
        this._engine = scene.getEngine();
        this._renderPipeline = iblShadowsRenderPipeline;
        this._createTextures();
    }
    _createTextures() {
        const isWebGPU = this._engine.isWebGPU;
        const outputTextureOptions = {
            type: Constants.TEXTURETYPE_HALF_FLOAT,
            format: Constants.TEXTUREFORMAT_RGBA,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateMipMaps: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./iblShadowAccumulation.fragment-BWf964Sb.esm.js')]);
                }
                else {
                    await Promise.all([import('./iblShadowAccumulation.fragment-LplROEUG.esm.js')]);
                }
            },
        };
        this._outputTexture = new ProceduralTexture("shadowAccumulationPass", {
            width: this._engine.getRenderWidth(),
            height: this._engine.getRenderHeight(),
        }, "iblShadowAccumulation", this._scene, outputTextureOptions);
        this._outputTexture.refreshRate = 1;
        this._outputTexture.autoClear = false;
        this._outputTexture.onGeneratedObservable.addOnce(() => {
            this.onReadyObservable.notifyObservers();
        });
        // Need to set all the textures first so that the effect gets created with the proper uniforms.
        this._setOutputTextureBindings();
        this._renderWhenGBufferReady = this._render.bind(this);
        // Don't start rendering until the first vozelization is done.
        this._renderPipeline.onVoxelizationCompleteObservable.addOnce(() => {
            this._scene.geometryBufferRenderer.getGBuffer().onAfterRenderObservable.add(this._renderWhenGBufferReady);
        });
        // Create the accumulation texture for the previous frame.
        // We'll copy the output of the accumulation pass to this texture at the start of every frame.
        const accumulationOptions = {
            type: Constants.TEXTURETYPE_HALF_FLOAT,
            format: Constants.TEXTUREFORMAT_RGBA,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateMipMaps: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./pass.fragment-P7QgsQiU.esm.js')]);
                }
                else {
                    await Promise.all([import('./pass.fragment-CE9DfTC5.esm.js')]);
                }
            },
        };
        this._oldAccumulationCopy = new ProceduralTexture("oldAccumulationRT", { width: this._engine.getRenderWidth(), height: this._engine.getRenderHeight() }, "pass", this._scene, accumulationOptions, false);
        this._oldAccumulationCopy.autoClear = false;
        this._oldAccumulationCopy.refreshRate = 1;
        this._oldAccumulationCopy.onBeforeGenerationObservable.add(this._setAccumulationCopyBindings.bind(this));
        this._setAccumulationCopyBindings();
        // Create the local position texture for the previous frame.
        // We'll copy the previous local position texture to this texture at the start of every frame.
        const localPositionOptions = {
            type: Constants.TEXTURETYPE_HALF_FLOAT,
            format: Constants.TEXTUREFORMAT_RGBA,
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            generateDepthBuffer: false,
            generateMipMaps: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializationsAsync: async () => {
                if (isWebGPU) {
                    await Promise.all([import('./pass.fragment-P7QgsQiU.esm.js')]);
                }
                else {
                    await Promise.all([import('./pass.fragment-CE9DfTC5.esm.js')]);
                }
            },
        };
        this._oldPositionCopy = new ProceduralTexture("oldLocalPositionRT", { width: this._engine.getRenderWidth(), height: this._engine.getRenderHeight() }, "pass", this._scene, localPositionOptions, false);
        this._updatePositionCopy();
        this._oldPositionCopy.autoClear = false;
        this._oldPositionCopy.refreshRate = 1;
        this._oldPositionCopy.onBeforeGenerationObservable.add(this._updatePositionCopy.bind(this));
    }
    _setOutputTextureBindings() {
        const remanence = this._isMoving ? this.remanence : 0.99;
        this._accumulationParams.set(remanence, this.reset ? 1.0 : 0.0, this._renderPipeline.voxelGridSize, 0.0);
        this._outputTexture.setTexture("spatialBlurSampler", this._renderPipeline._getSpatialBlurTexture());
        this._outputTexture.setVector4("accumulationParameters", this._accumulationParams);
        this._outputTexture.setTexture("oldAccumulationSampler", this._oldAccumulationCopy ? this._oldAccumulationCopy : this._renderPipeline._dummyTexture2d);
        this._outputTexture.setTexture("prevPositionSampler", this._oldPositionCopy ? this._oldPositionCopy : this._renderPipeline._dummyTexture2d);
        const geometryBufferRenderer = this._scene.geometryBufferRenderer;
        if (!geometryBufferRenderer) {
            return false;
        }
        const velocityIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.VELOCITY_LINEAR_TEXTURE_TYPE);
        this._outputTexture.setTexture("motionSampler", geometryBufferRenderer.getGBuffer().textures[velocityIndex]);
        const wPositionIndex = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
        this._outputTexture.setTexture("positionSampler", geometryBufferRenderer.getGBuffer().textures[wPositionIndex]);
        this.reset = false;
        this._isMoving = false;
        return true;
    }
    _updatePositionCopy() {
        const geometryBufferRenderer = this._scene.geometryBufferRenderer;
        const index = geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
        this._oldPositionCopy.setTexture("textureSampler", geometryBufferRenderer.getGBuffer().textures[index]);
    }
    _setAccumulationCopyBindings() {
        this._oldAccumulationCopy.setTexture("textureSampler", this._outputTexture);
    }
    _render() {
        if (this.enabled && this._outputTexture.isReady() && this._outputTexture.getEffect()?.isReady()) {
            if (this._setOutputTextureBindings()) {
                this._outputTexture.render();
            }
        }
    }
    /**
     * Called by render pipeline when canvas resized.
     * @param scaleFactor The factor by which to scale the canvas size.
     */
    resize(scaleFactor = 1.0) {
        const newSize = {
            width: Math.max(1.0, Math.floor(this._engine.getRenderWidth() * scaleFactor)),
            height: Math.max(1.0, Math.floor(this._engine.getRenderHeight() * scaleFactor)),
        };
        // Don't resize if the size is the same as the current size.
        if (this._outputTexture.getSize().width === newSize.width && this._outputTexture.getSize().height === newSize.height) {
            return;
        }
        this._outputTexture.resize(newSize, false);
        this._oldAccumulationCopy.resize(newSize, false);
        this._oldPositionCopy.resize({ width: this._engine.getRenderWidth(), height: this._engine.getRenderHeight() }, false);
        this.reset = true;
    }
    _disposeTextures() {
        this._oldAccumulationCopy.dispose();
        this._oldPositionCopy.dispose();
        this._outputTexture.dispose();
    }
    /**
     * Checks if the pass is ready
     * @returns true if the pass is ready
     */
    isReady() {
        return (this._oldAccumulationCopy &&
            this._oldAccumulationCopy.isReady() &&
            this._oldPositionCopy &&
            this._oldPositionCopy.isReady() &&
            this._outputTexture.isReady() &&
            !(this._debugPassPP && !this._debugPassPP.isReady()));
    }
    /**
     * Disposes the associated resources
     */
    dispose() {
        if (this._scene.geometryBufferRenderer && this._renderWhenGBufferReady) {
            const gBuffer = this._scene.geometryBufferRenderer.getGBuffer();
            gBuffer.onAfterRenderObservable.removeCallback(this._renderWhenGBufferReady);
        }
        this._disposeTextures();
        if (this._debugPassPP) {
            this._debugPassPP.dispose();
        }
        this.onReadyObservable.clear();
    }
}

/**
 * Class used to store 3D textures containing user data
 */
class RawTexture3D extends Texture {
    /**
     * Gets the width of the texture
     */
    get width() {
        return this._texture ? this._texture.width : 0;
    }
    /**
     * Gets the height of the texture
     */
    get height() {
        return this._texture ? this._texture.height : 0;
    }
    /**
     * Gets the depth of the texture
     */
    get depth() {
        return this._texture ? this._texture.depth : 0;
    }
    /**
     * Create a new RawTexture3D
     * @param data defines the data of the texture
     * @param width defines the width of the texture
     * @param height defines the height of the texture
     * @param depth defines the depth of the texture
     * @param format defines the texture format to use
     * @param scene defines the hosting scene
     * @param generateMipMaps defines a boolean indicating if mip levels should be generated (true by default)
     * @param invertY defines if texture must be stored with Y axis inverted
     * @param samplingMode defines the sampling mode to use (Texture.TRILINEAR_SAMPLINGMODE by default)
     * @param textureType defines the texture Type (Engine.TEXTURETYPE_UNSIGNED_BYTE, Engine.TEXTURETYPE_FLOAT...)
     * @param creationFlags specific flags to use when creating the texture (Constants.TEXTURE_CREATIONFLAG_STORAGE for storage textures, for eg)
     */
    constructor(data, width, height, depth, 
    /** Gets or sets the texture format to use */
    format, scene, generateMipMaps = true, invertY = false, samplingMode = Texture.TRILINEAR_SAMPLINGMODE, textureType = Constants.TEXTURETYPE_UNSIGNED_BYTE, creationFlags) {
        super(null, scene, !generateMipMaps, invertY);
        this.format = format;
        this._texture = scene.getEngine().createRawTexture3D(data, width, height, depth, format, generateMipMaps, invertY, samplingMode, null, textureType, creationFlags);
        this.is3D = true;
    }
    /**
     * Update the texture with new data
     * @param data defines the data to store in the texture
     */
    update(data) {
        if (!this._texture) {
            return;
        }
        this._getEngine().updateRawTexture3D(this._texture, data, this._texture.format, this._texture.invertY, null, this._texture.type);
    }
}

/**
 * @internal
 */
class MaterialIBLShadowsRenderDefines extends MaterialDefines {
    constructor() {
        super(...arguments);
        this.RENDER_WITH_IBL_SHADOWS = false;
        this.COLORED_IBL_SHADOWS = false;
    }
}
/**
 * Plugin used to render the contribution from IBL shadows.
 */
class IBLShadowsPluginMaterial extends MaterialPluginBase {
    get isColored() {
        return this._isColored;
    }
    set isColored(value) {
        if (this._isColored === value) {
            return;
        }
        this._isColored = value;
        this._markAllSubMeshesAsTexturesDirty();
    }
    _markAllSubMeshesAsTexturesDirty() {
        this._enable(this._isEnabled);
        this._internalMarkAllSubMeshesAsTexturesDirty();
    }
    /**
     * Gets a boolean indicating that the plugin is compatible with a give shader language.
     * @returns true if the plugin is compatible with the shader language
     */
    isCompatible() {
        return true;
    }
    constructor(material) {
        super(material, IBLShadowsPluginMaterial.Name, 310, new MaterialIBLShadowsRenderDefines());
        /**
         * The opacity of the shadows.
         */
        this.shadowOpacity = 1.0;
        this._isEnabled = false;
        this._isColored = false;
        /**
         * Defines if the plugin is enabled in the material.
         */
        this.isEnabled = false;
        this._internalMarkAllSubMeshesAsTexturesDirty = material._dirtyCallbacks[Constants.MATERIAL_TextureDirtyFlag];
    }
    prepareDefines(defines) {
        defines.RENDER_WITH_IBL_SHADOWS = this._isEnabled;
        defines.COLORED_IBL_SHADOWS = this.isColored;
    }
    getClassName() {
        return "IBLShadowsPluginMaterial";
    }
    getUniforms() {
        return {
            ubo: [
                { name: "renderTargetSize", size: 2, type: "vec2" },
                { name: "shadowOpacity", size: 1, type: "float" },
            ],
            fragment: `#ifdef RENDER_WITH_IBL_SHADOWS
                    uniform vec2 renderTargetSize;
                    uniform float shadowOpacity;
                #endif`,
        };
    }
    getSamplers(samplers) {
        samplers.push("iblShadowsTexture");
    }
    bindForSubMesh(uniformBuffer) {
        if (this._isEnabled) {
            uniformBuffer.bindTexture("iblShadowsTexture", this.iblShadowsTexture);
            uniformBuffer.updateFloat2("renderTargetSize", this._material.getScene().getEngine().getRenderWidth(), this._material.getScene().getEngine().getRenderHeight());
            uniformBuffer.updateFloat("shadowOpacity", this.shadowOpacity);
        }
    }
    getCustomCode(shaderType, shaderLanguage) {
        let frag;
        if (shaderLanguage === 1 /* ShaderLanguage.WGSL */) {
            frag = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                CUSTOM_FRAGMENT_DEFINITIONS: `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    var iblShadowsTextureSampler: sampler;
                    var iblShadowsTexture: texture_2d<f32>;

                    #ifdef COLORED_IBL_SHADOWS
                        fn computeIndirectShadow() -> vec3f {
                            var uv = fragmentInputs.position.xy / uniforms.renderTargetSize;
                            var shadowValue: vec3f = textureSample(iblShadowsTexture, iblShadowsTextureSampler, uv).rgb;
                            return mix(shadowValue, vec3f(1.0), 1.0 - uniforms.shadowOpacity);
                        }
                    #else
                        fn computeIndirectShadow() -> vec2f {
                            var uv = fragmentInputs.position.xy / uniforms.renderTargetSize;
                            var shadowValue: vec2f = textureSample(iblShadowsTexture, iblShadowsTextureSampler, uv).rg;
                            return mix(shadowValue, vec2f(1.0), 1.0 - uniforms.shadowOpacity);
                        }
                    #endif
                #endif
            `,
            };
            if (this._material instanceof PBRBaseMaterial) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                frag["CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifndef UNLIT
                        #ifdef REFLECTION
                            #ifdef COLORED_IBL_SHADOWS
                                var shadowValue: vec3f = computeIndirectShadow();
                                finalIrradiance *= shadowValue;
                                finalRadianceScaled *= mix(vec3f(1.0), shadowValue, roughness);
                            #else
                                var shadowValue: vec2f = computeIndirectShadow();
                                finalIrradiance *= vec3f(shadowValue.x);
                                finalRadianceScaled *= vec3f(mix(pow(shadowValue.y, 4.0), shadowValue.x, roughness));
                            #endif
                        #endif
                    #else
                        finalDiffuse *= computeIndirectShadow().x;
                    #endif
                #endif
            `;
            }
            else if (this._material instanceof OpenPBRMaterial) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                frag["CUSTOM_FRAGMENT_BEFORE_IBLLAYERCOMPOSITION"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifndef UNLIT
                        #ifdef REFLECTION
                            #ifdef COLORED_IBL_SHADOWS
                                var shadowValue: vec3f = computeIndirectShadow();
                                slab_diffuse_ibl *= shadowValue;
                                slab_glossy_ibl *= mix(vec3f(1.0), shadowValue, specularAlphaG);
                            #else
                                var shadowValue: vec2f = computeIndirectShadow();
                                slab_diffuse_ibl *= vec3f(shadowValue.x);
                                slab_glossy_ibl *= vec3f(mix(pow(shadowValue.y, 4.0), shadowValue.x, specularAlphaG));
                            #endif
                        #endif
                    #else
                        slab_diffuse_ibl *= computeIndirectShadow().x;
                    #endif
                #endif
            `;
            }
            else {
                frag["CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifdef COLORED_IBL_SHADOWS
                        var shadowValue: vec3f = computeIndirectShadow();
                        color *= toGammaSpace(vec4f(shadowValue, 1.0f));
                    #else
                        var shadowValue: vec2f = computeIndirectShadow();
                        color *= toGammaSpace(vec4f(shadowValue.x, shadowValue.x, shadowValue.x, 1.0f));
                    #endif
                #endif
            `;
            }
        }
        else {
            frag = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                CUSTOM_FRAGMENT_DEFINITIONS: `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    uniform sampler2D iblShadowsTexture;
                #ifdef COLORED_IBL_SHADOWS
                    vec3 computeIndirectShadow() {
                        vec2 uv = gl_FragCoord.xy / renderTargetSize;
                        vec3 shadowValue = texture2D(iblShadowsTexture, uv).rgb;
                        return mix(shadowValue.rgb, vec3(1.0), 1.0 - shadowOpacity);
                    }
                #else
                    vec2 computeIndirectShadow() {
                        vec2 uv = gl_FragCoord.xy / renderTargetSize;
                        vec2 shadowValue = texture2D(iblShadowsTexture, uv).rg;
                        return mix(shadowValue.rg, vec2(1.0), 1.0 - shadowOpacity);
                    }
                #endif
                #endif
            `,
            };
            if (this._material instanceof PBRBaseMaterial) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                frag["CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifndef UNLIT
                        #ifdef REFLECTION
                            #ifdef COLORED_IBL_SHADOWS
                                vec3 shadowValue = computeIndirectShadow();
                                finalIrradiance.rgb *= shadowValue.rgb;
                                finalRadianceScaled *= mix(vec3(1.0), shadowValue.rgb, roughness);
                            #else
                                vec2 shadowValue = computeIndirectShadow();
                                finalIrradiance *= shadowValue.x;
                                finalRadianceScaled *= mix(pow(shadowValue.y, 4.0), shadowValue.x, roughness);
                            #endif
                        #endif
                    #else
                        finalDiffuse *= computeIndirectShadow().x;
                    #endif
                #endif
            `;
            }
            else if (this._material instanceof OpenPBRMaterial) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                frag["CUSTOM_FRAGMENT_BEFORE_IBLLAYERCOMPOSITION"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifndef UNLIT
                        #ifdef REFLECTION
                            #ifdef COLORED_IBL_SHADOWS
                                vec3 shadowValue = computeIndirectShadow();
                                slab_diffuse_ibl.rgb *= shadowValue.rgb;
                                slab_glossy_ibl *= mix(vec3(1.0), shadowValue.rgb, specularAlphaG);
                            #else
                                vec2 shadowValue = computeIndirectShadow();
                                slab_diffuse_ibl *= shadowValue.x;
                                slab_glossy_ibl *= mix(pow(shadowValue.y, 4.0), shadowValue.x, specularAlphaG);
                            #endif
                        #endif
                    #else
                        slab_diffuse_ibl *= computeIndirectShadow().x;
                    #endif
                #endif
            `;
            }
            else {
                frag["CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR"] = `
                #ifdef RENDER_WITH_IBL_SHADOWS
                    #ifdef COLORED_IBL_SHADOWS
                        vec3 shadowValue = computeIndirectShadow();
                        color.rgb *= toGammaSpace(shadowValue.rgb);
                    #else
                        vec2 shadowValue = computeIndirectShadow();
                        color.rgb *= toGammaSpace(shadowValue.x);
                    #endif
                #endif
            `;
            }
        }
        return shaderType === "vertex" ? null : frag;
    }
}
/**
 * Defines the name of the plugin.
 */
IBLShadowsPluginMaterial.Name = "IBLShadowsPluginMaterial";
__decorate([
    serialize()
], IBLShadowsPluginMaterial.prototype, "shadowOpacity", void 0);
__decorate([
    serialize(),
    expandToProperty("_markAllSubMeshesAsTexturesDirty")
], IBLShadowsPluginMaterial.prototype, "isEnabled", void 0);
RegisterClass(`BABYLON.IBLShadowsPluginMaterial`, IBLShadowsPluginMaterial);

/**
 * Voxel-based shadow rendering for IBL's.
 * This should not be instanciated directly, as it is part of a scene component
 */
class IblShadowsRenderPipeline extends PostProcessRenderPipeline {
    /**
     * Reset the shadow accumulation. This has a similar affect to lowering the remanence for a single frame.
     * This is useful when making a sudden change to the IBL.
     */
    resetAccumulation() {
        this._accumulationPass.reset = true;
    }
    /**
     * How dark the shadows appear. 1.0 is full opacity, 0.0 is no shadows.
     */
    get shadowOpacity() {
        return this._shadowOpacity;
    }
    set shadowOpacity(value) {
        this._shadowOpacity = value;
        this._setPluginParameters();
    }
    /**
     * Render the shadows in color rather than black and white.
     * This is slightly more expensive than black and white shadows but can be much
     * more accurate when the strongest lights in the IBL are non-white.
     */
    get coloredShadows() {
        return this._coloredShadows;
    }
    set coloredShadows(value) {
        this._coloredShadows = value;
        this._voxelTracingPass.coloredShadows = value;
        this._setPluginParameters();
    }
    /**
     * A multiplier for the render size of the shadows. Used for rendering lower-resolution shadows.
     */
    get shadowRenderSizeFactor() {
        return this._renderSizeFactor;
    }
    set shadowRenderSizeFactor(value) {
        this._renderSizeFactor = Math.max(Math.min(value, 1.0), 0.0);
        this._voxelTracingPass.resize(value);
        this._spatialBlurPass.resize(value);
        this._accumulationPass.resize(value);
        this._setPluginParameters();
    }
    /**
     * How dark the voxel shadows appear. 1.0 is full opacity, 0.0 is no shadows.
     */
    get voxelShadowOpacity() {
        return this._voxelTracingPass?.voxelShadowOpacity;
    }
    set voxelShadowOpacity(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.voxelShadowOpacity = value;
    }
    /**
     * How dark the screen-space shadows appear. 1.0 is full opacity, 0.0 is no shadows.
     */
    get ssShadowOpacity() {
        return this._voxelTracingPass?.ssShadowOpacity;
    }
    set ssShadowOpacity(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.ssShadowOpacity = value;
    }
    /**
     * The number of samples used in the screen space shadow pass.
     */
    get ssShadowSampleCount() {
        return this._voxelTracingPass?.sssSamples;
    }
    set ssShadowSampleCount(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.sssSamples = value;
    }
    /**
     * The stride of the screen-space shadow pass. This controls the distance between samples
     * in pixels.
     */
    get ssShadowStride() {
        return this._voxelTracingPass?.sssStride;
    }
    set ssShadowStride(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.sssStride = value;
    }
    /**
     * A scale for the maximum distance a screen-space shadow can be cast in world-space.
     * The maximum distance that screen-space shadows cast is derived from the voxel size
     * and this value so shouldn't need to change if you scale your scene
     */
    get ssShadowDistanceScale() {
        return this._sssMaxDistScale;
    }
    set ssShadowDistanceScale(value) {
        this._sssMaxDistScale = value;
        this._updateSsShadowParams();
    }
    /**
     * Screen-space shadow thickness scale. This value controls the assumed thickness of
     * on-screen surfaces in world-space. It scales with the size of the shadow-casting
     * region so shouldn't need to change if you scale your scene.
     */
    get ssShadowThicknessScale() {
        return this._sssThicknessScale;
    }
    set ssShadowThicknessScale(value) {
        this._sssThicknessScale = value;
        this._updateSsShadowParams();
    }
    /**
     * Returns the texture containing the voxel grid data
     * @returns The texture containing the voxel grid data
     * @internal
     */
    _getVoxelGridTexture() {
        const tex = this._voxelRenderer?.getVoxelGrid();
        if (tex && tex.isReady()) {
            return tex;
        }
        return this._dummyTexture3d;
    }
    /**
     * Returns the noise texture.
     * @returns The noise texture.
     * @internal
     */
    _getNoiseTexture() {
        const tex = this._noiseTexture;
        if (tex && tex.isReady()) {
            return tex;
        }
        return this._dummyTexture2d;
    }
    /**
     * Returns the voxel-tracing texture.
     * @returns The voxel-tracing texture.
     * @internal
     */
    _getVoxelTracingTexture() {
        const tex = this._voxelTracingPass?.getOutputTexture();
        if (tex && tex.isReady()) {
            return tex;
        }
        return this._dummyTexture2d;
    }
    /**
     * Returns the spatial blur texture.
     * @returns The spatial blur texture.
     * @internal
     */
    _getSpatialBlurTexture() {
        const tex = this._spatialBlurPass.getOutputTexture();
        if (tex && tex.isReady()) {
            return tex;
        }
        return this._dummyTexture2d;
    }
    /**
     * Returns the accumulated shadow texture.
     * @returns The accumulated shadow texture.
     * @internal
     */
    _getAccumulatedTexture() {
        const tex = this._accumulationPass?.getOutputTexture();
        if (tex && tex.isReady()) {
            return tex;
        }
        return this._dummyTexture2d;
    }
    /**
     * Turn on or off the debug view of the G-Buffer. This will display only the targets
     * of the g-buffer that are used by the shadow pipeline.
     */
    get gbufferDebugEnabled() {
        return this._gbufferDebugEnabled;
    }
    set gbufferDebugEnabled(enabled) {
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable G-Buffer debug view without setting allowDebugPasses to true.");
            return;
        }
        this._gbufferDebugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this._getGBufferDebugPass().name, this.cameras);
        }
        else {
            this._disableEffect(this._getGBufferDebugPass().name, this.cameras);
        }
    }
    /**
     * Turn on or off the debug view of the CDF importance sampling data
     */
    get cdfDebugEnabled() {
        return this.scene.iblCdfGenerator ? this.scene.iblCdfGenerator.debugEnabled : false;
    }
    /**
     * Turn on or off the debug view of the CDF importance sampling data
     */
    set cdfDebugEnabled(enabled) {
        if (!this.scene.iblCdfGenerator) {
            return;
        }
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable importance sampling debug view without setting allowDebugPasses to true.");
            return;
        }
        if (enabled === this.scene.iblCdfGenerator.debugEnabled) {
            return;
        }
        this.scene.iblCdfGenerator.debugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this.scene.iblCdfGenerator.debugPassName, this.cameras);
        }
        else {
            this._disableEffect(this.scene.iblCdfGenerator.debugPassName, this.cameras);
        }
    }
    /**
     * This displays the voxel grid in slices spread across the screen.
     * It also displays what slices of the model are stored in each layer
     * of the voxel grid. Each red stripe represents one layer while each gradient
     * (from bright red to black) represents the layers rendered in a single draw call.
     */
    get voxelDebugEnabled() {
        return this._voxelRenderer?.voxelDebugEnabled;
    }
    set voxelDebugEnabled(enabled) {
        if (!this._voxelRenderer) {
            return;
        }
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable voxel debug view without setting allowDebugPasses to true.");
            return;
        }
        this._voxelRenderer.voxelDebugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this._voxelRenderer.debugPassName, this.cameras);
        }
        else {
            this._disableEffect(this._voxelRenderer.debugPassName, this.cameras);
        }
    }
    /**
     * When using tri-planar voxelization (the default), this value can be used to
     * display only the voxelization result for that axis. z-axis = 0, y-axis = 1, x-axis = 2
     */
    get voxelDebugAxis() {
        return this._voxelRenderer?.voxelDebugAxis;
    }
    set voxelDebugAxis(axisNum) {
        if (!this._voxelRenderer) {
            return;
        }
        this._voxelRenderer.voxelDebugAxis = axisNum;
    }
    /**
     * Displays a given mip of the voxel grid. `voxelDebugAxis` must be undefined in this
     * case because we only generate mips for the combined voxel grid.
     */
    set voxelDebugDisplayMip(mipNum) {
        if (!this._voxelRenderer) {
            return;
        }
        this._voxelRenderer.setDebugMipNumber(mipNum);
    }
    /**
     * Display the debug view for just the shadow samples taken this frame.
     */
    get voxelTracingDebugEnabled() {
        return this._voxelTracingPass?.debugEnabled;
    }
    set voxelTracingDebugEnabled(enabled) {
        if (!this._voxelTracingPass) {
            return;
        }
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable voxel tracing debug view without setting allowDebugPasses to true.");
            return;
        }
        if (enabled === this._voxelTracingPass.debugEnabled) {
            return;
        }
        this._voxelTracingPass.debugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this._voxelTracingPass.debugPassName, this.cameras);
        }
        else {
            this._disableEffect(this._voxelTracingPass.debugPassName, this.cameras);
        }
    }
    /**
     * Display the debug view for the spatial blur pass
     */
    get spatialBlurPassDebugEnabled() {
        return this._spatialBlurPass.debugEnabled;
    }
    set spatialBlurPassDebugEnabled(enabled) {
        if (!this._spatialBlurPass) {
            return;
        }
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable spatial blur debug view without setting allowDebugPasses to true.");
            return;
        }
        if (enabled === this._spatialBlurPass.debugEnabled) {
            return;
        }
        this._spatialBlurPass.debugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this._spatialBlurPass.debugPassName, this.cameras);
        }
        else {
            this._disableEffect(this._spatialBlurPass.debugPassName, this.cameras);
        }
    }
    /**
     * Display the debug view for the shadows accumulated over time.
     */
    get accumulationPassDebugEnabled() {
        return this._accumulationPass?.debugEnabled;
    }
    set accumulationPassDebugEnabled(enabled) {
        if (!this._accumulationPass) {
            return;
        }
        if (enabled && !this.allowDebugPasses) {
            Logger.Warn("Can't enable accumulation pass debug view without setting allowDebugPasses to true.");
            return;
        }
        if (enabled === this._accumulationPass.debugEnabled) {
            return;
        }
        this._accumulationPass.debugEnabled = enabled;
        if (enabled) {
            this._enableEffect(this._accumulationPass.debugPassName, this.cameras);
        }
        else {
            this._disableEffect(this._accumulationPass.debugPassName, this.cameras);
        }
    }
    /**
     * Add a mesh to be used for shadow-casting in the IBL shadow pipeline.
     * These meshes will be written to the voxel grid.
     * @param mesh A mesh or list of meshes that you want to cast shadows
     */
    addShadowCastingMesh(mesh) {
        if (Array.isArray(mesh)) {
            for (const m of mesh) {
                if (m && this._shadowCastingMeshes.indexOf(m) === -1) {
                    this._shadowCastingMeshes.push(m);
                }
            }
        }
        else {
            if (mesh && this._shadowCastingMeshes.indexOf(mesh) === -1) {
                this._shadowCastingMeshes.push(mesh);
            }
        }
    }
    /**
     * Remove a mesh from the shadow-casting list. The mesh will no longer be written
     * to the voxel grid and will not cast shadows.
     * @param mesh The mesh or list of meshes that you don't want to cast shadows.
     */
    removeShadowCastingMesh(mesh) {
        if (Array.isArray(mesh)) {
            for (const m of mesh) {
                const index = this._shadowCastingMeshes.indexOf(m);
                if (index !== -1) {
                    this._shadowCastingMeshes.splice(index, 1);
                }
            }
        }
        else {
            const index = this._shadowCastingMeshes.indexOf(mesh);
            if (index !== -1) {
                this._shadowCastingMeshes.splice(index, 1);
            }
        }
    }
    /**
     * Clear the list of shadow-casting meshes. This will remove all meshes from the list
     */
    clearShadowCastingMeshes() {
        this._shadowCastingMeshes.length = 0;
    }
    /**
     * The exponent of the resolution of the voxel shadow grid. Higher resolutions will result in sharper
     * shadows but are more expensive to compute and require more memory.
     * The resolution is calculated as 2 to the power of this number.
     */
    get resolutionExp() {
        return this._voxelRenderer.voxelResolutionExp;
    }
    set resolutionExp(newResolution) {
        if (newResolution === this._voxelRenderer.voxelResolutionExp) {
            return;
        }
        if (this._voxelRenderer.isVoxelizationInProgress()) {
            Logger.Warn("Can't change the resolution of the voxel grid while voxelization is in progress.");
            return;
        }
        this._voxelRenderer.voxelResolutionExp = Math.max(1, Math.min(newResolution, 8));
        this._accumulationPass.reset = true;
    }
    /**
     * The number of different directions to sample during the voxel tracing pass
     */
    get sampleDirections() {
        return this._voxelTracingPass?.sampleDirections;
    }
    /**
     * The number of different directions to sample during the voxel tracing pass
     */
    set sampleDirections(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.sampleDirections = value;
    }
    /**
     * The decree to which the shadows persist between frames. 0.0 is no persistence, 1.0 is full persistence.
     **/
    get shadowRemanence() {
        return this._accumulationPass?.remanence;
    }
    /**
     * The decree to which the shadows persist between frames. 0.0 is no persistence, 1.0 is full persistence.
     **/
    set shadowRemanence(value) {
        if (!this._accumulationPass) {
            return;
        }
        this._accumulationPass.remanence = value;
    }
    /**
     * The global Y-axis rotation of the IBL for shadows. This should match the Y-rotation of the environment map applied to materials, skybox, etc.
     */
    get envRotation() {
        return this._voxelTracingPass?.envRotation;
    }
    /**
     * The global Y-axis rotation of the IBL for shadows. This should match the Y-rotation of the environment map applied to materials, skybox, etc.
     */
    set envRotation(value) {
        if (!this._voxelTracingPass) {
            return;
        }
        this._voxelTracingPass.envRotation = value;
        this._accumulationPass.reset = true;
    }
    /**
     * Allow debug passes to be enabled. Default is false.
     */
    get allowDebugPasses() {
        return this._allowDebugPasses;
    }
    /**
     * Allow debug passes to be enabled. Default is false.
     */
    set allowDebugPasses(value) {
        if (this._allowDebugPasses === value) {
            return;
        }
        this._allowDebugPasses = value;
        if (value && this.scene.iblCdfGenerator) {
            if (this.scene.iblCdfGenerator.isReady()) {
                this._createDebugPasses();
            }
            else {
                this.scene.iblCdfGenerator.onGeneratedObservable.addOnce(() => {
                    this._createDebugPasses();
                });
            }
        }
        else {
            this._disposeDebugPasses();
        }
    }
    /**
     *  Support test.
     */
    static get IsSupported() {
        const engine = EngineStore.LastCreatedEngine;
        if (!engine) {
            return false;
        }
        return engine._features.supportIBLShadows;
    }
    /**
     * Toggle the shadow tracing on or off
     * @param enabled Toggle the shadow tracing on or off
     */
    toggleShadow(enabled) {
        this._enabled = enabled;
        this._voxelTracingPass.enabled = enabled;
        this._spatialBlurPass.enabled = enabled;
        this._accumulationPass.enabled = enabled;
        for (const mat of this._materialsWithRenderPlugin) {
            if (mat.pluginManager) {
                const plugin = mat.pluginManager.getPlugin(IBLShadowsPluginMaterial.Name);
                plugin.isEnabled = enabled;
            }
        }
        this._setPluginParameters();
    }
    /**
     * Trigger the scene to be re-voxelized. This should be run when any shadow-casters have been added, removed or moved.
     */
    updateVoxelization() {
        if (this._shadowCastingMeshes.length === 0) {
            Logger.Warn("IBL Shadows: updateVoxelization called with no shadow-casting meshes to voxelize.");
            return;
        }
        this._voxelRenderer.updateVoxelGrid(this._shadowCastingMeshes);
        this._voxelRenderer.onVoxelizationCompleteObservable.addOnce(() => {
            this.onVoxelizationCompleteObservable.notifyObservers();
        });
        this._updateSsShadowParams();
    }
    /**
     * Trigger the scene bounds of shadow-casters to be calculated. This is the world size that the voxel grid will cover and will always be a cube.
     */
    updateSceneBounds() {
        const bounds = {
            min: new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE),
            max: new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE),
        };
        for (const mesh of this._shadowCastingMeshes) {
            const localBounds = mesh.getHierarchyBoundingVectors(true);
            bounds.min = Vector3.Minimize(bounds.min, localBounds.min);
            bounds.max = Vector3.Maximize(bounds.max, localBounds.max);
        }
        const size = bounds.max.subtract(bounds.min);
        this.voxelGridSize = Math.max(size.x, size.y, size.z);
        if (this._shadowCastingMeshes.length === 0 || !isFinite(this.voxelGridSize) || this.voxelGridSize === 0) {
            Logger.Warn("IBL Shadows: Scene size is invalid. Can't update bounds.");
            this.voxelGridSize = 1.0;
            return;
        }
        const halfSize = this.voxelGridSize / 2.0;
        const centre = bounds.max.add(bounds.min).multiplyByFloats(-0.5, -0.5, -0.5);
        const invWorldScaleMatrix = Matrix.Compose(new Vector3(1.0 / halfSize, 1.0 / halfSize, 1.0 / halfSize), new Quaternion(), new Vector3(0, 0, 0));
        const invTranslationMatrix = Matrix.Compose(new Vector3(1.0, 1.0, 1.0), new Quaternion(), centre);
        invTranslationMatrix.multiplyToRef(invWorldScaleMatrix, invWorldScaleMatrix);
        this._voxelTracingPass.setWorldScaleMatrix(invWorldScaleMatrix);
        this._voxelRenderer.setWorldScaleMatrix(invWorldScaleMatrix);
        // Set world scale for spatial blur.
        this._spatialBlurPass.setWorldScale(halfSize * 2.0);
        this._updateSsShadowParams();
    }
    /**
     * @param name The rendering pipeline name
     * @param scene The scene linked to this pipeline
     * @param options Options to configure the pipeline
     * @param cameras Cameras to apply the pipeline to.
     */
    constructor(name, scene, options = {}, cameras) {
        super(scene.getEngine(), name);
        this._allowDebugPasses = false;
        this._debugPasses = [];
        this._shadowCastingMeshes = [];
        this._shadowOpacity = 0.8;
        this._enabled = true;
        this._coloredShadows = false;
        this._materialsWithRenderPlugin = [];
        /**
         * Observable that triggers when the shadow renderer is ready
         */
        this.onShadowTextureReadyObservable = new Observable();
        /**
         * Observable that triggers when a new IBL is set and the importance sampling is ready
         */
        this.onNewIblReadyObservable = new Observable();
        /**
         * Observable that triggers when the voxelization is complete
         */
        this.onVoxelizationCompleteObservable = new Observable();
        /**
         * The current world-space size of that the voxel grid covers in the scene.
         */
        this.voxelGridSize = 1.0;
        this._renderSizeFactor = 1.0;
        this._gbufferDebugEnabled = false;
        this._gBufferDebugSizeParams = new Vector4(0.0, 0.0, 0.0, 0.0);
        this.scene = scene;
        this._cameras = cameras || [scene.activeCamera];
        // Create the dummy textures to be used when the pipeline is not ready
        const blackPixels = new Uint8Array([0, 0, 0, 255]);
        this._dummyTexture2d = new RawTexture(blackPixels, 1, 1, Engine.TEXTUREFORMAT_RGBA, scene, false);
        this._dummyTexture3d = new RawTexture3D(blackPixels, 1, 1, 1, Engine.TEXTUREFORMAT_RGBA, scene, false);
        // Setup the geometry buffer target formats
        const textureTypesAndFormats = {};
        textureTypesAndFormats[GeometryBufferRenderer.SCREENSPACE_DEPTH_TEXTURE_TYPE] = { textureFormat: Constants.TEXTUREFORMAT_R, textureType: Constants.TEXTURETYPE_FLOAT };
        textureTypesAndFormats[GeometryBufferRenderer.VELOCITY_LINEAR_TEXTURE_TYPE] = { textureFormat: Constants.TEXTUREFORMAT_RG, textureType: Constants.TEXTURETYPE_HALF_FLOAT };
        textureTypesAndFormats[GeometryBufferRenderer.POSITION_TEXTURE_TYPE] = { textureFormat: Constants.TEXTUREFORMAT_RGBA, textureType: Constants.TEXTURETYPE_HALF_FLOAT };
        textureTypesAndFormats[GeometryBufferRenderer.NORMAL_TEXTURE_TYPE] = { textureFormat: Constants.TEXTUREFORMAT_RGBA, textureType: Constants.TEXTURETYPE_HALF_FLOAT };
        const geometryBufferRenderer = scene.enableGeometryBufferRenderer(undefined, Constants.TEXTUREFORMAT_DEPTH32_FLOAT, textureTypesAndFormats);
        if (!geometryBufferRenderer) {
            Logger.Error("Geometry buffer renderer is required for IBL shadows to work.");
            return;
        }
        this._geometryBufferRenderer = geometryBufferRenderer;
        this._geometryBufferRenderer.enableScreenspaceDepth = true;
        this._geometryBufferRenderer.enableVelocityLinear = true;
        this._geometryBufferRenderer.enablePosition = true;
        this._geometryBufferRenderer.enableNormal = true;
        this._geometryBufferRenderer.generateNormalsInWorldSpace = true;
        this.scene.enableIblCdfGenerator();
        this.shadowOpacity = options.shadowOpacity || 0.8;
        this._voxelRenderer = new _IblShadowsVoxelRenderer(this.scene, this, options ? options.resolutionExp : 6, options.triPlanarVoxelization !== undefined ? options.triPlanarVoxelization : true);
        this._voxelTracingPass = new _IblShadowsVoxelTracingPass(this.scene, this);
        this._spatialBlurPass = new _IblShadowsSpatialBlurPass(this.scene, this);
        this._accumulationPass = new _IblShadowsAccumulationPass(this.scene, this);
        this._accumulationPass.onReadyObservable.addOnce(() => {
            this.onShadowTextureReadyObservable.notifyObservers();
        });
        this.sampleDirections = options.sampleDirections || 2;
        this.voxelShadowOpacity = options.voxelShadowOpacity ?? 1.0;
        this.envRotation = options.envRotation ?? 0.0;
        this.shadowRenderSizeFactor = options.shadowRenderSizeFactor || 1.0;
        this.ssShadowOpacity = options.ssShadowsEnabled === undefined || options.ssShadowsEnabled ? 1.0 : 0.0;
        this.ssShadowDistanceScale = options.ssShadowDistanceScale || 1.25;
        this.ssShadowSampleCount = options.ssShadowSampleCount || 16;
        this.ssShadowStride = options.ssShadowStride || 8;
        this.ssShadowThicknessScale = options.ssShadowThicknessScale || 1.0;
        this.shadowRemanence = options.shadowRemanence ?? 0.75;
        this._noiseTexture = new Texture("https://assets.babylonjs.com/textures/blue_noise/blue_noise_rgb.png", this.scene, false, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
        scene.postProcessRenderPipelineManager.addPipeline(this);
        this.scene.onActiveCameraChanged.add(this._listenForCameraChanges.bind(this));
        this.scene.onBeforeRenderObservable.add(this._updateBeforeRender.bind(this));
        this._listenForCameraChanges();
        this.scene.getEngine().onResizeObservable.add(this._handleResize.bind(this));
        // Assigning the shadow texture to the materials needs to be done after the RT's are created.
        if (this.scene.iblCdfGenerator) {
            this.scene.iblCdfGenerator.onGeneratedObservable.add(() => {
                this._setPluginParameters();
                this.onNewIblReadyObservable.notifyObservers();
            });
        }
    }
    _handleResize() {
        this._voxelRenderer.resize();
        this._voxelTracingPass.resize(this.shadowRenderSizeFactor);
        this._spatialBlurPass.resize(this.shadowRenderSizeFactor);
        this._accumulationPass.resize(this.shadowRenderSizeFactor);
        this._setPluginParameters();
    }
    _getGBufferDebugPass() {
        if (this._gbufferDebugPass) {
            return this._gbufferDebugPass;
        }
        const isWebGPU = this.engine.isWebGPU;
        const textureNames = ["depthSampler", "normalSampler", "positionSampler", "velocitySampler"];
        const options = {
            width: this.scene.getEngine().getRenderWidth(),
            height: this.scene.getEngine().getRenderHeight(),
            samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            engine: this.scene.getEngine(),
            textureType: Constants.TEXTURETYPE_UNSIGNED_BYTE,
            textureFormat: Constants.TEXTUREFORMAT_RGBA,
            uniforms: ["sizeParams"],
            samplers: textureNames,
            reusable: false,
            shaderLanguage: isWebGPU ? 1 /* ShaderLanguage.WGSL */ : 0 /* ShaderLanguage.GLSL */,
            extraInitializations: (useWebGPU, list) => {
                if (useWebGPU) {
                    list.push(import('./iblShadowGBufferDebug.fragment-DRWL13rT.esm.js'));
                }
                else {
                    list.push(import('./iblShadowGBufferDebug.fragment-lR1378Au.esm.js'));
                }
            },
        };
        this._gbufferDebugPass = new PostProcess("iblShadowGBufferDebug", "iblShadowGBufferDebug", options);
        if (this.engine.isWebGPU) {
            this._gbufferDebugPass.samples = this.engine.currentSampleCount ?? 1;
        }
        this._gbufferDebugPass.autoClear = false;
        this._gbufferDebugPass.onApplyObservable.add((effect) => {
            const depthIndex = this._geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.SCREENSPACE_DEPTH_TEXTURE_TYPE);
            effect.setTexture("depthSampler", this._geometryBufferRenderer.getGBuffer().textures[depthIndex]);
            const normalIndex = this._geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE);
            effect.setTexture("normalSampler", this._geometryBufferRenderer.getGBuffer().textures[normalIndex]);
            const positionIndex = this._geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.POSITION_TEXTURE_TYPE);
            effect.setTexture("positionSampler", this._geometryBufferRenderer.getGBuffer().textures[positionIndex]);
            const velocityIndex = this._geometryBufferRenderer.getTextureIndex(GeometryBufferRenderer.VELOCITY_LINEAR_TEXTURE_TYPE);
            effect.setTexture("velocitySampler", this._geometryBufferRenderer.getGBuffer().textures[velocityIndex]);
            effect.setVector4("sizeParams", this._gBufferDebugSizeParams);
            if (this.scene.activeCamera) {
                effect.setFloat("maxDepth", this.scene.activeCamera.maxZ);
            }
        });
        return this._gbufferDebugPass;
    }
    _createDebugPasses() {
        if (this.scene.iblCdfGenerator) {
            this._debugPasses = [{ pass: this.scene.iblCdfGenerator.getDebugPassPP(), enabled: this.cdfDebugEnabled }];
        }
        else {
            this._debugPasses = [];
        }
        this._debugPasses.push({ pass: this._voxelRenderer.getDebugPassPP(), enabled: this.voxelDebugEnabled }, { pass: this._voxelTracingPass.getDebugPassPP(), enabled: this.voxelTracingDebugEnabled }, { pass: this._spatialBlurPass.getDebugPassPP(), enabled: this.spatialBlurPassDebugEnabled }, { pass: this._accumulationPass.getDebugPassPP(), enabled: this.accumulationPassDebugEnabled }, { pass: this._getGBufferDebugPass(), enabled: this.gbufferDebugEnabled });
        for (let i = 0; i < this._debugPasses.length; i++) {
            if (!this._debugPasses[i].pass) {
                continue;
            }
            this.addEffect(new PostProcessRenderEffect(this.scene.getEngine(), this._debugPasses[i].pass.name, () => {
                return this._debugPasses[i].pass;
            }, true));
        }
        const cameras = this.cameras.slice();
        this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this.name, this.cameras);
        this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(this.name, cameras);
        for (let i = 0; i < this._debugPasses.length; i++) {
            if (!this._debugPasses[i].pass) {
                continue;
            }
            if (this._debugPasses[i].enabled) {
                this._enableEffect(this._debugPasses[i].pass.name, this.cameras);
            }
            else {
                this._disableEffect(this._debugPasses[i].pass.name, this.cameras);
            }
        }
    }
    _disposeEffectPasses() {
        this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this.name, this.cameras);
        this._disposeDebugPasses();
        this._reset();
    }
    _disposeDebugPasses() {
        for (let i = 0; i < this._debugPasses.length; i++) {
            this._disableEffect(this._debugPasses[i].pass.name, this.cameras);
            this._debugPasses[i].pass.dispose();
        }
        this._debugPasses = [];
    }
    _updateDebugPasses() {
        let count = 0;
        if (this._gbufferDebugEnabled) {
            count++;
        }
        if (this.cdfDebugEnabled) {
            count++;
        }
        if (this.voxelDebugEnabled) {
            count++;
        }
        if (this.voxelTracingDebugEnabled) {
            count++;
        }
        if (this.spatialBlurPassDebugEnabled) {
            count++;
        }
        if (this.accumulationPassDebugEnabled) {
            count++;
        }
        const rows = Math.ceil(Math.sqrt(count));
        const cols = Math.ceil(count / rows);
        const width = 1.0 / cols;
        const height = 1.0 / rows;
        let x = 0;
        let y = 0;
        if (this.gbufferDebugEnabled) {
            this._gBufferDebugSizeParams.set(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
        if (this.cdfDebugEnabled && this.scene.iblCdfGenerator) {
            this.scene.iblCdfGenerator.setDebugDisplayParams(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
        if (this.voxelDebugEnabled) {
            this._voxelRenderer.setDebugDisplayParams(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
        if (this.voxelTracingDebugEnabled) {
            this._voxelTracingPass.setDebugDisplayParams(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
        if (this.spatialBlurPassDebugEnabled) {
            this._spatialBlurPass.setDebugDisplayParams(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
        if (this.accumulationPassDebugEnabled) {
            this._accumulationPass.setDebugDisplayParams(x, y, cols, rows);
            x -= width;
            if (x <= -1) {
                x = 0;
                y -= height;
            }
        }
    }
    /**
     * Update the SS shadow max distance and thickness based on the voxel grid size and resolution.
     * The max distance should be just a little larger than the world size of a single voxel.
     */
    _updateSsShadowParams() {
        this._voxelTracingPass.sssMaxDist = (this._sssMaxDistScale * this.voxelGridSize) / (1 << this.resolutionExp);
        this._voxelTracingPass.sssThickness = this._sssThicknessScale * 0.005 * this.voxelGridSize;
    }
    /**
     * Apply the shadows to a material or array of materials. If no material is provided, all
     * materials in the scene will be added.
     * @param material Material that will be affected by the shadows. If not provided, all materials of the scene will be affected.
     */
    addShadowReceivingMaterial(material) {
        if (material) {
            if (Array.isArray(material)) {
                for (const m of material) {
                    this._addShadowSupportToMaterial(m);
                }
            }
            else {
                this._addShadowSupportToMaterial(material);
            }
        }
        else {
            for (const mat of this.scene.materials) {
                this._addShadowSupportToMaterial(mat);
            }
        }
    }
    /**
     * Remove a material from the list of materials that receive shadows. If no material
     * is provided, all materials in the scene will be removed.
     * @param material The material or array of materials that will no longer receive shadows
     */
    removeShadowReceivingMaterial(material) {
        if (Array.isArray(material)) {
            for (const m of material) {
                const matIndex = this._materialsWithRenderPlugin.indexOf(m);
                if (matIndex !== -1) {
                    this._materialsWithRenderPlugin.splice(matIndex, 1);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    const plugin = m.pluginManager?.getPlugin(IBLShadowsPluginMaterial.Name);
                    plugin.isEnabled = false;
                }
            }
        }
        else {
            const matIndex = this._materialsWithRenderPlugin.indexOf(material);
            if (matIndex !== -1) {
                this._materialsWithRenderPlugin.splice(matIndex, 1);
                const plugin = material.pluginManager.getPlugin(IBLShadowsPluginMaterial.Name);
                plugin.isEnabled = false;
            }
        }
    }
    /**
     * Clear the list of materials that receive shadows. This will remove all materials from the list
     */
    clearShadowReceivingMaterials() {
        for (const mat of this._materialsWithRenderPlugin) {
            const plugin = mat.pluginManager?.getPlugin(IBLShadowsPluginMaterial.Name);
            if (plugin) {
                plugin.isEnabled = false;
            }
        }
        this._materialsWithRenderPlugin.length = 0;
    }
    _addShadowSupportToMaterial(material) {
        if (!(material instanceof PBRBaseMaterial) && !(material instanceof StandardMaterial) && !(material instanceof OpenPBRMaterial)) {
            return;
        }
        let plugin = material.pluginManager?.getPlugin(IBLShadowsPluginMaterial.Name);
        if (!plugin) {
            plugin = new IBLShadowsPluginMaterial(material);
        }
        if (this._materialsWithRenderPlugin.indexOf(material) !== -1) {
            return;
        }
        if (this._enabled) {
            plugin.iblShadowsTexture = this._getAccumulatedTexture().getInternalTexture();
            plugin.shadowOpacity = this.shadowOpacity;
        }
        plugin.isEnabled = this._enabled;
        plugin.isColored = this._coloredShadows;
        this._materialsWithRenderPlugin.push(material);
    }
    _setPluginParameters() {
        if (!this._enabled) {
            return;
        }
        for (const mat of this._materialsWithRenderPlugin) {
            if (mat.pluginManager) {
                const plugin = mat.pluginManager.getPlugin(IBLShadowsPluginMaterial.Name);
                plugin.iblShadowsTexture = this._getAccumulatedTexture().getInternalTexture();
                plugin.shadowOpacity = this.shadowOpacity;
                plugin.isColored = this._coloredShadows;
            }
        }
    }
    _updateBeforeRender() {
        this._updateDebugPasses();
    }
    _listenForCameraChanges() {
        // We want to listen for camera changes and change settings while the camera is moving.
        this.scene.activeCamera?.onViewMatrixChangedObservable.add(() => {
            this._accumulationPass.isMoving = true;
        });
    }
    /**
     * Checks if the IBL shadow pipeline is ready to render shadows
     * @returns true if the IBL shadow pipeline is ready to render the shadows
     */
    isReady() {
        return (this._noiseTexture.isReady() &&
            this._voxelRenderer.isReady() &&
            this.scene.iblCdfGenerator &&
            this.scene.iblCdfGenerator.isReady() &&
            (!this._voxelTracingPass || this._voxelTracingPass.isReady()) &&
            (!this._spatialBlurPass || this._spatialBlurPass.isReady()) &&
            (!this._accumulationPass || this._accumulationPass.isReady()));
    }
    /**
     * Get the class name
     * @returns "IBLShadowsRenderPipeline"
     */
    getClassName() {
        return "IBLShadowsRenderPipeline";
    }
    /**
     * Disposes the IBL shadow pipeline and associated resources
     */
    dispose() {
        const materials = this._materialsWithRenderPlugin.splice(0);
        for (const mat of materials) {
            this.removeShadowReceivingMaterial(mat);
        }
        this._disposeEffectPasses();
        this._noiseTexture.dispose();
        this._voxelRenderer.dispose();
        this._voxelTracingPass.dispose();
        this._spatialBlurPass.dispose();
        this._accumulationPass.dispose();
        this._dummyTexture2d.dispose();
        this._dummyTexture3d.dispose();
        this.onNewIblReadyObservable.clear();
        this.onShadowTextureReadyObservable.clear();
        this.onVoxelizationCompleteObservable.clear();
        super.dispose();
    }
}

export { IblShadowsRenderPipeline };
//# sourceMappingURL=iblShadowsRenderPipeline-dlH87jF3.esm.js.map
