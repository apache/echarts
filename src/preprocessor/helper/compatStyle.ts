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

import * as zrUtil from 'zrender/src/core/util';
import * as modelUtil from '../../util/model';
import { Dictionary } from 'zrender/src/core/types';
import { deprecateLog, deprecateReplaceLog } from '../../util/log';

const each = zrUtil.each;
const isObject = zrUtil.isObject;

const POSSIBLE_STYLES = [
    'areaStyle', 'lineStyle', 'nodeStyle', 'linkStyle',
    'chordStyle', 'label', 'labelLine'
];


function compatEC2ItemStyle(opt: Dictionary<any>) {
    const itemStyleOpt = opt && opt.itemStyle;
    if (!itemStyleOpt) {
        return;
    }
    for (let i = 0, len = POSSIBLE_STYLES.length; i < len; i++) {
        const styleName = POSSIBLE_STYLES[i];
        const normalItemStyleOpt = itemStyleOpt.normal;
        const emphasisItemStyleOpt = itemStyleOpt.emphasis;
        if (normalItemStyleOpt && normalItemStyleOpt[styleName]) {
            if (__DEV__) {
                deprecateReplaceLog(`itemStyle.normal.${styleName}`, styleName);
            }
            opt[styleName] = opt[styleName] || {};
            if (!opt[styleName].normal) {
                opt[styleName].normal = normalItemStyleOpt[styleName];
            }
            else {
                zrUtil.merge(opt[styleName].normal, normalItemStyleOpt[styleName]);
            }
            normalItemStyleOpt[styleName] = null;
        }
        if (emphasisItemStyleOpt && emphasisItemStyleOpt[styleName]) {
            if (__DEV__) {
                deprecateReplaceLog(`itemStyle.emphasis.${styleName}`, `emphasis.${styleName}`);
            }
            opt[styleName] = opt[styleName] || {};
            if (!opt[styleName].emphasis) {
                opt[styleName].emphasis = emphasisItemStyleOpt[styleName];
            }
            else {
                zrUtil.merge(opt[styleName].emphasis, emphasisItemStyleOpt[styleName]);
            }
            emphasisItemStyleOpt[styleName] = null;
        }
    }
}

function convertNormalEmphasis(opt: Dictionary<any>, optType: string, useExtend?: boolean) {
    if (opt && opt[optType] && (opt[optType].normal || opt[optType].emphasis)) {
        const normalOpt = opt[optType].normal;
        const emphasisOpt = opt[optType].emphasis;

        if (normalOpt) {
            if (__DEV__) {
                // eslint-disable-next-line max-len
                deprecateLog(`'normal' hierarchy in ${optType} has been removed since 4.0. All style properties are configured in ${optType} directly now.`);
            }
            // Timeline controlStyle has other properties besides normal and emphasis
            if (useExtend) {
                opt[optType].normal = opt[optType].emphasis = null;
                zrUtil.defaults(opt[optType], normalOpt);
            }
            else {
                opt[optType] = normalOpt;
            }
        }
        if (emphasisOpt) {
            if (__DEV__) {
                deprecateLog(`${optType}.emphasis has been changed to emphasis.${optType} since 4.0`);
            }
            opt.emphasis = opt.emphasis || {};
            opt.emphasis[optType] = emphasisOpt;

            // Also compat the case user mix the style and focus together in ec3 style
            // for example: { itemStyle: { normal: {}, emphasis: {focus, shadowBlur} } }
            if (emphasisOpt.focus) {
                opt.emphasis.focus = emphasisOpt.focus;
            }
            if (emphasisOpt.blurScope) {
                opt.emphasis.blurScope = emphasisOpt.blurScope;
            }
        }
    }
}

function removeEC3NormalStatus(opt: Dictionary<any>) {
    convertNormalEmphasis(opt, 'itemStyle');
    convertNormalEmphasis(opt, 'lineStyle');
    convertNormalEmphasis(opt, 'areaStyle');
    convertNormalEmphasis(opt, 'label');
    convertNormalEmphasis(opt, 'labelLine');
    // treemap
    convertNormalEmphasis(opt, 'upperLabel');
    // graph
    convertNormalEmphasis(opt, 'edgeLabel');
}

function compatTextStyle(opt: any, propName: string) {
    // Check whether is not object (string\null\undefined ...)
    const labelOptSingle = isObject(opt) && opt[propName];
    const textStyle = isObject(labelOptSingle) && labelOptSingle.textStyle;
    if (textStyle) {
        if (__DEV__) {
            // eslint-disable-next-line max-len
            deprecateLog(`textStyle hierarchy in ${propName} has been removed since 4.0. All textStyle properties are configured in ${propName} directly now.`);
        }
        for (let i = 0, len = modelUtil.TEXT_STYLE_OPTIONS.length; i < len; i++) {
            const textPropName = modelUtil.TEXT_STYLE_OPTIONS[i];
            if (textStyle.hasOwnProperty(textPropName)) {
                labelOptSingle[textPropName] = textStyle[textPropName];
            }
        }
    }
}

function compatEC3CommonStyles(opt: Dictionary<any>) {
    if (opt) {
        removeEC3NormalStatus(opt);
        compatTextStyle(opt, 'label');
        opt.emphasis && compatTextStyle(opt.emphasis, 'label');
    }
}

function processSeries(seriesOpt: any) {
    if (!isObject(seriesOpt)) {
        return;
    }

    compatEC2ItemStyle(seriesOpt);
    removeEC3NormalStatus(seriesOpt);

    compatTextStyle(seriesOpt, 'label');
    // treemap
    compatTextStyle(seriesOpt, 'upperLabel');
    // graph
    compatTextStyle(seriesOpt, 'edgeLabel');
    if (seriesOpt.emphasis) {
        compatTextStyle(seriesOpt.emphasis, 'label');
        // treemap
        compatTextStyle(seriesOpt.emphasis, 'upperLabel');
        // graph
        compatTextStyle(seriesOpt.emphasis, 'edgeLabel');
    }

    let markPoint = seriesOpt.markPoint;
    if (markPoint) {
        compatEC2ItemStyle(markPoint);
        compatEC3CommonStyles(markPoint);
    }

    let markLine = seriesOpt.markLine;
    if (markLine) {
        compatEC2ItemStyle(markLine);
        compatEC3CommonStyles(markLine);
    }

    const markArea = seriesOpt.markArea;
    if (markArea) {
        compatEC3CommonStyles(markArea);
    }

    let data = seriesOpt.data;

    // Break with ec3: if `setOption` again, there may be no `type` in option,
    // then the backward compat based on option type will not be performed.

    if (seriesOpt.type === 'graph') {
        data = data || seriesOpt.nodes;
        const edgeData = seriesOpt.links || seriesOpt.edges;
        if (edgeData && !zrUtil.isTypedArray(edgeData)) {
            for (let i = 0; i < edgeData.length; i++) {
                compatEC3CommonStyles(edgeData[i]);
            }
        }
        zrUtil.each(seriesOpt.categories, function (opt) {
            removeEC3NormalStatus(opt);
        });
    }

    if (data && !zrUtil.isTypedArray(data)) {
        for (let i = 0; i < data.length; i++) {
            compatEC3CommonStyles(data[i]);
        }
    }

    // mark point data
    markPoint = seriesOpt.markPoint;
    if (markPoint && markPoint.data) {
        const mpData = markPoint.data;
        for (let i = 0; i < mpData.length; i++) {
            compatEC3CommonStyles(mpData[i]);
        }
    }
    // mark line data
    markLine = seriesOpt.markLine;
    if (markLine && markLine.data) {
        const mlData = markLine.data;
        for (let i = 0; i < mlData.length; i++) {
            if (zrUtil.isArray(mlData[i])) {
                compatEC3CommonStyles(mlData[i][0]);
                compatEC3CommonStyles(mlData[i][1]);
            }
            else {
                compatEC3CommonStyles(mlData[i]);
            }
        }
    }

    // Series
    if (seriesOpt.type === 'gauge') {
        compatTextStyle(seriesOpt, 'axisLabel');
        compatTextStyle(seriesOpt, 'title');
        compatTextStyle(seriesOpt, 'detail');
    }
    else if (seriesOpt.type === 'treemap') {
        convertNormalEmphasis(seriesOpt.breadcrumb, 'itemStyle');
        zrUtil.each(seriesOpt.levels, function (opt) {
            removeEC3NormalStatus(opt);
        });
    }
    else if (seriesOpt.type === 'tree') {
        removeEC3NormalStatus(seriesOpt.leaves);
    }
    // sunburst starts from ec4, so it does not need to compat levels.
}

function toArr(o: any) {
    return zrUtil.isArray(o) ? o : o ? [o] : [];
}

function toObj(o: any) {
    return (zrUtil.isArray(o) ? o[0] : o) || {};
}

export default function globalCompatStyle(option: any, isTheme?: boolean) {
    each(toArr(option.series), function (seriesOpt) {
        isObject(seriesOpt) && processSeries(seriesOpt);
    });

    const axes = ['xAxis', 'yAxis', 'radiusAxis', 'angleAxis', 'singleAxis', 'parallelAxis', 'radar'];
    isTheme && axes.push('valueAxis', 'categoryAxis', 'logAxis', 'timeAxis');

    each(
        axes,
        function (axisName) {
            each(toArr(option[axisName]), function (axisOpt) {
                if (axisOpt) {
                    compatTextStyle(axisOpt, 'axisLabel');
                    compatTextStyle(axisOpt.axisPointer, 'label');
                }
            });
        }
    );

    each(toArr(option.parallel), function (parallelOpt) {
        const parallelAxisDefault = parallelOpt && parallelOpt.parallelAxisDefault;
        compatTextStyle(parallelAxisDefault, 'axisLabel');
        compatTextStyle(parallelAxisDefault && parallelAxisDefault.axisPointer, 'label');
    });

    each(toArr(option.calendar), function (calendarOpt) {
        convertNormalEmphasis(calendarOpt, 'itemStyle');
        compatTextStyle(calendarOpt, 'dayLabel');
        compatTextStyle(calendarOpt, 'monthLabel');
        compatTextStyle(calendarOpt, 'yearLabel');
    });

    // radar.name.textStyle
    each(toArr(option.radar), function (radarOpt) {
        compatTextStyle(radarOpt, 'name');
        // Use axisName instead of name because component has name property
        if (radarOpt.name && radarOpt.axisName == null) {
            radarOpt.axisName = radarOpt.name;
            delete radarOpt.name;
            if (__DEV__) {
                deprecateLog('name property in radar component has been changed to axisName');
            }
        }
        if (radarOpt.nameGap != null && radarOpt.axisNameGap == null) {
            radarOpt.axisNameGap = radarOpt.nameGap;
            delete radarOpt.nameGap;
            if (__DEV__) {
                deprecateLog('nameGap property in radar component has been changed to axisNameGap');
            }
        }
    });

    each(toArr(option.geo), function (geoOpt) {
        if (isObject(geoOpt)) {
            compatEC3CommonStyles(geoOpt);
            each(toArr(geoOpt.regions), function (regionObj) {
                compatEC3CommonStyles(regionObj);
            });
        }
    });

    each(toArr(option.timeline), function (timelineOpt) {
        compatEC3CommonStyles(timelineOpt);
        convertNormalEmphasis(timelineOpt, 'label');
        convertNormalEmphasis(timelineOpt, 'itemStyle');
        convertNormalEmphasis(timelineOpt, 'controlStyle', true);

        const data = timelineOpt.data;
        zrUtil.isArray(data) && zrUtil.each(data, function (item) {
            if (zrUtil.isObject(item)) {
                convertNormalEmphasis(item, 'label');
                convertNormalEmphasis(item, 'itemStyle');
            }
        });
    });

    each(toArr(option.toolbox), function (toolboxOpt) {
        convertNormalEmphasis(toolboxOpt, 'iconStyle');
        each(toolboxOpt.feature, function (featureOpt) {
            convertNormalEmphasis(featureOpt, 'iconStyle');
        });
    });

    compatTextStyle(toObj(option.axisPointer), 'label');
    compatTextStyle(toObj(option.tooltip).axisPointer, 'label');

    // Clean logs
    // storedLogs = {};
}