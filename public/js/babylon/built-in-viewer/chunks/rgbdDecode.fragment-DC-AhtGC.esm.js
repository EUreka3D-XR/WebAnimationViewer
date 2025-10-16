import { F as ShaderStore } from './index-PgAdAgf8.esm.js';
import './helperFunctions-BwqynSvG.esm.js';

// Do not edit.
const name = "rgbdDecodePixelShader";
const shader = `varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;
// Sideeffect
if (!ShaderStore.ShadersStore[name]) {
    ShaderStore.ShadersStore[name] = shader;
}
//# sourceMappingURL=rgbdDecode.fragment-DC-AhtGC.esm.js.map
