import { GLTFLoader } from './glTFLoader-CKeTMOdS.esm.js';
import { bK as unregisterGLTFExtension, bJ as registerGLTFExtension } from './index-PgAdAgf8.esm.js';
import './bone-BoyFz1Xg.esm.js';
import './skeleton-DmAdgmh_.esm.js';
import './rawTexture-C1LxPWXb.esm.js';
import './assetContainer-DTFyVy0_.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

const NAME = "KHR_materials_anisotropy";
/**
 * [Specification](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_anisotropy)
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
class KHR_materials_anisotropy {
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
        this.order = 195;
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
            promises.push(this._loadAnisotropyPropertiesAsync(extensionContext, extension, babylonMaterial));
            await Promise.all(promises);
        });
    }
    async _loadAnisotropyPropertiesAsync(context, properties, babylonMaterial) {
        const adapter = this._loader._getOrCreateMaterialAdapter(babylonMaterial);
        const promises = new Array();
        // Set non-texture properties immediately
        const anisotropyWeight = properties.anisotropyStrength ?? 0;
        const anisotropyAngle = properties.anisotropyRotation ?? 0;
        adapter.specularRoughnessAnisotropy = anisotropyWeight;
        adapter.geometryTangentAngle = anisotropyAngle;
        // Check if this is glTF-style anisotropy
        const extensions = properties.extensions ?? {};
        if (!extensions.EXT_materials_anisotropy_openpbr || !extensions.EXT_materials_anisotropy_openpbr.openPbrAnisotropyEnabled) {
            adapter.configureGltfStyleAnisotropy(true);
        }
        // Load texture if present
        if (properties.anisotropyTexture) {
            properties.anisotropyTexture.nonColorData = true;
            promises.push(this._loader.loadTextureInfoAsync(`${context}/anisotropyTexture`, properties.anisotropyTexture, (texture) => {
                texture.name = `${babylonMaterial.name} (Anisotropy Intensity)`;
                adapter.geometryTangentTexture = texture;
            }));
        }
        await Promise.all(promises);
    }
}
unregisterGLTFExtension(NAME);
registerGLTFExtension(NAME, true, (loader) => new KHR_materials_anisotropy(loader));

export { KHR_materials_anisotropy };
//# sourceMappingURL=KHR_materials_anisotropy-BodJVVPQ.esm.js.map
