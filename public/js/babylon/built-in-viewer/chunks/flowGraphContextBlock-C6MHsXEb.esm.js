import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { R as RichTypeAny, f as RichTypeNumber } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that outputs elements from the context
 */
class FlowGraphContextBlock extends FlowGraphBlock {
    constructor(config) {
        super(config);
        this.userVariables = this.registerDataOutput("userVariables", RichTypeAny);
        this.executionId = this.registerDataOutput("executionId", RichTypeNumber);
    }
    _updateOutputs(context) {
        this.userVariables.setValue(context.userVariables, context);
        this.executionId.setValue(context.executionId, context);
    }
    serialize(serializationObject) {
        super.serialize(serializationObject);
    }
    getClassName() {
        return "FlowGraphContextBlock" /* FlowGraphBlockNames.Context */;
    }
}
RegisterClass("FlowGraphContextBlock" /* FlowGraphBlockNames.Context */, FlowGraphContextBlock);

export { FlowGraphContextBlock };
//# sourceMappingURL=flowGraphContextBlock-C6MHsXEb.esm.js.map
