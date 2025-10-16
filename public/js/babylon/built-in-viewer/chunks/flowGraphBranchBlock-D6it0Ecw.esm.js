import { h as RichTypeBoolean } from './declarationMapper-d0G7Kwmm.esm.js';
import { k as FlowGraphExecutionBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that evaluates a condition and activates one of two branches.
 */
class FlowGraphBranchBlock extends FlowGraphExecutionBlock {
    constructor(config) {
        super(config);
        this.condition = this.registerDataInput("condition", RichTypeBoolean);
        this.onTrue = this._registerSignalOutput("onTrue");
        this.onFalse = this._registerSignalOutput("onFalse");
    }
    _execute(context) {
        if (this.condition.getValue(context)) {
            this.onTrue._activateSignal(context);
        }
        else {
            this.onFalse._activateSignal(context);
        }
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphBranchBlock" /* FlowGraphBlockNames.Branch */;
    }
}
RegisterClass("FlowGraphBranchBlock" /* FlowGraphBlockNames.Branch */, FlowGraphBranchBlock);

export { FlowGraphBranchBlock };
//# sourceMappingURL=flowGraphBranchBlock-D6it0Ecw.esm.js.map
