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
    function Symbol(data, idx, api) {
        graphic.Group.call(this);

        this.updateData(data, idx, api);
    }

    var symbolProto = Symbol.prototype;

    symbolProto._createSymbol = function (symbolType, data, idx, api) {
        this.removeAll();

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

        api.initGraphicEl(symbolPath, {
            scale: size
        });

        this._symbolType = symbolType;

        this.add(symbolPath);
    };

    /**
     * Update symbol properties
     * @param  {module:echarts/data/List} data
     * @param  {number} idx
     * @param  {module:echarts/ExtensionAPI} api
     */
    symbolProto.updateData = function (data, idx, api) {
        var symbolType = data.getItemVisual(idx, 'symbol') || 'circle';

        if (symbolType !== this._symbolType) {
            this._createSymbol(symbolType, data, idx, api);
        }
        else {
            var symbolPath = this.childAt(0);
            var size = normalizeSymbolSize(data.getItemVisual(idx, 'symbolSize'));
            api.updateGraphicEl(symbolPath, {
                scale: size
            });
        }
        this._updateCommon(data, idx);
    };

    // Update common properties
    var normalStyleAccessPath = ['itemStyle', 'normal'];
    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];

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

        var labelModel = itemModel.getModel('label.normal');
        var hoverLabelModel = itemModel.getModel('label.emphasis');
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

        function onEmphasis() {
            var ratio = size[1] / size[0];
            this.animateTo({
                scale: [
                    Math.max(size[0] * 1.1, size[0] + 6),
                    Math.max(size[1] * 1.1, size[1] + 6 * ratio)
                ]
            }, 400, 'elasticOut');
        }
        function onNormal() {
            this.animateTo({
                scale: size
            }, 400, 'elasticOut');
        }
        if (itemModel.getShallow('hoverAnimation')) {
            symbolPath.on('mouseover', onEmphasis)
                .on('mouseout', onNormal)
                .on('emphasis', onEmphasis)
                .on('normal', onNormal);
        }
    };

    symbolProto.fadeOut = function (cb, api) {
        var symbolPath = this.childAt(0);
        // Not show text when animating
        symbolPath.style.text = '';
        api.updateGraphicEl(symbolPath, {
            scale: [0, 0]
        }, cb);
    };

    zrUtil.inherits(Symbol, graphic.Group);

    return Symbol;
});