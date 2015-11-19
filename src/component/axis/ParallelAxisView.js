define(function (require) {

    var zrUtil = require('zrender/core/util');
    var AxisBuilder = require('./AxisBuilder');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'axisName'];

    var AxisView = require('../../echarts').extendComponentView({

        type: 'parallelAxis',

        render: function (axisModel, ecModel) {

            this.group.removeAll();

            if (!axisModel.get('show')) {
                return;
            }

            var coordSys = ecModel.getComponent(
                'parallel', axisModel.get('parallelIndex')
            ).coordinateSystem;

            var axisBuilder = new AxisBuilder(
                axisModel, coordSys.getAxisLayout(axisModel.axis.dim)
            );

            zrUtil.each(elementList, axisBuilder.add, axisBuilder);

            this.group.add(axisBuilder.getGroup());
            this.group.z2 = 100;
        }

    });

    return AxisView;
});