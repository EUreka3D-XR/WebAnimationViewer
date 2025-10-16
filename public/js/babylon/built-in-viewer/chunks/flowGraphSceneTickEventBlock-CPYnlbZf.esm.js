import { c as FlowGraphEventBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import { f as RichTypeNumber } from './declarationMapper-d0G7Kwmm.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * Block that triggers on scene tick (before each render).
 */
class FlowGraphSceneTickEventBlock extends FlowGraphEventBlock {
    constructor() {
        super();
        this.type = "SceneBeforeRender" /* FlowGraphEventType.SceneBeforeRender */;
        this.timeSinceStart = this.registerDataOutput("timeSinceStart", RichTypeNumber);
        this.deltaTime = this.registerDataOutput("deltaTime", RichTypeNumber);
    }
    /**
     * @internal
     */
    _preparePendingTasks(_context) {
        // no-op
    }
    /**
     * @internal
     */
    _executeEvent(context, payload) {
        this.timeSinceStart.setValue(payload.timeSinceStart, context);
        this.deltaTime.setValue(payload.deltaTime, context);
        this._execute(context);
        return true;
    }
    /**
     * @internal
     */
    _cancelPendingTasks(_context) {
        // no-op
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphSceneTickEventBlock" /* FlowGraphBlockNames.SceneTickEvent */;
    }
}
RegisterClass("FlowGraphSceneTickEventBlock" /* FlowGraphBlockNames.SceneTickEvent */, FlowGraphSceneTickEventBlock);

export { FlowGraphSceneTickEventBlock };
//# sourceMappingURL=flowGraphSceneTickEventBlock-CPYnlbZf.esm.js.map
