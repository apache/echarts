import { each } from 'zrender/src/core/util';
import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type { EChartsExtensionInstallRegisters } from '../../extension';
import { parseFinder } from '../../util/model';
import {
    AxisBreakPayload,
    axisBreakUpdateActionInfo
} from './axisAction';

export function install(registers: EChartsExtensionInstallRegisters) {

    registers.registerAction(axisBreakUpdateActionInfo, function (payload: AxisBreakPayload, ecModel) {
        const finderResult = parseFinder(ecModel, payload);
        each(finderResult.xAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
        each(finderResult.yAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
        each(finderResult.singleAxisModels, (axisModel: AxisBaseModel) => axisModel.updateAxisBreaks(payload.breaks));
    });
}
