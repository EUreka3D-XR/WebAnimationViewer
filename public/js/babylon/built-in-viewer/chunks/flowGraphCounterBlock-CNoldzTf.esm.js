import { f as RichTypeNumber } from './declarationMapper-d0G7Kwmm.esm.js';
import { b as FlowGraphExecutionBlockWithOutSignal } from './KHR_interactivity-BajhuLSt.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that counts the number of times it has been called.
 * Afterwards it activates its out signal.
 */
class FlowGraphCallCounterBlock extends FlowGraphExecutionBlockWithOutSignal {
    constructor(config) {
        super(config);
        this.count = this.registerDataOutput("count", RichTypeNumber);
        this.reset = this._registerSignalInput("reset");
    }
    _execute(context, callingSignal) {
        if (callingSignal === this.reset) {
            context._setExecutionVariable(this, "count", 0);
            this.count.setValue(0, context);
            return;
        }
        const countValue = context._getExecutionVariable(this, "count", 0) + 1;
        context._setExecutionVariable(this, "count", countValue);
        this.count.setValue(countValue, context);
        this.out._activateSignal(context);
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphCallCounterBlock" /* FlowGraphBlockNames.CallCounter */;
    }
}
RegisterClass("FlowGraphCallCounterBlock" /* FlowGraphBlockNames.CallCounter */, FlowGraphCallCounterBlock);

export { FlowGraphCallCounterBlock };
//# sourceMappingURL=flowGraphCounterBlock-CNoldzTf.esm.js.map
