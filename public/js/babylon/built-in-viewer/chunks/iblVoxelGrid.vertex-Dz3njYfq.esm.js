import { F as ShaderStore } from './index-PgAdAgf8.esm.js';
import './bonesVertex-R-9EJnAY.esm.js';
import './bakedVertexAnimation-BCzIGyHM.esm.js';
import './instancesDeclaration-CTNjdMag.esm.js';
import './morphTargetsVertex-BILAe6dj.esm.js';

// Do not edit.
const name = "iblVoxelGridVertexShader";
const shader = `attribute position: vec3f;varying vNormalizedPosition: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
uniform invWorldScale: mat4x4f;uniform viewMatrix: mat4x4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated=vertexInputs.position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
let worldPos=finalWorld*vec4f(positionUpdated,1.0);vertexOutputs.position=uniforms.viewMatrix*uniforms.invWorldScale*worldPos;vertexOutputs.vNormalizedPosition=vertexOutputs.position.xyz*0.5+0.5;
#ifdef IS_NDC_HALF_ZRANGE
vertexOutputs.position=vec4f(vertexOutputs.position.x,vertexOutputs.position.y,vertexOutputs.position.z*0.5+0.5,vertexOutputs.position.w);
#endif
}
`;
// Sideeffect
if (!ShaderStore.ShadersStoreWGSL[name]) {
    ShaderStore.ShadersStoreWGSL[name] = shader;
}
/** @internal */
const iblVoxelGridVertexShaderWGSL = { name, shader };

export { iblVoxelGridVertexShaderWGSL };
//# sourceMappingURL=iblVoxelGrid.vertex-Dz3njYfq.esm.js.map
