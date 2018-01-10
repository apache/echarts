import * as echarts from '../echarts';
import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../util/graphic';

import '../coord/cartesian/Grid';
import './axis';

// Grid view
echarts.extendComponentView({

    type: 'grid',

    render: function (gridModel, ecModel) {
        this.group.removeAll();
        if (gridModel.get('show')) {
            this.group.add(new graphic.Rect({
                shape: gridModel.coordinateSystem.getRect(),
                style: zrUtil.defaults({
                    fill: gridModel.get('backgroundColor')
                }, gridModel.getItemStyle()),
                silent: true,
                z2: -1
            }));
        }
    }

});

echarts.registerPreprocessor(function (option) {
    // Only create grid when need
    if (option.xAxis && option.yAxis && !option.grid) {
        option.grid = {};
    }
});