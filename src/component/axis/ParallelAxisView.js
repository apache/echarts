define(function (require) {

    var zrUtil = require('zrender/core/util');
    var AxisBuilder = require('./AxisBuilder');
    var SelectController = require('../helper/SelectController');

    var elementList = ['axisLine', 'axisLabel', 'axisTick', 'axisName'];

    var AxisView = require('../../echarts').extendComponentView({

        type: 'parallelAxis',

        /**
         * @type {module:echarts/component/helper/SelectController}
         */
        _selectController: null,

        /**
         * @override
         */
        render: function (axisModel, ecModel, api, payload) {

            if (fromAxisAreaSelect(axisModel, ecModel, payload)) {
                return;
            }

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
                    silent: !(areaWidth > 0) // jshint ignore:line
                },
                axisLayout
            );

            var axisBuilder = new AxisBuilder(axisModel, builderOpt);

            zrUtil.each(elementList, axisBuilder.add, axisBuilder);

            var axisGroup = axisBuilder.getGroup();

            this.group.add(axisGroup);
            this.group.z2 = 100;

            this._buildSelectController(
                axisGroup, areaSelectStyle, axisModel, api
            );
        },

        _buildSelectController: function (axisGroup, areaSelectStyle, axisModel, api) {

            var axis = axisModel.axis;
            var selectController = this._selectController;

            if (!selectController) {
                selectController = this._selectController = new SelectController(
                    'line',
                    api.getZr(),
                    areaSelectStyle
                );

                selectController.on('selected', function (standardViewExtent) {
                    var intervals = standardViewExtent
                        ? [[
                            axis.coordToData(standardViewExtent[0], true),
                            axis.coordToData(standardViewExtent[1], true)
                        ]]
                        : true;

                    api.dispatch({
                        type: 'axisAreaSelect',
                        parallelAxisId: axisModel.id,
                        intervals: intervals
                    });
                });
            }

            selectController.enable(axisGroup);
        },

        /**
         * @override
         */
        remove: function () {
            this._selectController && this._selectController.disable();
        },

        /**
         * @override
         */
        dispose: function () {
            if (this._selectController) {
                this._selectController.dispose();
                this._selectController = null;
            }
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