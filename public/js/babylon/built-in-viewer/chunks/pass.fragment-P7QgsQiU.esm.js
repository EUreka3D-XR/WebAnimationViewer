import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "passPixelShader";
const shader = `varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;
// Sideeffect
if (!ShaderStore.ShadersStoreWGSL[name]) {
    ShaderStore.ShadersStoreWGSL[name] = shader;
}
/** @internal */
const passPixelShaderWGSL = { name, shader };

export { passPixelShaderWGSL };
//# sourceMappingURL=pass.fragment-P7QgsQiU.esm.js.map
