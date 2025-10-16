import { GLTFLoader, ArrayItem } from './glTFLoader-CKeTMOdS.esm.js';
import { bK as unregisterGLTFExtension, bJ as registerGLTFExtension } from './index-PgAdAgf8.esm.js';
import './bone-BoyFz1Xg.esm.js';
import './skeleton-DmAdgmh_.esm.js';
import './rawTexture-C1LxPWXb.esm.js';
import './assetContainer-DTFyVy0_.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

const NAME = "EXT_texture_webp";
/**
 * [Specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_texture_webp/README.md)
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
class EXT_texture_webp {
    /**
     * @internal
     */
    constructor(loader) {
        /** The name of this extension. */
        this.name = NAME;
        this._loader = loader;
        this.enabled = loader.isExtensionUsed(NAME);
    }
    /** @internal */
    dispose() {
        this._loader = null;
    }
    /**
     * @internal
     */
    // eslint-disable-next-line no-restricted-syntax
    _loadTextureAsync(context, texture, assign) {
        return GLTFLoader.LoadExtensionAsync(context, texture, this.name, async (extensionContext, extension) => {
            const sampler = texture.sampler == undefined ? GLTFLoader.DefaultSampler : ArrayItem.Get(`${context}/sampler`, this._loader.gltf.samplers, texture.sampler);
            const image = ArrayItem.Get(`${extensionContext}/source`, this._loader.gltf.images, extension.source);
            return await this._loader._createTextureAsync(context, sampler, image, (babylonTexture) => {
                assign(babylonTexture);
            }, undefined, !texture._textureInfo.nonColorData);
        });
    }
}
unregisterGLTFExtension(NAME);
registerGLTFExtension(NAME, true, (loader) => new EXT_texture_webp(loader));

export { EXT_texture_webp };
//# sourceMappingURL=EXT_texture_webp-eYaqYFIA.esm.js.map
