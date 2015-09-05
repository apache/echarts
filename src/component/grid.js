define(function(require) {
    'use strict';

    require('../coord/cartesian/Grid');

    require('./axis');

    // Grid view
    require('../echarts').extendComponentView({

        type: 'grid',

        render: function (gridModel, ecModel, api) {
            this.group.clear();
            if (gridModel.get('show')) {
                this.group.add(new api.Rect({
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