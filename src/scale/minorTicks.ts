/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import { round } from '../util/number';
import { ParsedAxisBreakList } from '../util/types';
import { getScaleBreakHelper } from './break';
import { getIntervalPrecision } from './helper';
import Scale from './Scale';


export function getMinorTicks(
    scale: Scale,
    splitNumber: number,
    breaks: ParsedAxisBreakList,
    scaleInterval: number
): number[][] {
    const ticks = scale.getTicks({
        expandToNicedExtent: true,
    });
    // NOTE: In log-scale, do not support minor ticks when breaks exist.
    //  because currently log-scale minor ticks is calculated based on raw values
    //  rather than log-transformed value, due to an odd effect when breaks exist.
    const minorTicks = [];
    const extent = scale.getExtent();

    for (let i = 1; i < ticks.length; i++) {
        const nextTick = ticks[i];
        const prevTick = ticks[i - 1];

        if (prevTick.break || nextTick.break) {
            // Do not build minor ticks to the adjacent ticks to breaks ticks,
            // since the interval might be irregular.
            continue;
        }

        let count = 0;
        const minorTicksGroup = [];
        const interval = nextTick.value - prevTick.value;
        const minorInterval = interval / splitNumber;
        const minorIntervalPrecision = getIntervalPrecision(minorInterval);

        while (count < splitNumber - 1) {
            const minorTick = round(prevTick.value + (count + 1) * minorInterval, minorIntervalPrecision);

            // For the first and last interval. The count may be less than splitNumber.
            if (minorTick > extent[0] && minorTick < extent[1]) {
                minorTicksGroup.push(minorTick);
            }
            count++;
        }

        const scaleBreakHelper = getScaleBreakHelper();
        scaleBreakHelper && scaleBreakHelper.pruneTicksByBreak(
            'auto',
            minorTicksGroup,
            breaks,
            value => value,
            scaleInterval,
            extent
        );
        minorTicks.push(minorTicksGroup);
    }

    return minorTicks;
}
