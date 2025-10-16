import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "logDepthDeclaration";
const shader = `#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;
// Sideeffect
if (!ShaderStore.IncludesShadersStore[name]) {
    ShaderStore.IncludesShadersStore[name] = shader;
}
//# sourceMappingURL=logDepthDeclaration-CTEbXhzO.esm.js.map
