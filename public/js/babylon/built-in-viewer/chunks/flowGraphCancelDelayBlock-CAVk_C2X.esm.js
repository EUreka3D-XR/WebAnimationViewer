import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import { b as FlowGraphExecutionBlockWithOutSignal, g as getNumericValue } from './KHR_interactivity-BajhuLSt.esm.js';
import { k as RichTypeFlowGraphInteger } from './declarationMapper-d0G7Kwmm.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * This block cancels a delay that was previously scheduled.
 */
class FlowGraphCancelDelayBlock extends FlowGraphExecutionBlockWithOutSignal {
    constructor(config) {
        super(config);
        this.delayIndex = this.registerDataInput("delayIndex", RichTypeFlowGraphInteger);
    }
    _execute(context, _callingSignal) {
        const delayIndex = getNumericValue(this.delayIndex.getValue(context));
        if (delayIndex <= 0 || isNaN(delayIndex) || !isFinite(delayIndex)) {
            return this._reportError(context, "Invalid delay index");
        }
        const timers = context._getGlobalContextVariable("pendingDelays", []);
        const timer = timers[delayIndex];
        if (timer) {
            timer.dispose();
            // not removing it from the array. Disposing it will clear all of its resources
        }
        // activate the out output flow
        this.out._activateSignal(context);
    }
    getClassName() {
        return "FlowGraphCancelDelayBlock" /* FlowGraphBlockNames.CancelDelay */;
    }
}
RegisterClass("FlowGraphCancelDelayBlock" /* FlowGraphBlockNames.CancelDelay */, FlowGraphCancelDelayBlock);

export { FlowGraphCancelDelayBlock };
//# sourceMappingURL=flowGraphCancelDelayBlock-CAVk_C2X.esm.js.map
