import { GLTFLoader } from './glTFLoader-CKeTMOdS.esm.js';
import { bK as unregisterGLTFExtension, bJ as registerGLTFExtension } from './index-PgAdAgf8.esm.js';
import './bone-BoyFz1Xg.esm.js';
import './skeleton-DmAdgmh_.esm.js';
import './rawTexture-C1LxPWXb.esm.js';
import './assetContainer-DTFyVy0_.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

const NAME = "MSFT_sRGBFactors";
/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
class MSFT_sRGBFactors {
    /** @internal */
    constructor(loader) {
        /** @internal */
        this.name = NAME;
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(NAME);
    }
    /** @internal */
    dispose() {
        this._loader = null;
    }
    /** @internal*/
    // eslint-disable-next-line no-restricted-syntax
    loadMaterialPropertiesAsync(context, material, babylonMaterial) {
        return GLTFLoader.LoadExtraAsync(context, material, this.name, async (extraContext, extra) => {
            if (extra) {
                const adapter = this._loader._getOrCreateMaterialAdapter(babylonMaterial);
                const promise = this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                const useExactSrgbConversions = babylonMaterial.getScene().getEngine().useExactSrgbConversions;
                if (!adapter.baseColorTexture) {
                    adapter.baseColor.toLinearSpaceToRef(adapter.baseColor, useExactSrgbConversions);
                }
                if (!adapter.specularColorTexture) {
                    adapter.specularColor.toLinearSpaceToRef(adapter.specularColor, useExactSrgbConversions);
                }
                return await promise;
            }
        });
    }
}
unregisterGLTFExtension(NAME);
registerGLTFExtension(NAME, true, (loader) => new MSFT_sRGBFactors(loader));

export { MSFT_sRGBFactors };
//# sourceMappingURL=MSFT_sRGBFactors-bd2i3NOL.esm.js.map
