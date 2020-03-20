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

// Compatitable with 2.0

import {each, isArray, isObject} from 'zrender/src/core/util';
import compatStyle from './helper/compatStyle';
import {normalizeToArray} from '../util/model';
import { Dictionary } from 'zrender/src/core/types';
import { ECUnitOption, SeriesOption } from '../util/types';

function get(opt: Dictionary<any>, path: string): any {
    const pathArr = path.split(',');
    let obj = opt;
    for (let i = 0; i < pathArr.length; i++) {
        obj = obj && obj[pathArr[i]];
        if (obj == null) {
            break;
        }
    }
    return obj;
}

function set(opt: Dictionary<any>, path: string, val: any, overwrite?: boolean) {
    const pathArr = path.split(',');
    let obj = opt;
    let key;
    let i = 0;
    for (; i < pathArr.length - 1; i++) {
        key = pathArr[i];
        if (obj[key] == null) {
            obj[key] = {};
        }
        obj = obj[key];
    }
    if (overwrite || obj[pathArr[i]] == null) {
        obj[pathArr[i]] = val;
    }
}

function compatLayoutProperties(option: Dictionary<any>) {
    each(LAYOUT_PROPERTIES, function (prop) {
        if (prop[0] in option && !(prop[1] in option)) {
            option[prop[1]] = option[prop[0]];
        }
    });
}

const LAYOUT_PROPERTIES = [
    ['x', 'left'], ['y', 'top'], ['x2', 'right'], ['y2', 'bottom']
];

const COMPATITABLE_COMPONENTS = [
    'grid', 'geo', 'parallel', 'legend', 'toolbox', 'title', 'visualMap', 'dataZoom', 'timeline'
];

export default function (option: ECUnitOption, isTheme?: boolean) {
    compatStyle(option, isTheme);

    // Make sure series array for model initialization.
    option.series = normalizeToArray(option.series);

    each(option.series, function (seriesOpt: SeriesOption) {
        if (!isObject(seriesOpt)) {
            return;
        }

        let seriesType = seriesOpt.type;

        if (seriesType === 'line') {
            // @ts-ignore
            if (seriesOpt.clipOverflow != null) {
                // @ts-ignore
                seriesOpt.clip = seriesOpt.clipOverflow;
            }
        }
        else if (seriesType === 'pie' || seriesType === 'gauge') {
            // @ts-ignore
            if (seriesOpt.clockWise != null) {
                // @ts-ignore
                seriesOpt.clockwise = seriesOpt.clockWise;
            }
        }
        else if (seriesType === 'gauge') {
            let pointerColor = get(seriesOpt, 'pointer.color');
            pointerColor != null
                && set(seriesOpt, 'itemStyle.color', pointerColor);
        }

        compatLayoutProperties(seriesOpt);
    });

    // dataRange has changed to visualMap
    if (option.dataRange) {
        option.visualMap = option.dataRange;
    }

    each(COMPATITABLE_COMPONENTS, function (componentName) {
        let options = option[componentName];
        if (options) {
            if (!isArray(options)) {
                options = [options];
            }
            each(options, function (option) {
                compatLayoutProperties(option);
            });
        }
    });
}