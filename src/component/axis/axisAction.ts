import { Payload } from '../../util/types';

export interface AxisBreakPayload extends Payload {
    // Add any specific payload properties if needed
}

export const axisBreakActionInfo = {
    type: 'axisBreakExpand',
    event: 'axisBreakExpanded',
    update: 'update'
};

export const axisBreakRevertActionInfo = {
    type: 'axisBreakRevert',
    event: 'axisBreakReverted',
    update: 'update'
};
