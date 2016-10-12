define(function(require) {
    'use strict';

    var graphic = require('../util/graphic');
    var zrUtil = require('zrender/core/util');
    var echarts = require('../echarts');

    require('../coord/cartesian/Grid');

    require('./axis');

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
        },

        /**
         * @implement
         * @return {Object} {x, y, width, height}
         */
        getComponentLayout: function (gridModel) {
            // Whatever grid.show is, layout should be returned.
            var rect = gridModel.coordinateSystem.getRect();
            return {
                x: rect.x, y: rect.y, width: rect.width, height: rect.height
            };
        }
    });

    echarts.registerPreprocessor(function (option) {
        // Only create grid when need
        if (option.xAxis && option.yAxis && !option.grid) {
            option.grid = {};
        }
    });
});