define(function (require) {


    var axisDefault = require('../axisDefault');
    var valueAxisDefault = axisDefault.valueAxis;
    var Model = require('../../model/Model');
    var zrUtil = require('zrender/core/util');

    var axisModelCommonMixin = require('../axisModelCommonMixin');

    function defaultsShow(opt, show) {
        return zrUtil.defaults({
            show: show
        }, opt);
    }

    var RadarModel = require('../../echarts').extendComponentModel({

        type: 'radar',

        optionUpdated: function () {
            var boundaryGap = this.get('boundaryGap');
            var splitNumber = this.get('splitNumber');
            var scale = this.get('scale');
            var axisLine = this.get('axisLine');
            var axisTick = this.get('axisTick');
            var axisLabel = this.get('axisLabel');
            var nameTextStyle = this.get('name.textStyle');
            var showName = this.get('name.show');
            var nameFormatter = this.get('name.formatter');
            var nameGap = this.get('nameGap');
            var triggerEvent = this.get('triggerEvent');

            var indicatorModels = zrUtil.map(this.get('indicator') || [], function (indicatorOpt) {
                // PENDING
                if (indicatorOpt.max != null && indicatorOpt.max > 0 && !indicatorOpt.min) {
                    indicatorOpt.min = 0;
                }
                else if (indicatorOpt.min != null && indicatorOpt.min < 0 && !indicatorOpt.max) {
                    indicatorOpt.max = 0;
                }
                // Use same configuration
                indicatorOpt = zrUtil.merge(zrUtil.clone(indicatorOpt), {
                    boundaryGap: boundaryGap,
                    splitNumber: splitNumber,
                    scale: scale,
                    axisLine: axisLine,
                    axisTick: axisTick,
                    axisLabel: axisLabel,
                    // Competitable with 2 and use text
                    name: indicatorOpt.text,
                    nameLocation: 'end',
                    nameGap: nameGap,
                    // min: 0,
                    nameTextStyle: nameTextStyle,
                    triggerEvent: triggerEvent
                }, false);
                if (!showName) {
                    indicatorOpt.name = '';
                }
                if (typeof nameFormatter === 'string') {
                    indicatorOpt.name = nameFormatter.replace('{value}', indicatorOpt.name);
                }
                else if (typeof nameFormatter === 'function') {
                    indicatorOpt.name = nameFormatter(
                        indicatorOpt.name, indicatorOpt
                    );
                }
                var model = zrUtil.extend(
                    new Model(indicatorOpt, null, this.ecModel),
                    axisModelCommonMixin
                );

                // For triggerEvent.
                model.mainType = 'radar';
                model.componentIndex = this.componentIndex;

                return model;
            }, this);

            this.getIndicatorModels = function () {
                return indicatorModels;
            };
        },

        defaultOption: {

            zlevel: 0,

            z: 0,

            center: ['50%', '50%'],

            radius: '75%',

            startAngle: 90,

            name: {
                show: true
                // formatter: null
                // textStyle: {}
            },

            boundaryGap: [0, 0],

            splitNumber: 5,

            nameGap: 15,

            scale: false,

            // Polygon or circle
            shape: 'polygon',

            axisLine: zrUtil.merge(
                {
                    lineStyle: {
                        color: '#bbb'
                    }
                },
                valueAxisDefault.axisLine
            ),
            axisLabel: defaultsShow(valueAxisDefault.axisLabel, false),
            axisTick: defaultsShow(valueAxisDefault.axisTick, false),
            splitLine: defaultsShow(valueAxisDefault.splitLine, true),
            splitArea: defaultsShow(valueAxisDefault.splitArea, true),

            // {text, min, max}
            indicator: []
        }
    });

    return RadarModel;
});