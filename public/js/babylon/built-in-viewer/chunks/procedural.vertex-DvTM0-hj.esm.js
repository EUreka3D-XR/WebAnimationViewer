import { F as ShaderStore } from './index-PgAdAgf8.esm.js';

// Do not edit.
const name = "proceduralVertexShader";
const shader = `attribute vec2 position;varying vec2 vPosition;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vPosition=position;vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;
// Sideeffect
if (!ShaderStore.ShadersStore[name]) {
    ShaderStore.ShadersStore[name] = shader;
}
/** @internal */
const proceduralVertexShader = { name, shader };

export { proceduralVertexShader };
//# sourceMappingURL=procedural.vertex-DvTM0-hj.esm.js.map
