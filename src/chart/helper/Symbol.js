/**
 * @module echarts/chart/helper/Symbol
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');
    var labelHelper = require('./labelHelper');

    function getSymbolSize(data, idx) {
        var symbolSize = data.getItemVisual(idx, 'symbolSize');
        return symbolSize instanceof Array
            ? symbolSize.slice()
            : [+symbolSize, +symbolSize];
    }

    function getScale(symbolSize) {
        return [symbolSize[0] / 2, symbolSize[1] / 2];
    }

    /**
     * @constructor
     * @alias {module:echarts/chart/helper/Symbol}
     * @param {module:echarts/data/List} data
     * @param {number} idx
     * @extends {module:zrender/graphic/Group}
     */
    function Symbol(data, idx, seriesScope) {
        graphic.Group.call(this);

        this.updateData(data, idx, seriesScope);
    }

    var symbolProto = Symbol.prototype;

    function driftSymbol(dx, dy) {
        this.parent.drift(dx, dy);
    }

    symbolProto._createSymbol = function (symbolType, data, idx, symbolSize) {
        // Remove paths created before
        this.removeAll();

        var seriesModel = data.hostModel;
        var color = data.getItemVisual(idx, 'color');

        // var symbolPath = symbolUtil.createSymbol(
        //     symbolType, -0.5, -0.5, 1, 1, color
        // );
        // If width/height are set too small (e.g., set to 1) on ios10
        // and macOS Sierra, a circle stroke become a rect, no matter what
        // the scale is set. So we set width/height as 2. See #4150.
        var symbolPath = symbolUtil.createSymbol(
            symbolType, -1, -1, 2, 2, color
        );

        symbolPath.attr({
            z2: 100,
            culling: true,
            scale: [0, 0]
        });
        // Rewrite drift method
        symbolPath.drift = driftSymbol;

        graphic.initProps(symbolPath, {
            scale: getScale(symbolSize)
        }, seriesModel, idx);
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
     * Get symbol path element
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
        symbolPath.cursor = draggable ? 'move' : 'pointer';
    };

    /**
     * Update symbol properties
     * @param  {module:echarts/data/List} data
     * @param  {number} idx
     */
    symbolProto.updateData = function (data, idx, seriesScope) {
        this.silent = false;

        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        var seriesModel = data.hostModel;
        var symbolSize = getSymbolSize(data, idx);

        if (symbolType !== this._symbolType) {
            this._createSymbol(symbolType, data, idx, symbolSize);
        }
        else {
            var symbolPath = this.childAt(0);
            symbolPath.silent = false;
            graphic.updateProps(symbolPath, {
                scale: getScale(symbolSize)
            }, seriesModel, idx);
        }
        this._updateCommon(data, idx, symbolSize, seriesScope);
        this._seriesModel = seriesModel;
    };

    // Update common properties
    var normalStyleAccessPath = ['itemStyle', 'normal'];
    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
    var normalLabelAccessPath = ['label', 'normal'];
    var emphasisLabelAccessPath = ['label', 'emphasis'];

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

        seriesScope = seriesScope || null;

        var itemStyle = seriesScope && seriesScope.itemStyle;
        var hoverItemStyle = seriesScope && seriesScope.hoverItemStyle;
        var symbolRotate = seriesScope && seriesScope.symbolRotate;
        var symbolOffset = seriesScope && seriesScope.symbolOffset;
        var labelModel = seriesScope && seriesScope.labelModel;
        var hoverLabelModel = seriesScope && seriesScope.hoverLabelModel;
        var hoverAnimation = seriesScope && seriesScope.hoverAnimation;
        var cursorStyle = seriesScope && seriesScope.cursorStyle;

        if (!seriesScope || data.hasItemOption) {
            var itemModel = data.getItemModel(idx);

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
                numberUtil.parsePercent(symbolOffset[0], symbolSize[0]),
                numberUtil.parsePercent(symbolOffset[1], symbolSize[1])
            ]);
        }

        cursorStyle && symbolPath.attr('cursor', cursorStyle);

        // PENDING setColor before setStyle!!!
        symbolPath.setColor(color);

        symbolPath.setStyle(itemStyle);

        var opacity = data.getItemVisual(idx, 'opacity');
        if (opacity != null) {
            elStyle.opacity = opacity;
        }

        var valueDim = labelHelper.findLabelValueDim(data);

        if (valueDim != null) {
            graphic.setText(elStyle, labelModel, color);
            var normalText = seriesModel.getFormattedLabel(idx, 'normal');
            var value = data.get(valueDim, idx);
            elStyle.text = labelModel.getShallow('show')
                ? zrUtil.retrieve2(
                    normalText,
                    value
                )
                : null;

            graphic.setText(hoverItemStyle, hoverLabelModel, false);
            hoverItemStyle.text = hoverLabelModel.getShallow('show')
                ? zrUtil.retrieve3(
                    seriesModel.getFormattedLabel(idx, 'emphasis'),
                    normalText,
                    value
                )
                : null;
        }

        symbolPath.off('mouseover')
            .off('mouseout')
            .off('emphasis')
            .off('normal');

        symbolPath.hoverStyle = hoverItemStyle;

        graphic.setHoverStyle(symbolPath);

        var scale = getScale(symbolSize);

        if (hoverAnimation && seriesModel.isAnimationEnabled()) {
            var onEmphasis = function() {
                var ratio = scale[1] / scale[0];
                this.animateTo({
                    scale: [
                        Math.max(scale[0] * 1.1, scale[0] + 3),
                        Math.max(scale[1] * 1.1, scale[1] + 3 * ratio)
                    ]
                }, 400, 'elasticOut');
            };
            var onNormal = function() {
                this.animateTo({
                    scale: scale
                }, 400, 'elasticOut');
            };
            symbolPath.on('mouseover', onEmphasis)
                .on('mouseout', onNormal)
                .on('emphasis', onEmphasis)
                .on('normal', onNormal);
        }
    };

    symbolProto.fadeOut = function (cb) {
        var symbolPath = this.childAt(0);
        // Avoid mistaken hover when fading out
        this.silent = symbolPath.silent = true;
        // Not show text when animating
        symbolPath.style.text = null;
        graphic.updateProps(symbolPath, {
            scale: [0, 0]
        }, this._seriesModel, this.dataIndex, cb);
    };

    zrUtil.inherits(Symbol, graphic.Group);

    return Symbol;
});