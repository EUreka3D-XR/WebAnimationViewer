import { c as FlowGraphEventBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './declarationMapper-d0G7Kwmm.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * Block that triggers when a scene is ready.
 */
class FlowGraphSceneReadyEventBlock extends FlowGraphEventBlock {
    constructor() {
        super(...arguments);
        this.initPriority = -1;
        this.type = "SceneReady" /* FlowGraphEventType.SceneReady */;
    }
    _executeEvent(context, _payload) {
        this._execute(context);
        return true;
    }
    _preparePendingTasks(context) {
        // no-op
    }
    _cancelPendingTasks(context) {
        // no-op
    }
    /**
     * @returns class name of the block.
     */
    getClassName() {
        return "FlowGraphSceneReadyEventBlock" /* FlowGraphBlockNames.SceneReadyEvent */;
    }
}
RegisterClass("FlowGraphSceneReadyEventBlock" /* FlowGraphBlockNames.SceneReadyEvent */, FlowGraphSceneReadyEventBlock);

export { FlowGraphSceneReadyEventBlock };
//# sourceMappingURL=flowGraphSceneReadyEventBlock-Dz5pvLAJ.esm.js.map
