import { EChartsExtensionInstallRegisters } from '../../extension';
import { axisBreakActionHander, axisBreakActionInfo } from './axisAction';

let installed = false;
export function install(registers: EChartsExtensionInstallRegisters) {
    if (installed) {
        return;
    }
    installed = true;

    registers.registerAction(axisBreakActionInfo, axisBreakActionHander);
}
