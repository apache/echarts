import * as zrUtil from 'zrender/src/core/util';
import ChartView from '../../view/Chart';
import * as graphic from '../../util/graphic';
import {viewMixin} from '../helper/whiskerBoxCommon';

var BoxplotView = ChartView.extend({

    type: 'boxplot',

    getStyleUpdater: function () {
        return updateStyle;
    },

    dispose: zrUtil.noop
});

zrUtil.mixin(BoxplotView, viewMixin, true);

// Update common properties
var normalStyleAccessPath = ['itemStyle'];
var emphasisStyleAccessPath = ['emphasis', 'itemStyle'];

function updateStyle(data, idx, boxEl, whiskerEl, bodyEl) {
    var itemModel = data.getItemModel(idx);
    var normalItemStyleModel = itemModel.getModel(normalStyleAccessPath);
    var borderColor = data.getItemVisual(idx, 'color');

    // Exclude borderColor.
    var itemStyle = normalItemStyleModel.getItemStyle(['borderColor']);

    whiskerEl.style.set(itemStyle);
    whiskerEl.style.stroke = borderColor;
    whiskerEl.dirty();

    bodyEl.style.set(itemStyle);
    bodyEl.style.stroke = borderColor;
    bodyEl.dirty();

    var hoverStyle = itemModel.getModel(emphasisStyleAccessPath).getItemStyle();
    graphic.setHoverStyle(boxEl, hoverStyle);
}

export default BoxplotView;
