import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import { k as FlowGraphExecutionBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import './declarationMapper-d0G7Kwmm.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that executes its output flows in sequence.
 */
class FlowGraphSequenceBlock extends FlowGraphExecutionBlock {
    constructor(
    /**
     * the configuration of the block
     */
    config) {
        super(config);
        this.config = config;
        /**
         * The output flows.
         */
        this.executionSignals = [];
        this.setNumberOfOutputSignals(this.config.outputSignalCount);
    }
    _execute(context) {
        for (let i = 0; i < this.executionSignals.length; i++) {
            this.executionSignals[i]._activateSignal(context);
        }
    }
    /**
     * Sets the block's output flows. Would usually be passed from the constructor but can be changed afterwards.
     * @param outputSignalCount the number of output flows
     */
    setNumberOfOutputSignals(outputSignalCount = 1) {
        // check the size of the outFlow Array, see if it is not larger than needed
        while (this.executionSignals.length > outputSignalCount) {
            const flow = this.executionSignals.pop();
            if (flow) {
                flow.disconnectFromAll();
                this._unregisterSignalOutput(flow.name);
            }
        }
        while (this.executionSignals.length < outputSignalCount) {
            this.executionSignals.push(this._registerSignalOutput(`out_${this.executionSignals.length}`));
        }
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphSequenceBlock" /* FlowGraphBlockNames.Sequence */;
    }
}
RegisterClass("FlowGraphSequenceBlock" /* FlowGraphBlockNames.Sequence */, FlowGraphSequenceBlock);

export { FlowGraphSequenceBlock };
//# sourceMappingURL=flowGraphSequenceBlock-BZh78M2B.esm.js.map
