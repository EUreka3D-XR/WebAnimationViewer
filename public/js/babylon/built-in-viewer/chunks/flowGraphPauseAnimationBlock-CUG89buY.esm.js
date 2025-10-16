import { b as FlowGraphExecutionBlockWithOutSignal } from './KHR_interactivity-BajhuLSt.esm.js';
import { R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * @experimental
 * Block that pauses a running animation
 */
class FlowGraphPauseAnimationBlock extends FlowGraphExecutionBlockWithOutSignal {
    constructor(config) {
        super(config);
        this.animationToPause = this.registerDataInput("animationToPause", RichTypeAny);
    }
    _execute(context) {
        const animationToPauseValue = this.animationToPause.getValue(context);
        animationToPauseValue.pause();
        this.out._activateSignal(context);
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphPauseAnimationBlock" /* FlowGraphBlockNames.PauseAnimation */;
    }
}
RegisterClass("FlowGraphPauseAnimationBlock" /* FlowGraphBlockNames.PauseAnimation */, FlowGraphPauseAnimationBlock);

export { FlowGraphPauseAnimationBlock };
//# sourceMappingURL=flowGraphPauseAnimationBlock-CUG89buY.esm.js.map
