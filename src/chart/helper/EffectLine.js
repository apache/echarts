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
 * Provide effect for line
 * @module echarts/chart/helper/EffectLine
 */

import * as graphic from '../../util/graphic';
import Line from './Line';
import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as vec2 from 'zrender/src/core/vector';
import * as curveUtil from 'zrender/src/core/curve';

/**
 * @constructor
 * @extends {module:zrender/graphic/Group}
 * @alias {module:echarts/chart/helper/Line}
 */
function EffectLine(lineData, idx, seriesScope) {
    graphic.Group.call(this);

    this.add(this.createLine(lineData, idx, seriesScope));

    this._updateEffectSymbol(lineData, idx);
}

var effectLineProto = EffectLine.prototype;

effectLineProto.createLine = function (lineData, idx, seriesScope) {
    return new Line(lineData, idx, seriesScope);
};

effectLineProto._updateEffectSymbol = function (lineData, idx) {
    var itemModel = lineData.getItemModel(idx);
    var effectModel = itemModel.getModel('effect');
    var size = effectModel.get('symbolSize');
    var symbolType = effectModel.get('symbol');
    if (!zrUtil.isArray(size)) {
        size = [size, size];
    }
    var color = effectModel.get('color') || lineData.getItemVisual(idx, 'color');
    var symbol = this.childAt(1);

    if (this._symbolType !== symbolType) {
        // Remove previous
        this.remove(symbol);

        symbol = createSymbol(
            symbolType, -0.5, -0.5, 1, 1, color
        );
        symbol.z2 = 100;
        symbol.culling = true;

        this.add(symbol);
    }

    // Symbol may be removed if loop is false
    if (!symbol) {
        return;
    }

    // Shadow color is same with color in default
    symbol.setStyle('shadowColor', color);
    symbol.setStyle(effectModel.getItemStyle(['color']));

    symbol.attr('scale', size);

    symbol.setColor(color);
    symbol.attr('scale', size);

    this._symbolType = symbolType;
    this._symbolScale = size;

    this._updateEffectAnimation(lineData, effectModel, idx);
};

effectLineProto._updateEffectAnimation = function (lineData, effectModel, idx) {

    var symbol = this.childAt(1);
    if (!symbol) {
        return;
    }

    var self = this;

    var points = lineData.getItemLayout(idx);

    var period = effectModel.get('period') * 1000;
    var loop = effectModel.get('loop');
    var constantSpeed = effectModel.get('constantSpeed');
    var delayExpr = zrUtil.retrieve(effectModel.get('delay'), function (idx) {
        return idx / lineData.count() * period / 3;
    });
    var isDelayFunc = typeof delayExpr === 'function';

    // Ignore when updating
    symbol.ignore = true;

    this.updateAnimationPoints(symbol, points);

    if (constantSpeed > 0) {
        period = this.getLineLength(symbol) / constantSpeed * 1000;
    }

    if (period !== this._period || loop !== this._loop) {

        symbol.stopAnimation();

        var delay = delayExpr;
        if (isDelayFunc) {
            delay = delayExpr(idx);
        }
        if (symbol.__t > 0) {
            delay = -period * symbol.__t;
        }
        symbol.__t = 0;
        var animator = symbol.animate('', loop)
            .when(period, {
                __t: 1
            })
            .delay(delay)
            .during(function () {
                self.updateSymbolPosition(symbol);
            });
        if (!loop) {
            animator.done(function () {
                self.remove(symbol);
            });
        }
        animator.start();
    }

    this._period = period;
    this._loop = loop;
};

effectLineProto.getLineLength = function (symbol) {
    // Not so accurate
    return (vec2.dist(symbol.__p1, symbol.__cp1)
        + vec2.dist(symbol.__cp1, symbol.__p2));
};

effectLineProto.updateAnimationPoints = function (symbol, points) {
    symbol.__p1 = points[0];
    symbol.__p2 = points[1];
    symbol.__cp1 = points[2] || [
        (points[0][0] + points[1][0]) / 2,
        (points[0][1] + points[1][1]) / 2
    ];
};

effectLineProto.updateData = function (lineData, idx, seriesScope) {
    this.childAt(0).updateData(lineData, idx, seriesScope);
    this._updateEffectSymbol(lineData, idx);
};

effectLineProto.updateSymbolPosition = function (symbol) {
    var p1 = symbol.__p1;
    var p2 = symbol.__p2;
    var cp1 = symbol.__cp1;
    var t = symbol.__t;
    var pos = symbol.position;
    var lastPos = [pos[0], pos[1]];
    var quadraticAt = curveUtil.quadraticAt;
    var quadraticDerivativeAt = curveUtil.quadraticDerivativeAt;
    pos[0] = quadraticAt(p1[0], cp1[0], p2[0], t);
    pos[1] = quadraticAt(p1[1], cp1[1], p2[1], t);

    // Tangent
    var tx = quadraticDerivativeAt(p1[0], cp1[0], p2[0], t);
    var ty = quadraticDerivativeAt(p1[1], cp1[1], p2[1], t);

    symbol.rotation = -Math.atan2(ty, tx) - Math.PI / 2;
    // enable continuity trail for 'line', 'rect', 'roundRect' symbolType
    if (this._symbolType === 'line' || this._symbolType === 'rect' || this._symbolType === 'roundRect') {
        if (symbol.__lastT !== undefined && symbol.__lastT < symbol.__t) {
            var scaleY = vec2.dist(lastPos, pos) * 1.05;
            symbol.attr('scale', [symbol.scale[0], scaleY]);
            // make sure the last segment render within endPoint
            if (t === 1) {
                pos[0] = lastPos[0] + (pos[0] - lastPos[0]) / 2;
                pos[1] = lastPos[1] + (pos[1] - lastPos[1]) / 2;
            }
        }
        else if (symbol.__lastT === 1) {
            // After first loop, symbol.__t does NOT start with 0, so connect p1 to pos directly.
            var scaleY = 2 * vec2.dist(p1, pos);
            symbol.attr('scale', [symbol.scale[0], scaleY ]);
        }
        else {
            symbol.attr('scale', this._symbolScale);
        }
    }
    symbol.__lastT = symbol.__t;
    symbol.ignore = false;
};


effectLineProto.updateLayout = function (lineData, idx) {
    this.childAt(0).updateLayout(lineData, idx);

    var effectModel = lineData.getItemModel(idx).getModel('effect');
    this._updateEffectAnimation(lineData, effectModel, idx);
};

zrUtil.inherits(EffectLine, graphic.Group);

export default EffectLine;