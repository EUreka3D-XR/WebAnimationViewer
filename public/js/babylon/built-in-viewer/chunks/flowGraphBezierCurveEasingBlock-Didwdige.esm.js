import { ck as BezierCurveEase, e as RegisterClass } from './index-PgAdAgf8.esm.js';
import { F as FlowGraphBlock } from './KHR_interactivity-BajhuLSt.esm.js';
import { f as RichTypeNumber, n as RichTypeVector2, R as RichTypeAny } from './declarationMapper-d0G7Kwmm.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * An easing block that generates a BezierCurveEase easingFunction object based on the data provided.
 */
class FlowGraphBezierCurveEasingBlock extends FlowGraphBlock {
    constructor(
    /**
     * the configuration of the block
     */
    config) {
        super(config);
        this.config = config;
        /**
         * Internal cache of reusable easing functions.
         * key is type-mode-properties
         */
        this._easingFunctions = {};
        this.mode = this.registerDataInput("mode", RichTypeNumber, 0);
        this.controlPoint1 = this.registerDataInput("controlPoint1", RichTypeVector2);
        this.controlPoint2 = this.registerDataInput("controlPoint2", RichTypeVector2);
        this.easingFunction = this.registerDataOutput("easingFunction", RichTypeAny);
    }
    _updateOutputs(context) {
        const mode = this.mode.getValue(context);
        const controlPoint1 = this.controlPoint1.getValue(context);
        const controlPoint2 = this.controlPoint2.getValue(context);
        if (mode === undefined) {
            return;
        }
        const key = `${mode}-${controlPoint1.x}-${controlPoint1.y}-${controlPoint2.x}-${controlPoint2.y}`;
        if (!this._easingFunctions[key]) {
            const easing = new BezierCurveEase(controlPoint1.x, controlPoint1.y, controlPoint2.x, controlPoint2.y);
            easing.setEasingMode(mode);
            this._easingFunctions[key] = easing;
        }
        this.easingFunction.setValue(this._easingFunctions[key], context);
    }
    getClassName() {
        return "FlowGraphBezierCurveEasing" /* FlowGraphBlockNames.BezierCurveEasing */;
    }
}
RegisterClass("FlowGraphBezierCurveEasing" /* FlowGraphBlockNames.BezierCurveEasing */, FlowGraphBezierCurveEasingBlock);

export { FlowGraphBezierCurveEasingBlock };
//# sourceMappingURL=flowGraphBezierCurveEasingBlock-Didwdige.esm.js.map
