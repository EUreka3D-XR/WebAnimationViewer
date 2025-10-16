import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { R as RichTypeAny, k as RichTypeFlowGraphInteger, b as FlowGraphInteger } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * This block takes an object as input and an array and returns the index of the object in the array.
 */
class FlowGraphIndexOfBlock extends FlowGraphBlock {
    /**
     * Construct a FlowGraphIndexOfBlock.
     * @param config construction parameters
     */
    constructor(config) {
        super(config);
        this.config = config;
        this.object = this.registerDataInput("object", RichTypeAny);
        this.array = this.registerDataInput("array", RichTypeAny);
        this.index = this.registerDataOutput("index", RichTypeFlowGraphInteger, new FlowGraphInteger(-1));
    }
    /**
     * @internal
     */
    _updateOutputs(context) {
        const object = this.object.getValue(context);
        const array = this.array.getValue(context);
        if (array) {
            this.index.setValue(new FlowGraphInteger(array.indexOf(object)), context);
        }
    }
    /**
     * Serializes this block
     * @param serializationObject the object to serialize to
     */
    serialize(serializationObject) {
        super.serialize(serializationObject);
    }
    getClassName() {
        return "FlowGraphIndexOfBlock" /* FlowGraphBlockNames.IndexOf */;
    }
}
RegisterClass("FlowGraphIndexOfBlock" /* FlowGraphBlockNames.IndexOf */, FlowGraphIndexOfBlock);

export { FlowGraphIndexOfBlock };
//# sourceMappingURL=flowGraphIndexOfBlock-nilaj01o.esm.js.map
