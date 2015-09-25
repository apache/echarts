define(function(require) {
    'use strict';

    var graphic = require('../util/graphic');

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
                    style: {
                        stroke: gridModel.get('borderColor'),
                        lineWidth: gridModel.get('borderWidth'),
                        fill: gridModel.get('backgroundColor')
                    },
                    silent: true
                }));
            }
        }
    });
});