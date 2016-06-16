define(function (require) {

    var zrUtil = require('zrender/core/util');
    var AxisBuilder = require('./AxisBuilder');
    var BrushController = require('../helper/BrushController');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'axisName'];

    var AxisView = require('../../echarts').extendComponentView({

        type: 'parallelAxis',

        /**
         * @override
         */
        init: function (ecModel, api) {
            AxisView.superApply(this, 'init', arguments);

            /**
             * @type {module:echarts/component/helper/BrushController}
             */
            (this._brushController = new BrushController(api.getZr()))
                .on('brush', zrUtil.bind(this._onBrush, this));
        },

        /**
         * @override
         */
        render: function (axisModel, ecModel, api, payload) {
            if (fromAxisAreaSelect(axisModel, ecModel, payload)) {
                return;
            }

            this.axisModel = axisModel;
            this.api = api;

            this.group.removeAll();

            if (!axisModel.get('show')) {
                return;
            }

            var coordSys = ecModel.getComponent(
                'parallel', axisModel.get('parallelIndex')
            ).coordinateSystem;

            var areaSelectStyle = axisModel.getAreaSelectStyle();
            var areaWidth = areaSelectStyle.width;

            var axisLayout = coordSys.getAxisLayout(axisModel.axis.dim);
            var builderOpt = zrUtil.extend(
                {
                    strokeContainThreshold: areaWidth,
                    // lineWidth === 0 or no value.
                    axisLineSilent: !(areaWidth > 0) // jshint ignore:line
                },
                axisLayout
            );

            var axisBuilder = new AxisBuilder(axisModel, builderOpt);

            zrUtil.each(elementList, axisBuilder.add, axisBuilder);

            var axisGroup = axisBuilder.getGroup();

            this.group.add(axisGroup);

            this._refreshBrushController(axisGroup, areaSelectStyle, axisModel);
        },

        _refreshBrushController: function (axisGroup, areaSelectStyle, axisModel) {
            // After filtering, axis may change, select area needs to be update.
            var axis = axisModel.axis;
            var coverInfoList = zrUtil.map(axisModel.activeIntervals, function (interval) {
                return {
                    brushType: 'line',
                    range: [
                        axis.dataToCoord(interval[0], true),
                        axis.dataToCoord(interval[1], true)
                    ]
                };
            });

            this._brushController
                .mount(axisGroup)
                .enableBrush({brushType: 'line', brushStyle: areaSelectStyle})
                .updateCovers(coverInfoList);
        },

        _onBrush: function (coverInfoList, isEnd) {
            // Do not cache these object, because the mey be changed.
            var axisModel = this.axisModel;
            var axis = axisModel.axis;

            var intervals = zrUtil.map(coverInfoList, function (coverInfo) {
                return [
                    axis.coordToData(coverInfo.range[0], true),
                    axis.coordToData(coverInfo.range[1], true)
                ];
            });

            // Consider axisModel.option.realtime is null/undefined.
            if (!(axisModel.option.realtime ^ !isEnd)) {
                this.api.dispatchAction({
                    type: 'axisAreaSelect',
                    parallelAxisId: axisModel.id,
                    intervals: intervals
                });
            }
        },

        /**
         * @override
         */
        dispose: function () {
            this._brushController.dispose();
        }
    });

    function fromAxisAreaSelect(axisModel, ecModel, payload) {
        return payload
            && payload.type === 'axisAreaSelect'
            && ecModel.findComponents(
                {mainType: 'parallelAxis', query: payload}
            )[0] === axisModel;
    }

    return AxisView;
});