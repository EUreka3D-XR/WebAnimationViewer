import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "logDepthDeclaration";
const shader = `#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`;
// Sideeffect
if (!ShaderStore.IncludesShadersStoreWGSL[name]) {
    ShaderStore.IncludesShadersStoreWGSL[name] = shader;
}
//# sourceMappingURL=logDepthDeclaration-D8K9Je9E.esm.js.map
