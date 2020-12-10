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

import {each, isArray, isObject, isTypedArray, defaults} from 'zrender/src/core/util';
import compatStyle from './helper/compatStyle';
import {normalizeToArray} from '../util/model';
import { Dictionary } from 'zrender/src/core/types';
import { ECUnitOption } from '../util/types';
import type { BarSeriesOption } from '../chart/bar/BarSeries';
import type { PieSeriesOption } from '../chart/pie/PieSeries';
import { deprecateLog, deprecateReplaceLog } from '../util/log';

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
    option && each(LAYOUT_PROPERTIES, function (prop) {
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

const BAR_ITEM_STYLE_MAP = [
    ['borderRadius', 'barBorderRadius'],
    ['borderColor', 'barBorderColor'],
    ['borderWidth', 'barBorderWidth']
];

function compatBarItemStyle(option: Dictionary<any>) {
    const itemStyle = option && option.itemStyle;
    if (itemStyle) {
        for (let i = 0; i < BAR_ITEM_STYLE_MAP.length; i++) {
            const oldName = BAR_ITEM_STYLE_MAP[i][1];
            const newName = BAR_ITEM_STYLE_MAP[i][0];
            if (itemStyle[oldName] != null) {
                itemStyle[newName] = itemStyle[oldName];
                if (__DEV__) {
                    deprecateReplaceLog(oldName, newName);
                }
            }
        }
    }
}

function compatPieLabel(option: Dictionary<any>) {
    if (!option) {
        return;
    }
    if (option.alignTo === 'edge' && option.margin != null && option.edgeDistance == null) {
        if (__DEV__) {
            deprecateReplaceLog('label.margin', 'label.edgeDistance', 'pie');
        }
        option.edgeDistance = option.margin;
    }
}

function compatSunburstState(option: Dictionary<any>) {
    if (!option) {
        return;
    }
    if (option.downplay && !option.blur) {
        option.blur = option.downplay;
        if (__DEV__) {
            deprecateReplaceLog('downplay', 'blur', 'sunburst');
        }
    }
}

function compatGraphFocus(option: Dictionary<any>) {
    if (!option) {
        return;
    }
    if (option.focusNodeAdjacency != null) {
        option.emphasis = option.emphasis || {};
        if (option.emphasis.focus == null) {
            if (__DEV__) {
                deprecateReplaceLog('focusNodeAdjacency', 'emphasis: { focus: \'adjacency\'}', 'graph/sankey');
            }
            option.emphasis.focus = 'adjacency';
        }
    }
}

function traverseTree(data: any[], cb: Function) {
    if (data) {
        for (let i = 0; i < data.length; i++) {
            cb(data[i]);
            data[i] && traverseTree(data[i].children, cb);
        }
    }
}

export default function globalBackwardCompat(option: ECUnitOption, isTheme?: boolean) {
    compatStyle(option, isTheme);

    // Make sure series array for model initialization.
    option.series = normalizeToArray(option.series);

    each(option.series, function (seriesOpt: any) {
        if (!isObject(seriesOpt)) {
            return;
        }

        const seriesType = seriesOpt.type;

        if (seriesType === 'line') {
            if (seriesOpt.clipOverflow != null) {
                seriesOpt.clip = seriesOpt.clipOverflow;
                if (__DEV__) {
                    deprecateReplaceLog('clipOverflow', 'clip', 'line');
                }
            }
        }
        else if (seriesType === 'pie' || seriesType === 'gauge') {
            if (seriesOpt.clockWise != null) {
                seriesOpt.clockwise = seriesOpt.clockWise;
                if (__DEV__) {
                    deprecateReplaceLog('clockWise', 'clockwise');
                }
            }
            compatPieLabel((seriesOpt as PieSeriesOption).label);
            const data = seriesOpt.data;
            if (data && !isTypedArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    compatPieLabel(data[i]);
                }
            }

            if (seriesOpt.hoverOffset != null) {
                seriesOpt.emphasis = seriesOpt.emphasis || {};
                if (seriesOpt.emphasis.scaleSize = null) {
                    if (__DEV__) {
                        deprecateReplaceLog('hoverOffset', 'emphasis.scaleSize');
                    }
                    seriesOpt.emphasis.scaleSize = seriesOpt.hoverOffset;
                }
            }
        }
        else if (seriesType === 'gauge') {
            const pointerColor = get(seriesOpt, 'pointer.color');
            pointerColor != null
                && set(seriesOpt, 'itemStyle.color', pointerColor);
        }
        else if (seriesType === 'bar') {
            compatBarItemStyle(seriesOpt);
            compatBarItemStyle((seriesOpt as BarSeriesOption).backgroundStyle);
            compatBarItemStyle(seriesOpt.emphasis);
            const data = seriesOpt.data;
            if (data && !isTypedArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    if (typeof data[i] === 'object') {
                        compatBarItemStyle(data[i]);
                        compatBarItemStyle(data[i] && data[i].emphasis);
                    }
                }
            }
        }
        else if (seriesType === 'sunburst') {
            const highlightPolicy = seriesOpt.highlightPolicy;
            if (highlightPolicy) {
                seriesOpt.emphasis = seriesOpt.emphasis || {};
                if (!seriesOpt.emphasis.focus) {
                    seriesOpt.emphasis.focus = highlightPolicy;
                    if (__DEV__) {
                        deprecateReplaceLog('highlightPolicy', 'emphasis.focus', 'sunburst');
                    }
                }
            }

            compatSunburstState(seriesOpt);

            traverseTree(seriesOpt.data, compatSunburstState);
        }
        else if (seriesType === 'graph' || seriesType === 'sankey') {
            compatGraphFocus(seriesOpt);
            // TODO nodes, edges?
        }
        else if (seriesType === 'map') {
            if (seriesOpt.mapType && !seriesOpt.map) {
                if (__DEV__) {
                    deprecateReplaceLog('mapType', 'map', 'map');
                }
                seriesOpt.map = seriesOpt.mapType;
            }
            if (seriesOpt.mapLocation) {
                if (__DEV__) {
                    deprecateLog('`mapLocation` is not used anymore.');
                }
                defaults(seriesOpt, seriesOpt.mapLocation);
            }
        }

        if (seriesOpt.hoverAnimation != null) {
            seriesOpt.emphasis = seriesOpt.emphasis || {};
            if (seriesOpt.emphasis && seriesOpt.emphasis.scale == null) {
                if (__DEV__) {
                    deprecateReplaceLog('hoverAnimation', 'emphasis.scale');
                }
                seriesOpt.emphasis.scale = seriesOpt.hoverAnimation;
            }
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