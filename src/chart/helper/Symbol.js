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
 * @module echarts/chart/helper/Symbol
 */

import * as zrUtil from 'zrender/src/core/util';
import {createSymbol} from '../../util/symbol';
import * as graphic from '../../util/graphic';
import {parsePercent} from '../../util/number';
import {getDefaultLabel} from './labelHelper';


/**
 * @constructor
 * @alias {module:echarts/chart/helper/Symbol}
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @extends {module:zrender/graphic/Group}
 */
function SymbolClz(data, idx, seriesScope) {
    graphic.Group.call(this);
    this.updateData(data, idx, seriesScope);
}

var symbolProto = SymbolClz.prototype;

/**
 * @public
 * @static
 * @param {module:echarts/data/List} data
 * @param {number} dataIndex
 * @return {Array.<number>} [width, height]
 */
var getSymbolSize = SymbolClz.getSymbolSize = function (data, idx) {
    var symbolSize = data.getItemVisual(idx, 'symbolSize');
    return symbolSize instanceof Array
        ? symbolSize.slice()
        : [+symbolSize, +symbolSize];
};

function getScale(symbolSize) {
    return [symbolSize[0] / 2, symbolSize[1] / 2];
}

function driftSymbol(dx, dy) {
    this.parent.drift(dx, dy);
}

symbolProto._createSymbol = function (
    symbolType,
    data,
    idx,
    symbolSize,
    keepAspect
) {
    // Remove paths created before
    this.removeAll();

    var color = data.getItemVisual(idx, 'color');

    // var symbolPath = createSymbol(
    //     symbolType, -0.5, -0.5, 1, 1, color
    // );
    // If width/height are set too small (e.g., set to 1) on ios10
    // and macOS Sierra, a circle stroke become a rect, no matter what
    // the scale is set. So we set width/height as 2. See #4150.
    var symbolPath = createSymbol(
        symbolType, -1, -1, 2, 2, color, keepAspect
    );

    symbolPath.attr({
        z2: 100,
        culling: true,
        scale: getScale(symbolSize)
    });
    // Rewrite drift method
    symbolPath.drift = driftSymbol;

    this._symbolType = symbolType;

    this.add(symbolPath);
};

/**
 * Stop animation
 * @param {boolean} toLastFrame
 */
symbolProto.stopSymbolAnimation = function (toLastFrame) {
    this.childAt(0).stopAnimation(toLastFrame);
};

/**
 * FIXME:
 * Caution: This method breaks the encapsulation of this module,
 * but it indeed brings convenience. So do not use the method
 * unless you detailedly know all the implements of `Symbol`,
 * especially animation.
 *
 * Get symbol path element.
 */
symbolProto.getSymbolPath = function () {
    return this.childAt(0);
};

/**
 * Get scale(aka, current symbol size).
 * Including the change caused by animation
 */
symbolProto.getScale = function () {
    return this.childAt(0).scale;
};

/**
 * Highlight symbol
 */
symbolProto.highlight = function () {
    this.childAt(0).trigger('emphasis');
};

/**
 * Downplay symbol
 */
symbolProto.downplay = function () {
    this.childAt(0).trigger('normal');
};

/**
 * @param {number} zlevel
 * @param {number} z
 */
symbolProto.setZ = function (zlevel, z) {
    var symbolPath = this.childAt(0);
    symbolPath.zlevel = zlevel;
    symbolPath.z = z;
};

symbolProto.setDraggable = function (draggable) {
    var symbolPath = this.childAt(0);
    symbolPath.draggable = draggable;
    symbolPath.cursor = draggable ? 'move' : symbolPath.cursor;
};

/**
 * Update symbol properties
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Object} [seriesScope]
 * @param {Object} [seriesScope.itemStyle]
 * @param {Object} [seriesScope.hoverItemStyle]
 * @param {Object} [seriesScope.symbolRotate]
 * @param {Object} [seriesScope.symbolOffset]
 * @param {module:echarts/model/Model} [seriesScope.labelModel]
 * @param {module:echarts/model/Model} [seriesScope.hoverLabelModel]
 * @param {boolean} [seriesScope.hoverAnimation]
 * @param {Object} [seriesScope.cursorStyle]
 * @param {module:echarts/model/Model} [seriesScope.itemModel]
 * @param {string} [seriesScope.symbolInnerColor]
 * @param {Object} [seriesScope.fadeIn=false]
 */
symbolProto.updateData = function (data, idx, seriesScope) {
    this.silent = false;

    var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
    var seriesModel = data.hostModel;
    var symbolSize = getSymbolSize(data, idx);
    var isInit = symbolType !== this._symbolType;

    if (isInit) {
        var keepAspect = data.getItemVisual(idx, 'symbolKeepAspect');
        this._createSymbol(symbolType, data, idx, symbolSize, keepAspect);
    }
    else {
        var symbolPath = this.childAt(0);
        symbolPath.silent = false;
        graphic.updateProps(symbolPath, {
            scale: getScale(symbolSize)
        }, seriesModel, idx);
    }

    this._updateCommon(data, idx, symbolSize, seriesScope);

    if (isInit) {
        var symbolPath = this.childAt(0);
        var fadeIn = seriesScope && seriesScope.fadeIn;

        var target = {scale: symbolPath.scale.slice()};
        fadeIn && (target.style = {opacity: symbolPath.style.opacity});

        symbolPath.scale = [0, 0];
        fadeIn && (symbolPath.style.opacity = 0);

        graphic.initProps(symbolPath, target, seriesModel, idx);
    }

    this._seriesModel = seriesModel;
};

// Update common properties
var normalStyleAccessPath = ['itemStyle'];
var emphasisStyleAccessPath = ['emphasis', 'itemStyle'];
var normalLabelAccessPath = ['label'];
var emphasisLabelAccessPath = ['emphasis', 'label'];

/**
 * @param {module:echarts/data/List} data
 * @param {number} idx
 * @param {Array.<number>} symbolSize
 * @param {Object} [seriesScope]
 */
symbolProto._updateCommon = function (data, idx, symbolSize, seriesScope) {
    var symbolPath = this.childAt(0);
    var seriesModel = data.hostModel;
    var color = data.getItemVisual(idx, 'color');

    // Reset style
    if (symbolPath.type !== 'image') {
        symbolPath.useStyle({
            strokeNoScale: true
        });
    }
    else {
        symbolPath.setStyle({
            opacity: null,
            shadowBlur: null,
            shadowOffsetX: null,
            shadowOffsetY: null,
            shadowColor: null
        });
    }

    var itemStyle = seriesScope && seriesScope.itemStyle;
    var hoverItemStyle = seriesScope && seriesScope.hoverItemStyle;
    var symbolRotate = seriesScope && seriesScope.symbolRotate;
    var symbolOffset = seriesScope && seriesScope.symbolOffset;
    var labelModel = seriesScope && seriesScope.labelModel;
    var hoverLabelModel = seriesScope && seriesScope.hoverLabelModel;
    var hoverAnimation = seriesScope && seriesScope.hoverAnimation;
    var cursorStyle = seriesScope && seriesScope.cursorStyle;

    if (!seriesScope || data.hasItemOption) {
        var itemModel = (seriesScope && seriesScope.itemModel)
            ? seriesScope.itemModel : data.getItemModel(idx);

        // Color must be excluded.
        // Because symbol provide setColor individually to set fill and stroke
        itemStyle = itemModel.getModel(normalStyleAccessPath).getItemStyle(['color']);
        hoverItemStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

        symbolRotate = itemModel.getShallow('symbolRotate');
        symbolOffset = itemModel.getShallow('symbolOffset');

        labelModel = itemModel.getModel(normalLabelAccessPath);
        hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);
        hoverAnimation = itemModel.getShallow('hoverAnimation');
        cursorStyle = itemModel.getShallow('cursor');
    }
    else {
        hoverItemStyle = zrUtil.extend({}, hoverItemStyle);
    }

    var elStyle = symbolPath.style;

    symbolPath.attr('rotation', (symbolRotate || 0) * Math.PI / 180 || 0);

    if (symbolOffset) {
        symbolPath.attr('position', [
            parsePercent(symbolOffset[0], symbolSize[0]),
            parsePercent(symbolOffset[1], symbolSize[1])
        ]);
    }

    cursorStyle && symbolPath.attr('cursor', cursorStyle);

    // PENDING setColor before setStyle!!!
    symbolPath.setColor(color, seriesScope && seriesScope.symbolInnerColor);

    symbolPath.setStyle(itemStyle);

    var opacity = data.getItemVisual(idx, 'opacity');
    if (opacity != null) {
        elStyle.opacity = opacity;
    }

    var liftZ = data.getItemVisual(idx, 'liftZ');
    var z2Origin = symbolPath.__z2Origin;
    if (liftZ != null) {
        if (z2Origin == null) {
            symbolPath.__z2Origin = symbolPath.z2;
            symbolPath.z2 += liftZ;
        }
    }
    else if (z2Origin != null) {
        symbolPath.z2 = z2Origin;
        symbolPath.__z2Origin = null;
    }

    var useNameLabel = seriesScope && seriesScope.useNameLabel;

    graphic.setLabelStyle(
        elStyle, hoverItemStyle, labelModel, hoverLabelModel,
        {
            labelFetcher: seriesModel,
            labelDataIndex: idx,
            defaultText: getLabelDefaultText,
            isRectText: true,
            autoColor: color
        }
    );

    // Do not execute util needed.
    function getLabelDefaultText(idx, opt) {
        return useNameLabel ? data.getName(idx) : getDefaultLabel(data, idx);
    }

    symbolPath.__symbolOriginalScale = getScale(symbolSize);
    symbolPath.hoverStyle = hoverItemStyle;
    symbolPath.highDownOnUpdate = (
        hoverAnimation && seriesModel.isAnimationEnabled()
    ) ? highDownOnUpdate : null;

    graphic.setHoverStyle(symbolPath);
};

function highDownOnUpdate(fromState, toState) {
    // Do not support this hover animation util some scenario required.
    // Animation can only be supported in hover layer when using `el.incremetal`.
    if (this.incremental || this.useHoverLayer) {
        return;
    }

    if (toState === 'emphasis') {
        var scale = this.__symbolOriginalScale;
        var ratio = scale[1] / scale[0];
        var emphasisOpt = {
            scale: [
                Math.max(scale[0] * 1.1, scale[0] + 3),
                Math.max(scale[1] * 1.1, scale[1] + 3 * ratio)
            ]
        };
        // FIXME
        // modify it after support stop specified animation.
        // toState === fromState
        //     ? (this.stopAnimation(), this.attr(emphasisOpt))
        this.animateTo(emphasisOpt, 400, 'elasticOut');
    }
    else if (toState === 'normal') {
        this.animateTo({
            scale: this.__symbolOriginalScale
        }, 400, 'elasticOut');
    }
}

/**
 * @param {Function} cb
 * @param {Object} [opt]
 * @param {Object} [opt.keepLabel=true]
 */
symbolProto.fadeOut = function (cb, opt) {
    var symbolPath = this.childAt(0);
    // Avoid mistaken hover when fading out
    this.silent = symbolPath.silent = true;
    // Not show text when animating
    !(opt && opt.keepLabel) && (symbolPath.style.text = null);

    graphic.updateProps(
        symbolPath,
        {
            style: {opacity: 0},
            scale: [0, 0]
        },
        this._seriesModel,
        this.dataIndex,
        cb
    );
};

zrUtil.inherits(SymbolClz, graphic.Group);

export default SymbolClz;