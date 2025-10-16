import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * a glTF-based FlowGraph block that provides arrays with babylon object, based on the glTF tree
 * Can be used, for example, to get animation index from a glTF animation
 */
class FlowGraphGLTFDataProvider extends FlowGraphBlock {
    constructor(config) {
        super();
        const glTF = config.glTF;
        const animationGroups = glTF.animations?.map((a) => a._babylonAnimationGroup) || [];
        this.animationGroups = this.registerDataOutput("animationGroups", RichTypeAny, animationGroups);
        const nodes = glTF.nodes?.map((n) => n._babylonTransformNode) || [];
        this.nodes = this.registerDataOutput("nodes", RichTypeAny, nodes);
    }
    getClassName() {
        return "FlowGraphGLTFDataProvider";
    }
}

export { FlowGraphGLTFDataProvider };
//# sourceMappingURL=flowGraphGLTFDataProvider-QQ2FqF4B.esm.js.map
