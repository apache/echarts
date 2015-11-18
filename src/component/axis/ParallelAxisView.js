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

            var coordSys = ecModel.getComponent('parallel', axisModel.get('parallelIndex'));

            var axisBuilder = new AxisBuilder(coordSys.getAxisLayout(axisModel.axis.dim));

            zrUtil.each(elementList, function (name) {
                if (axisModel.get(name +'.show')) {
                    axisBuilder.add(name);
                }
            }, this);

            this.group.add(axisBuilder.getGroup());
        }

    });

    return AxisView;
});