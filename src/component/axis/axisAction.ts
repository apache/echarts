import { noop } from 'zrender/src/core/util';
import { EChartsExtensionInstallRegisters } from '../../extension';
import { Payload } from '../../util/types';
import GlobalModel from '../../model/Global';

export function installAxisAction(registers: EChartsExtensionInstallRegisters) {
    registers.registerAction({
        type: 'axisBreakExpand',
        update: 'update'
    }, noop);
}

export const axisBreakActionInfo = {
    type: 'axisBreakExpand',
    event: 'axisBreakChanged',
    update: 'update'
};

export const axisBreakActionHander = function (payload: Payload, ecModel: GlobalModel) {
    // ecModel.eachComponent((componentType, model) => {
    //     if (componentType.toLocaleLowerCase().indexOf('axis') >= 0) {
    //     }
    // });
};
