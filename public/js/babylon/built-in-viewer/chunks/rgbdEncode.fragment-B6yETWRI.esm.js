import { F as ShaderStore } from './index-PgAdAgf8.esm.js';
import './helperFunctions-BwqynSvG.esm.js';

// Do not edit.
const name = "rgbdEncodePixelShader";
const shader = `varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;
// Sideeffect
if (!ShaderStore.ShadersStore[name]) {
    ShaderStore.ShadersStore[name] = shader;
}
//# sourceMappingURL=rgbdEncode.fragment-B6yETWRI.esm.js.map
