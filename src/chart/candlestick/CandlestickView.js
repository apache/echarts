import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import * as graphic from '../../util/graphic';
import {viewMixin} from '../helper/whiskerBoxCommon';

var CandlestickView = ChartView.extend({

    type: 'candlestick',

    getStyleUpdater: function () {
        return updateStyle;
    },

    dispose: zrUtil.noop
});

zrUtil.mixin(CandlestickView, viewMixin, true);

// Update common properties
var normalStyleAccessPath = ['itemStyle'];
var emphasisStyleAccessPath = ['emphasis', 'itemStyle'];

function updateStyle(data, idx, boxEl, whiskerEl, bodyEl) {
    var itemModel = data.getItemModel(idx);
    var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
    var color = data.getItemVisual(idx, 'color');
    var borderColor = data.getItemVisual(idx, 'borderColor') || color;

    // Color must be excluded.
    // Because symbol provide setColor individually to set fill and stroke
    var itemStyle = normalItemStyleModel.getItemStyle(
        ['color', 'color0', 'borderColor', 'borderColor0']
    );

    whiskerEl.useStyle(itemStyle);
    whiskerEl.style.stroke = borderColor;

    bodyEl.useStyle(itemStyle);
    bodyEl.style.fill = color;
    bodyEl.style.stroke = borderColor;

    var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();
    graphic.setHoverStyle(boxEl, hoverStyle);
}

export default CandlestickView;
