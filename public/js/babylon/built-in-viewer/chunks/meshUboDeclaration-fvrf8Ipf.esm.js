import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "meshUboDeclaration";
const shader = `struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;
// Sideeffect
if (!ShaderStore.IncludesShadersStoreWGSL[name]) {
    ShaderStore.IncludesShadersStoreWGSL[name] = shader;
}
//# sourceMappingURL=meshUboDeclaration-fvrf8Ipf.esm.js.map
