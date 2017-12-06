/**
 * Do not mount those modules on 'src/echarts' for better tree shaking.
 */

import * as zrender from 'zrender/src/zrender';
import * as matrix from 'zrender/src/core/matrix';
import * as vector from 'zrender/src/core/vector';
import * as zrUtil from 'zrender/src/core/util';
import * as colorTool from 'zrender/src/tool/color';
import * as graphic from './util/graphic';
import * as numberUtil from './util/number';
import * as formatUtil from './util/format';
import {throttle} from './util/throttle';
import * as ecHelper from './helper';
import parseGeoJSON from './coord/geo/parseGeoJson';


export {zrender};
export {default as List} from './data/List';
export {default as Model} from './model/Model';
export {default as Axis} from './coord/Axis';
export {graphic};
export {numberUtil as number};
export {formatUtil as format};
export {throttle};
export {ecHelper as helper};
export {matrix};
export {vector};
export {colorTool as color};
export {default as env} from 'zrender/src/core/env';

export {parseGeoJSON};
export var parseGeoJson = parseGeoJSON;

var ecUtil = {};
zrUtil.each([
        'map', 'each', 'filter', 'indexOf', 'inherits', 'reduce', 'filter',
        'bind', 'curry', 'isArray', 'isString', 'isObject', 'isFunction',
        'extend', 'defaults', 'clone', 'merge'
    ],
    function (name) {
        ecUtil[name] = zrUtil[name];
    }
);
export {ecUtil as util};
