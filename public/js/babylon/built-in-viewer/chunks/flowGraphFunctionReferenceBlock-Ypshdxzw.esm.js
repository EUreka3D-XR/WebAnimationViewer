import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { s as RichTypeString, R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A flow graph block that takes a function name, an object and an optional context as inputs and calls the function on the object.
 */
class FlowGraphFunctionReferenceBlock extends FlowGraphBlock {
    constructor(
    /**
     * the configuration of the block
     */
    config) {
        super(config);
        this.functionName = this.registerDataInput("functionName", RichTypeString);
        this.object = this.registerDataInput("object", RichTypeAny);
        this.context = this.registerDataInput("context", RichTypeAny, null);
        this.output = this.registerDataOutput("output", RichTypeAny);
    }
    _updateOutputs(context) {
        const functionName = this.functionName.getValue(context);
        const object = this.object.getValue(context);
        const contextValue = this.context.getValue(context);
        if (object && functionName) {
            const func = object[functionName];
            if (func && typeof func === "function") {
                this.output.setValue(func.bind(contextValue), context);
            }
        }
    }
    getClassName() {
        return "FlowGraphFunctionReference" /* FlowGraphBlockNames.FunctionReference */;
    }
}
RegisterClass("FlowGraphFunctionReference" /* FlowGraphBlockNames.FunctionReference */, FlowGraphFunctionReferenceBlock);

export { FlowGraphFunctionReferenceBlock };
//# sourceMappingURL=flowGraphFunctionReferenceBlock-Ypshdxzw.esm.js.map
