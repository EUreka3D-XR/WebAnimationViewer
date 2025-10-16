import { GLTFLoader } from './glTFLoader-CKeTMOdS.esm.js';
import { bK as unregisterGLTFExtension, bJ as registerGLTFExtension } from './index-PgAdAgf8.esm.js';
import './bone-BoyFz1Xg.esm.js';
import './skeleton-DmAdgmh_.esm.js';
import './rawTexture-C1LxPWXb.esm.js';
import './assetContainer-DTFyVy0_.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

const NAME = "KHR_materials_ior";
/**
 * [Specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_ior/README.md)
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
class KHR_materials_ior {
    /**
     * @internal
     */
    constructor(loader) {
        /**
         * The name of this extension.
         */
        this.name = NAME;
        /**
         * Defines a number that determines the order the extensions are applied.
         */
        this.order = 180;
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(NAME);
    }
    /** @internal */
    dispose() {
        this._loader = null;
    }
    /**
     * @internal
     */
    // eslint-disable-next-line no-restricted-syntax
    loadMaterialPropertiesAsync(context, material, babylonMaterial) {
        return GLTFLoader.LoadExtensionAsync(context, material, this.name, async (extensionContext, extension) => {
            const promises = new Array();
            promises.push(this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial));
            promises.push(this._loadIorPropertiesAsync(extensionContext, extension, babylonMaterial));
            // eslint-disable-next-line github/no-then
            return await Promise.all(promises).then(() => { });
        });
    }
    // eslint-disable-next-line @typescript-eslint/promise-function-async, no-restricted-syntax
    _loadIorPropertiesAsync(context, properties, babylonMaterial) {
        const adapter = this._loader._getOrCreateMaterialAdapter(babylonMaterial);
        const indexOfRefraction = properties.ior !== undefined ? properties.ior : KHR_materials_ior._DEFAULT_IOR;
        adapter.specularIor = indexOfRefraction;
        return Promise.resolve();
    }
}
/**
 * Default ior Value from the spec.
 */
KHR_materials_ior._DEFAULT_IOR = 1.5;
unregisterGLTFExtension(NAME);
registerGLTFExtension(NAME, true, (loader) => new KHR_materials_ior(loader));

export { KHR_materials_ior };
//# sourceMappingURL=KHR_materials_ior-Ba_5Zk2r.esm.js.map
