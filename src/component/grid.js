define(function(require) {
    'use strict';

    // Grid view
    require('../echarts').extendComponentView({

        render: function (gridModel, ecModel, api) {
            this.group.add(new api.Rectangle({

            }));
        }
    });
});