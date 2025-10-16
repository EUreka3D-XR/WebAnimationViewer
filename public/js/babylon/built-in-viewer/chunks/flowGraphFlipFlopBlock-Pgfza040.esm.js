import { k as FlowGraphExecutionBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { h as RichTypeBoolean } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * This block flip flops between two outputs.
 */
class FlowGraphFlipFlopBlock extends FlowGraphExecutionBlock {
    constructor(config) {
        super(config);
        this.onOn = this._registerSignalOutput("onOn");
        this.onOff = this._registerSignalOutput("onOff");
        this.value = this.registerDataOutput("value", RichTypeBoolean);
    }
    _execute(context, _callingSignal) {
        let value = context._getExecutionVariable(this, "value", typeof this.config?.startValue === "boolean" ? !this.config.startValue : false);
        value = !value;
        context._setExecutionVariable(this, "value", value);
        this.value.setValue(value, context);
        if (value) {
            this.onOn._activateSignal(context);
        }
        else {
            this.onOff._activateSignal(context);
        }
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphFlipFlopBlock" /* FlowGraphBlockNames.FlipFlop */;
    }
}
RegisterClass("FlowGraphFlipFlopBlock" /* FlowGraphBlockNames.FlipFlop */, FlowGraphFlipFlopBlock);

export { FlowGraphFlipFlopBlock };
//# sourceMappingURL=flowGraphFlipFlopBlock-Pgfza040.esm.js.map
