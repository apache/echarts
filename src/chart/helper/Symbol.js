/**
 * @module echarts/chart/helper/Symbol
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');
    var numberUtil = require('../../util/number');

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }

    /**
     * @constructor
     * @alias {module:echarts/chart/helper/Symbol}
     * @param {module:echarts/data/List} data
     * @param {number} idx
     * @extends {module:zrender/graphic/Group}
     */
    function Symbol(data, idx) {
        graphic.Group.call(this);

        this.updateData(data, idx);
    }

    var symbolProto = Symbol.prototype;

    function driftSymbol(dx, dy) {
        this.parent.drift(dx, dy);
    }

    symbolProto._createSymbol = function (symbolType, data, idx) {
        // Remove paths created before
        this.removeAll();

        var seriesModel = data.hostModel;
        var color = data.getItemVisual(idx, 'color');

        var symbolPath = symbolUtil.createSymbol(
            symbolType, -0.5, -0.5, 1, 1, color
        );

        symbolPath.attr({
            z2: 100,
            culling: true,
            scale: [0, 0]
        });
        // Rewrite drift method
        symbolPath.drift = driftSymbol;

        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

        graphic.initProps(symbolPath, {
            scale: size
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
    symbolProto.updateData = function (data, idx) {
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        var seriesModel = data.hostModel;
        var symbolSize = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
        if (symbolType !== this._symbolType) {
            this._createSymbol(symbolType, data, idx);
        }
        else {
            var symbolPath = this.childAt(0);
            graphic.updateProps(symbolPath, {
                scale: symbolSize
            }, seriesModel, idx);
        }
        this._updateCommon(data, idx, symbolSize);

        this._seriesModel = seriesModel;
    };

    // Update common properties
    var normalStyleAccessPath = ['itemStyle', 'normal'];
    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
    var normalLabelAccessPath = ['label', 'normal'];
    var emphasisLabelAccessPath = ['label', 'emphasis'];

    symbolProto._updateCommon = function (data, idx, symbolSize) {
        var symbolPath = this.childAt(0);
        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel(idx);
        var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
        var color = data.getItemVisual(idx, 'color');

        // Reset style
        if (symbolPath.type !== 'image') {
            symbolPath.useStyle({
                strokeNoScale: true
            });
        }
        var elStyle = symbolPath.style;

        var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

        symbolPath.rotation = itemModel.getShallow('symbolRotate') * Math.PI / 180 || 0;

        var symbolOffset = itemModel.getShallow('symbolOffset');
        if (symbolOffset) {
            var pos = symbolPath.position;
            pos[0] = numberUtil.parsePercent(symbolOffset[0], symbolSize[0]);
            pos[1] = numberUtil.parsePercent(symbolOffset[1], symbolSize[1]);
        }

        symbolPath.setColor(color);

        zrUtil.extend(
            elStyle,
            // Color must be excluded.
            // Because symbol provide setColor individually to set fill and stroke
            normalItemStyleModel.getItemStyle(['color'])
        );

        var opacity = data.getItemVisual(idx, 'opacity');
        if (opacity != null) {
            elStyle.opacity = opacity;
        }

        var labelModel = itemModel.getModel(normalLabelAccessPath);
        var hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);

        // Get last value dim
        var dimensions = data.dimensions.slice();
        var valueDim = dimensions.pop();
        var dataType;
        while (
            ((dataType = data.getDimensionInfo(valueDim).type) === 'ordinal')
            || (dataType === 'time')
        ) {
            valueDim = dimensions.pop();
        }

        if (labelModel.get('show')) {
            graphic.setText(elStyle, labelModel, color);
            elStyle.text = zrUtil.retrieve(
                seriesModel.getFormattedLabel(idx, 'normal'),
                data.get(valueDim, idx)
            );
        }
        else {
            elStyle.text = '';
        }

        if (hoverLabelModel.getShallow('show')) {
            graphic.setText(hoverStyle, hoverLabelModel, color);
            hoverStyle.text = zrUtil.retrieve(
                seriesModel.getFormattedLabel(idx, 'emphasis'),
                data.get(valueDim, idx)
            );
        }
        else {
            hoverStyle.text = '';
        }

        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

        symbolPath.off('mouseover')
            .off('mouseout')
            .off('emphasis')
            .off('normal');

        graphic.setHoverStyle(symbolPath, hoverStyle);

        if (itemModel.getShallow('hoverAnimation')) {
            var onEmphasis = function() {
                var ratio = size[1] / size[0];
                this.animateTo({
                    scale: [
                        Math.max(size[0] * 1.1, size[0] + 3),
                        Math.max(size[1] * 1.1, size[1] + 3 * ratio)
                    ]
                }, 400, 'elasticOut');
            };
            var onNormal = function() {
                this.animateTo({
                    scale: size
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
        // Not show text when animating
        symbolPath.style.text = '';
        graphic.updateProps(symbolPath, {
            scale: [0, 0]
        }, this._seriesModel, this.dataIndex, cb);
    };

    zrUtil.inherits(Symbol, graphic.Group);

    return Symbol;
});