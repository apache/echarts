import { ModelFinderIdQuery, ModelFinderIndexQuery, ModelFinderNameQuery } from '../../util/model';
import { Payload, ScaleBreakOption, ScaleBreakOptionIdentifier } from '../../util/types';

export interface AxisBreakPayload extends Payload {
    xAxisIndex?: ModelFinderIndexQuery,
    xAxisId?: ModelFinderIdQuery,
    xAxisName?: ModelFinderNameQuery
    yAxisIndex?: ModelFinderIndexQuery,
    yAxisId?: ModelFinderIdQuery,
    yAxisName?: ModelFinderNameQuery,
    singleAxisIndex?: ModelFinderIndexQuery,
    singleAxisId?: ModelFinderIdQuery,
    singleAxisName?: ModelFinderNameQuery,

    breaks: AxisBreakPayloadBreak[];
}
export type AxisBreakPayloadBreak = ScaleBreakOptionIdentifier & Pick<ScaleBreakOption, 'isExpanded'>;

export const axisBreakUpdateActionInfo = {
    type: 'updateAxisBreak',
    event: 'axisBreakUpdated',
    update: 'update'
};
