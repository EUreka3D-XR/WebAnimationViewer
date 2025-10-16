import { F as ShaderStore } from './index-PgAdAgf8.esm.js';
import './helperFunctions-BwqynSvG.esm.js';
import './hdrFilteringFunctions-CeqhRnv3.esm.js';
import './pbrBRDFFunctions-DxVnda8_.esm.js';

// Do not edit.
const name = "iblDominantDirectionPixelShader";
const shader = `precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;
// Sideeffect
if (!ShaderStore.ShadersStore[name]) {
    ShaderStore.ShadersStore[name] = shader;
}
/** @internal */
const iblDominantDirectionPixelShader = { name, shader };

export { iblDominantDirectionPixelShader };
//# sourceMappingURL=iblDominantDirection.fragment-KFEYoF4m.esm.js.map
