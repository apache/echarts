import type { AxisBaseModel } from '../../coord/AxisBaseModel';
import type { EChartsExtensionInstallRegisters } from '../../extension';
import {
    axisBreakActionInfo,
    axisBreakRevertActionInfo
} from './axisAction';

let installed = false;
export function install(registers: EChartsExtensionInstallRegisters) {
    if (installed) {
        return;
    }
    installed = true;

    registers.registerAction(axisBreakActionInfo, function (payload, ecModel) {
        const breaks = payload.breaks;
        if (breaks && breaks.length > 0) {
            ecModel.eachComponent(
                {mainType: 'xAxis'},
                function (axisModel: AxisBaseModel) {
                    if (axisModel.axis) {
                        axisModel.axis.scale.expandBreaks(breaks);
                    }
                }
            );
            ecModel.eachComponent(
                {mainType: 'yAxis'},
                function (axisModel: AxisBaseModel) {
                    if (axisModel.axis) {
                        axisModel.axis.scale.expandBreaks(breaks);
                    }
                }
            );
        }
    });

    registers.registerAction(axisBreakRevertActionInfo, function (payload, ecModel) {
        ecModel.eachComponent(
            {mainType: 'xAxis'},
            function (axisModel: AxisBaseModel) {
                if (axisModel.axis) {
                    axisModel.axis.scale.revertBreaks();
                }
            }
        );
        ecModel.eachComponent(
            {mainType: 'yAxis'},
            function (axisModel: AxisBaseModel) {
                if (axisModel.axis) {
                    axisModel.axis.scale.revertBreaks();
                }
            }
        );
    });
}
