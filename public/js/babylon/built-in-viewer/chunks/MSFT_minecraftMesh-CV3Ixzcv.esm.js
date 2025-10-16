import { GLTFLoader } from './glTFLoader-CKeTMOdS.esm.js';
import { bK as unregisterGLTFExtension, bJ as registerGLTFExtension } from './index-PgAdAgf8.esm.js';
import './bone-BoyFz1Xg.esm.js';
import './skeleton-DmAdgmh_.esm.js';
import './rawTexture-C1LxPWXb.esm.js';
import './assetContainer-DTFyVy0_.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

const NAME = "MSFT_minecraftMesh";
/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
class MSFT_minecraftMesh {
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
    /** @internal */
    // eslint-disable-next-line no-restricted-syntax
    loadMaterialPropertiesAsync(context, material, babylonMaterial) {
        return GLTFLoader.LoadExtraAsync(context, material, this.name, async (extraContext, extra) => {
            if (extra) {
                if (!this._loader._pbrMaterialImpl) {
                    throw new Error(`${extraContext}: Material type not supported`);
                }
                const promise = this._loader.loadMaterialPropertiesAsync(context, material, babylonMaterial);
                if (babylonMaterial.needAlphaBlending()) {
                    babylonMaterial.forceDepthWrite = true;
                    babylonMaterial.separateCullingPass = true;
                }
                babylonMaterial.backFaceCulling = babylonMaterial.forceDepthWrite;
                babylonMaterial.twoSidedLighting = true;
                return await promise;
            }
        });
    }
}
unregisterGLTFExtension(NAME);
registerGLTFExtension(NAME, true, (loader) => new MSFT_minecraftMesh(loader));

export { MSFT_minecraftMesh };
//# sourceMappingURL=MSFT_minecraftMesh-CV3Ixzcv.esm.js.map
