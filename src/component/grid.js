define(function(require) {
    'use strict';

    var graphic = require('../util/graphic');
    var zrUtil = require('zrender/core/util');

    require('../coord/cartesian/Grid');

    require('./axis');

    // Grid view
    require('../echarts').extendComponentView({

        type: 'grid',

        render: function (gridModel, ecModel) {
            this.group.removeAll();
            if (gridModel.get('show')) {
                this.group.add(new graphic.Rect({
                    shape:gridModel.coordinateSystem.getRect(),
                    style: zrUtil.defaults({
                        fill: gridModel.get('backgroundColor')
                    }, gridModel.getItemStyle()),
                    silent: true
                }));
            }
        }
    });
});