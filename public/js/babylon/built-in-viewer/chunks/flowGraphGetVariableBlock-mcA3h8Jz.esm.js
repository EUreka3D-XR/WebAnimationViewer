import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that gets the value of a variable.
 * Variables are an stored in the context of the flow graph.
 */
class FlowGraphGetVariableBlock extends FlowGraphBlock {
    /**
     * Construct a FlowGraphGetVariableBlock.
     * @param config construction parameters
     */
    constructor(config) {
        super(config);
        this.config = config;
        // The output connection has to have the name of the variable.
        this.value = this.registerDataOutput("value", RichTypeAny, config.initialValue);
    }
    /**
     * @internal
     */
    _updateOutputs(context) {
        const variableNameValue = this.config.variable;
        if (context.hasVariable(variableNameValue)) {
            this.value.setValue(context.getVariable(variableNameValue), context);
        }
    }
    /**
     * Serializes this block
     * @param serializationObject the object to serialize to
     */
    serialize(serializationObject) {
        super.serialize(serializationObject);
        serializationObject.config.variable = this.config.variable;
    }
    getClassName() {
        return "FlowGraphGetVariableBlock" /* FlowGraphBlockNames.GetVariable */;
    }
}
RegisterClass("FlowGraphGetVariableBlock" /* FlowGraphBlockNames.GetVariable */, FlowGraphGetVariableBlock);

export { FlowGraphGetVariableBlock };
//# sourceMappingURL=flowGraphGetVariableBlock-mcA3h8Jz.esm.js.map
