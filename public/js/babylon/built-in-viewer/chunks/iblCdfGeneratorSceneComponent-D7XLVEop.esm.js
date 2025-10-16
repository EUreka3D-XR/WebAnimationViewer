import { j as SceneComponentConstants, k as Scene } from './index-PgAdAgf8.esm.js';
import { I as IblCdfGenerator } from './iblCdfGenerator-MM_ZMInZ.esm.js';
import './rawTexture-C1LxPWXb.esm.js';

Object.defineProperty(Scene.prototype, "iblCdfGenerator", {
    get: function () {
        return this._iblCdfGenerator;
    },
    set: function (value) {
        if (value) {
            this._iblCdfGenerator = value;
        }
    },
    enumerable: true,
    configurable: true,
});
Scene.prototype.enableIblCdfGenerator = function () {
    if (this._iblCdfGenerator) {
        return this._iblCdfGenerator;
    }
    this._iblCdfGenerator = new IblCdfGenerator(this);
    if (!this._iblCdfGenerator.isSupported) {
        this._iblCdfGenerator = null;
        return null;
    }
    if (this.environmentTexture) {
        this._iblCdfGenerator.iblSource = this.environmentTexture;
    }
    return this._iblCdfGenerator;
};
Scene.prototype.disableIblCdfGenerator = function () {
    if (!this._iblCdfGenerator) {
        return;
    }
    this._iblCdfGenerator.dispose();
    this._iblCdfGenerator = null;
};
/**
 * Defines the IBL CDF Generator scene component responsible for generating CDF maps for a given IBL.
 */
class IblCdfGeneratorSceneComponent {
    /**
     * Creates a new instance of the component for the given scene
     * @param scene Defines the scene to register the component in
     */
    constructor(scene) {
        /**
         * The component name helpful to identify the component in the list of scene components.
         */
        this.name = SceneComponentConstants.NAME_IBLCDFGENERATOR;
        this._newIblObserver = null;
        this.scene = scene;
    }
    /**
     * Registers the component in a given scene
     */
    register() {
        this._updateIblSource();
        this._newIblObserver = this.scene.onEnvironmentTextureChangedObservable.add(this._updateIblSource.bind(this));
    }
    /**
     * Rebuilds the elements related to this component in case of
     * context lost for instance.
     */
    rebuild() {
        // Nothing to do for this component
    }
    /**
     * Disposes the component and the associated resources
     */
    dispose() {
        this.scene.onEnvironmentTextureChangedObservable.remove(this._newIblObserver);
    }
    _updateIblSource() {
        if (this.scene.iblCdfGenerator && this.scene.environmentTexture) {
            this.scene.iblCdfGenerator.iblSource = this.scene.environmentTexture;
        }
    }
}
IblCdfGenerator._SceneComponentInitialization = (scene) => {
    // Register the CDF generator component to the scene.
    let component = scene._getComponent(SceneComponentConstants.NAME_IBLCDFGENERATOR);
    if (!component) {
        component = new IblCdfGeneratorSceneComponent(scene);
        scene._addComponent(component);
    }
};

export { IblCdfGeneratorSceneComponent };
//# sourceMappingURL=iblCdfGeneratorSceneComponent-D7XLVEop.esm.js.map
