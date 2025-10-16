import { F as FlowGraphUnaryOperationBlock } from './flowGraphUnaryOperationBlock-DgF4mljY.esm.js';
import { f as RichTypeNumber, k as RichTypeFlowGraphInteger, b as FlowGraphInteger, h as RichTypeBoolean } from './declarationMapper-d0G7Kwmm.esm.js';
import { e as RegisterClass } from './index-PgAdAgf8.esm.js';
import './flowGraphCachedOperationBlock-CNtIoIoN.esm.js';
import './KHR_interactivity-BajhuLSt.esm.js';
import './objectModelMapping-CD1oJl7L.esm.js';

/**
 * A block that converts a boolean to a float.
 */
class FlowGraphBooleanToFloat extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeBoolean, RichTypeNumber, (a) => +a, "FlowGraphBooleanToFloat" /* FlowGraphBlockNames.BooleanToFloat */, config);
    }
}
RegisterClass("FlowGraphBooleanToFloat" /* FlowGraphBlockNames.BooleanToFloat */, FlowGraphBooleanToFloat);
/**
 * A block that converts a boolean to an integer
 */
class FlowGraphBooleanToInt extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeBoolean, RichTypeFlowGraphInteger, (a) => FlowGraphInteger.FromValue(+a), "FlowGraphBooleanToInt" /* FlowGraphBlockNames.BooleanToInt */, config);
    }
}
RegisterClass("FlowGraphBooleanToInt" /* FlowGraphBlockNames.BooleanToInt */, FlowGraphBooleanToInt);
/**
 * A block that converts a float to a boolean.
 */
class FlowGraphFloatToBoolean extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeNumber, RichTypeBoolean, (a) => !!a, "FlowGraphFloatToBoolean" /* FlowGraphBlockNames.FloatToBoolean */, config);
    }
}
RegisterClass("FlowGraphFloatToBoolean" /* FlowGraphBlockNames.FloatToBoolean */, FlowGraphFloatToBoolean);
/**
 * A block that converts an integer to a boolean.
 */
class FlowGraphIntToBoolean extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeFlowGraphInteger, RichTypeBoolean, (a) => !!a.value, "FlowGraphIntToBoolean" /* FlowGraphBlockNames.IntToBoolean */, config);
    }
}
RegisterClass("FlowGraphIntToBoolean" /* FlowGraphBlockNames.IntToBoolean */, FlowGraphIntToBoolean);
/**
 * A block that converts an integer to a float.
 */
class FlowGraphIntToFloat extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeFlowGraphInteger, RichTypeNumber, (a) => a.value, "FlowGraphIntToFloat" /* FlowGraphBlockNames.IntToFloat */, config);
    }
}
RegisterClass("FlowGraphIntToFloat" /* FlowGraphBlockNames.IntToFloat */, FlowGraphIntToFloat);
/**
 * A block that converts a float to an integer.
 */
class FlowGraphFloatToInt extends FlowGraphUnaryOperationBlock {
    constructor(config) {
        super(RichTypeNumber, RichTypeFlowGraphInteger, (a) => {
            const roundingMode = config?.roundingMode;
            switch (roundingMode) {
                case "floor":
                    return FlowGraphInteger.FromValue(Math.floor(a));
                case "ceil":
                    return FlowGraphInteger.FromValue(Math.ceil(a));
                case "round":
                    return FlowGraphInteger.FromValue(Math.round(a));
                default:
                    return FlowGraphInteger.FromValue(a);
            }
        }, "FlowGraphFloatToInt" /* FlowGraphBlockNames.FloatToInt */, config);
    }
}
RegisterClass("FlowGraphFloatToInt" /* FlowGraphBlockNames.FloatToInt */, FlowGraphFloatToInt);

export { FlowGraphBooleanToFloat, FlowGraphBooleanToInt, FlowGraphFloatToBoolean, FlowGraphFloatToInt, FlowGraphIntToBoolean, FlowGraphIntToFloat };
//# sourceMappingURL=flowGraphTypeToTypeBlocks-CNb2C6in.esm.js.map
