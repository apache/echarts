define(function (require) {

    var zrUtil = require('zrender/core/util');
    var symbolUtil = require('../../util/symbol');
    var graphic = require('../../util/graphic');

    function normalizeSymbolSize(symbolSize) {
        if (!zrUtil.isArray(symbolSize)) {
            symbolSize = [+symbolSize, +symbolSize];
        }
        return symbolSize;
    }

    /**
     * @constructor
     * @extends {module:zrender/graphic/Group}
     */
    function Symbol(data, idx) {
        graphic.Group.call(this);

        this.updateData(data, idx);
    }

    var symbolProto = Symbol.prototype;

    symbolProto._createSymbol = function (symbolType, data, idx) {
        this.removeAll();

        var seriesModel = data.hostModel;
        var color = data.getItemVisual(idx, 'color');

        var symbolPath = symbolUtil.createSymbol(
            symbolType, -0.5, -0.5, 1, 1, color
        );
        symbolPath.style.strokeNoScale = true;

        symbolPath.attr({
            z2: 100
        });
        symbolPath.attr('scale', [0, 0]);

        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

        graphic.initProps(symbolPath, {
            scale: size
        }, seriesModel);

        this._symbolType = symbolType;

        this.add(symbolPath);
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
    /**
     * Update symbol properties
     * @param  {module:echarts/data/List} data
     * @param  {number} idx
     */
    symbolProto.updateData = function (data, idx) {
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';
        var seriesModel = data.hostModel;

        if (symbolType !== this._symbolType) {
            this._createSymbol(symbolType, data, idx);
        }
        else {
            var symbolPath = this.childAt(0);
            var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
            graphic.updateProps(symbolPath, {
                scale: size
            }, seriesModel);
        }
        this._updateCommon(data, idx);

        this._seriesModel = seriesModel;
    };

    // Update common properties
    var normalStyleAccessPath = ['itemStyle', 'normal'];
    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];
    var normalLabelAccessPath = ['label', 'normal'];
    var emphasisLabelAccessPath = ['label', 'emphasis'];

    symbolProto._updateCommon = function (data, idx) {
        var symbolPath = this.childAt(0);
        var seriesModel = data.hostModel;
        var itemModel = data.getItemModel(idx);
        var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
        var color = data.getItemVisual(idx, 'color');

        var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();

        symbolPath.rotation = itemModel.getShallow('symbolRotate') * Math.PI / 180 || 0;

        symbolPath.setColor(color);

        zrUtil.extend(
            symbolPath.style,
            // Color must be excluded.
            // Because symbol provide setColor individually to set fill and stroke
            normalItemStyleModel.getItemStyle(['color'])
        );

        var labelModel = itemModel.getModel(normalLabelAccessPath);
        var hoverLabelModel = itemModel.getModel(emphasisLabelAccessPath);
        var lastDim = data.dimensions[data.dimensions.length - 1];
        var labelText = seriesModel.getFormattedLabel(idx, 'normal')
                    || data.get(lastDim, idx);
        var elStyle = symbolPath.style;

        if (labelModel.get('show')) {
            graphic.setText(elStyle, labelModel, color);
            elStyle.text = labelText;
        }
        else {
            elStyle.text = '';
        }
        if (hoverLabelModel.getShallow('show')) {
            graphic.setText(hoverStyle, hoverLabelModel, color);
            hoverStyle.text = labelText;
        }
        else {
            hoverStyle.text = '';
        }

        graphic.setHoverStyle(symbolPath, hoverStyle);

        var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));

        if (itemModel.getShallow('hoverAnimation')) {
            var onEmphasis = function() {
                var ratio = size[1] / size[0];
                this.animateTo({
                    scale: [
                        Math.max(size[0] * 1.1, size[0] + 6),
                        Math.max(size[1] * 1.1, size[1] + 6 * ratio)
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
        }, this._seriesModel, cb);
    };

    zrUtil.inherits(Symbol, graphic.Group);

    return Symbol;
});