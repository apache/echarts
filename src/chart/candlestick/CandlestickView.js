define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var ChartView = require('../../view/Chart');
    var graphic = require('../../util/graphic');
    var whiskerBoxCommon = require('../helper/whiskerBoxCommon');

    var CandlestickView = ChartView.extend({

        type: 'candlestick',

        getStyleUpdater: function () {
            return updateStyle;
        }

    });

    zrUtil.mixin(CandlestickView, whiskerBoxCommon.viewMixin, true);

    // Update common properties
    var normalStyleAccessPath = ['itemStyle', 'normal'];
    var emphasisStyleAccessPath = ['itemStyle', 'emphasis'];

    function updateStyle(itemGroup, data, idx) {
        var itemModel = data.getItemModel(idx);
        var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
        var color = data.getItemVisual(idx, 'color');
        var borderColor = data.getItemVisual(idx, 'borderColor');

        // Color must be excluded.
        // Because symbol provide setColor individually to set fill and stroke
        var itemStyle = normalItemStyleModel.getItemStyle(
            ['color', 'color0', 'borderColor', 'borderColor0']
        );

        var whiskerEl = itemGroup.childAt(itemGroup.whiskerIndex);
        whiskerEl.style.set(itemStyle);
        whiskerEl.style.stroke = borderColor;
        whiskerEl.dirty();

        var bodyEl = itemGroup.childAt(itemGroup.bodyIndex);
        bodyEl.style.set(itemStyle);
        bodyEl.style.fill = color;
        bodyEl.style.stroke = borderColor;
        bodyEl.dirty();

        var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();
        graphic.setHoverStyle(itemGroup, hoverStyle);
    }


    return CandlestickView;

});