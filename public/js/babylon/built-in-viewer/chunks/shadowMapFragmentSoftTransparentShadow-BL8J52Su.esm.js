import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "shadowMapFragmentSoftTransparentShadow";
const shader = `#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;
// Sideeffect
if (!ShaderStore.IncludesShadersStore[name]) {
    ShaderStore.IncludesShadersStore[name] = shader;
}
/** @internal */
const shadowMapFragmentSoftTransparentShadow = { name, shader };

export { shadowMapFragmentSoftTransparentShadow };
//# sourceMappingURL=shadowMapFragmentSoftTransparentShadow-BL8J52Su.esm.js.map
