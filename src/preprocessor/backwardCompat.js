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

function get(opt, path) {
    path = path.split(',');
    var obj = opt;
    for (var i = 0; i < path.length; i++) {
        obj = obj && obj[path[i]];
        if (obj == null) {
            break;
        }
    }
    return obj;
}

function set(opt, path, val, overwrite) {
    path = path.split(',');
    var obj = opt;
    var key;
    for (var i = 0; i < path.length - 1; i++) {
        key = path[i];
        if (obj[key] == null) {
            obj[key] = {};
        }
        obj = obj[key];
    }
    if (overwrite || obj[path[i]] == null) {
        obj[path[i]] = val;
    }
}

function compatLayoutProperties(option) {
    each(LAYOUT_PROPERTIES, function (prop) {
        if (prop[0] in option && !(prop[1] in option)) {
            option[prop[1]] = option[prop[0]];
        }
    });
}

var LAYOUT_PROPERTIES = [
    ['x', 'left'], ['y', 'top'], ['x2', 'right'], ['y2', 'bottom']
];

var COMPATITABLE_COMPONENTS = [
    'grid', 'geo', 'parallel', 'legend', 'toolbox', 'title', 'visualMap', 'dataZoom', 'timeline'
];

export default function (option, isTheme) {
    compatStyle(option, isTheme);

    // Make sure series array for model initialization.
    option.series = normalizeToArray(option.series);

    each(option.series, function (seriesOpt) {
        if (!isObject(seriesOpt)) {
            return;
        }

        var seriesType = seriesOpt.type;

        if (seriesType === 'line') {
            if (seriesOpt.clipOverflow != null) {
                seriesOpt.clip = seriesOpt.clipOverflow;
            }
        }
        else if (seriesType === 'pie' || seriesType === 'gauge') {
            if (seriesOpt.clockWise != null) {
                seriesOpt.clockwise = seriesOpt.clockWise;
            }
        }
        else if (seriesType === 'gauge') {
            var pointerColor = get(seriesOpt, 'pointer.color');
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
        var options = option[componentName];
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