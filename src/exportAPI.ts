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

/**
 * Do not mount those modules on 'src/echarts' for better tree shaking.
 */

import * as zrender from 'zrender/src/zrender';
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import * as zrUtil from 'zrender/src/core/util';
import * as colorTool from 'zrender/src/tool/color';
import * as graphicUtil from './util/graphic';
import * as numberUtil from './util/number';
import * as formatUtil from './util/format';
import * as timeUtil from './util/time';
import {throttle} from './util/throttle';
import * as ecHelper from './helper';
import parseGeoJSON from './coord/geo/parseGeoJson';

export {use} from './extension';

// Only for GL
export {brushSingle as innerDrawElementOnCanvas} from 'zrender/src/canvas/graphic';

export {zrender};
export {default as List} from './data/List';
export {default as Model} from './model/Model';
export {default as Axis} from './coord/Axis';
export {throttle};
export {ecHelper as helper};
export {matrix};
export {vector};
export {colorTool as color};
export {default as env} from 'zrender/src/core/env';

export {parseGeoJSON};
export const parseGeoJson = parseGeoJSON;

export const number = {};
zrUtil.each(
    [
        'linearMap',
        'round',
        'asc',
        'getPrecision',
        'getPrecisionSafe',
        'getPixelPrecision',
        'getPercentWithPrecision',
        'MAX_SAFE_INTEGER',
        'remRadian',
        'isRadianAroundZero',
        'parseDate',
        'quantity',
        'quantityExponent',
        'nice',
        'quantile',
        'reformIntervals',
        'isNumeric',
        'numericToNumber'
    ],
    function (name) {
        (number as any)[name] = (numberUtil as any)[name];
    }
);


export const format = {};
zrUtil.each(
    [
        'addCommas',
        'toCamelCase',
        'normalizeCssArray',
        'encodeHTML',
        'formatTpl',
        'getTooltipMarker',
        'formatTime',
        'capitalFirst',
        'truncateText',
        'getTextRect'
    ],
    function (name) {
        (format as any)[name] = (formatUtil as any)[name];
    }
);


export const time = {
    parse: numberUtil.parseDate,
    format: timeUtil.format
};

const ecUtil = {};
zrUtil.each(
    [
        'map', 'each', 'filter', 'indexOf', 'inherits', 'reduce', 'filter',
        'bind', 'curry', 'isArray', 'isString', 'isObject', 'isFunction',
        'extend', 'defaults', 'clone', 'merge'
    ],
    function (name) {
        (ecUtil as any)[name] = (zrUtil as any)[name];
    }
);
export {ecUtil as util};

const GRAPHIC_KEYS = [
    'extendShape', 'extendPath', 'makePath', 'makeImage',
    'mergePath', 'resizePath', 'createIcon',
    // 'setHoverStyle',
    // 'setLabelStyle', 'createTextStyle',
    // 'getFont',
    'updateProps', 'initProps', 'getTransform',
    'clipPointsByRect', 'clipRectByRect',
    'registerShape', 'getShapeClass',
    'Group',
    'Image',
    'Text',
    'Circle',
    'Ellipse',
    'Sector',
    'Ring',
    'Polygon',
    'Polyline',
    'Rect',
    'Line',
    'BezierCurve',
    'Arc',
    'IncrementalDisplayable',
    'CompoundPath',
    'LinearGradient',
    'RadialGradient',
    'BoundingRect'
] as const;

export const graphic = {} as Record<typeof GRAPHIC_KEYS[number], any>;
zrUtil.each(
    GRAPHIC_KEYS,
    function (name) {
        (graphic as any)[name] = (graphicUtil as any)[name];
    }
);
