import { c as FlowGraphEventBlock, _ as _IsDescendantOf } from './KHR_interactivity-BajhuLSt.esm.js';
import { f as RichTypeNumber, R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A pointe out event block.
 * This block can be used as an entry pointer to when a pointer is out of a specific target mesh.
 */
class FlowGraphPointerOutEventBlock extends FlowGraphEventBlock {
    constructor(config) {
        super(config);
        this.type = "PointerOut" /* FlowGraphEventType.PointerOut */;
        this.pointerId = this.registerDataOutput("pointerId", RichTypeNumber);
        this.targetMesh = this.registerDataInput("targetMesh", RichTypeAny, config?.targetMesh);
        this.meshOutOfPointer = this.registerDataOutput("meshOutOfPointer", RichTypeAny);
    }
    _executeEvent(context, payload) {
        const mesh = this.targetMesh.getValue(context);
        this.meshOutOfPointer.setValue(payload.mesh, context);
        this.pointerId.setValue(payload.pointerId, context);
        const skipEvent = payload.over && _IsDescendantOf(payload.mesh, mesh);
        if (!skipEvent && (payload.mesh === mesh || _IsDescendantOf(payload.mesh, mesh))) {
            this._execute(context);
            return !this.config?.stopPropagation;
        }
        return true;
    }
    _preparePendingTasks(_context) {
        // no-op
    }
    _cancelPendingTasks(_context) {
        // no-op
    }
    getClassName() {
        return "FlowGraphPointerOutEventBlock" /* FlowGraphBlockNames.PointerOutEvent */;
    }
}
RegisterClass("FlowGraphPointerOutEventBlock" /* FlowGraphBlockNames.PointerOutEvent */, FlowGraphPointerOutEventBlock);

export { FlowGraphPointerOutEventBlock };
//# sourceMappingURL=flowGraphPointerOutEventBlock-Bf6xbQLu.esm.js.map
