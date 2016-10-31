define(function (require) {

    var zrUtil = require('zrender/core/util');
    var AxisBuilder = require('./AxisBuilder');
    var BrushController = require('../helper/BrushController');
    var graphic = require('../../util/graphic');

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

            var oldAxisGroup = this._axisGroup;
            this._axisGroup = new graphic.Group();
            this.group.add(this._axisGroup);

            if (!axisModel.get('show')) {
                return;
            }

            var coordSys = ecModel.getComponent(
                'parallel', axisModel.get('parallelIndex')
            ).coordinateSystem;

            var areaSelectStyle = axisModel.getAreaSelectStyle();
            var areaWidth = areaSelectStyle.width;

            var dim = axisModel.axis.dim;
            var axisLayout = coordSys.getAxisLayout(dim);

            // Fetch from axisModel by default.
            var axisLabelShow;
            var axisIndex = zrUtil.indexOf(coordSys.dimensions, dim);

            var axisExpandWindow = axisLayout.axisExpandWindow;
            if (axisExpandWindow
                && (axisIndex <= axisExpandWindow[0] || axisIndex >= axisExpandWindow[1])
            ) {
                axisLabelShow = false;
            }

            var builderOpt = zrUtil.extend(
                {
                    axisLabelShow: axisLabelShow,
                    strokeContainThreshold: areaWidth
                },
                axisLayout
            );

            var axisBuilder = new AxisBuilder(axisModel, builderOpt);

            zrUtil.each(elementList, axisBuilder.add, axisBuilder);

            this._axisGroup.add(axisBuilder.getGroup());

            this._refreshBrushController(builderOpt, areaSelectStyle, axisModel, areaWidth);

            graphic.groupTransition(oldAxisGroup, this._axisGroup, axisModel);
        },

        _refreshBrushController: function (builderOpt, areaSelectStyle, axisModel, areaWidth) {
            // After filtering, axis may change, select area needs to be update.
            var axis = axisModel.axis;
            var coverInfoList = zrUtil.map(axisModel.activeIntervals, function (interval) {
                return {
                    brushType: 'lineX',
                    panelId: 'pl',
                    range: [
                        axis.dataToCoord(interval[0], true),
                        axis.dataToCoord(interval[1], true)
                    ]
                };
            });

            var extent = axis.getExtent();
            var extentLen = extent[1] - extent[0];
            var extra = Math.min(30, Math.abs(extentLen) * 0.1); // Arbitrary value.

            // width/height might be negative, which will be
            // normalized in BoundingRect.
            var rect = graphic.BoundingRect.create({
                x: extent[0],
                y: -areaWidth / 2,
                width: extentLen,
                height: areaWidth
            });
            rect.x -= extra;
            rect.width += 2 * extra;

            this._brushController
                .mount({
                    enableGlobalPan: true,
                    rotation: builderOpt.rotation,
                    position: builderOpt.position
                })
                .setPanels([{
                    panelId: 'pl',
                    rect: rect
                }])
                .enableBrush({
                    brushType: 'lineX',
                    brushStyle: areaSelectStyle,
                    removeOnClick: true
                })
                .updateCovers(coverInfoList);
        },

        _onBrush: function (coverInfoList, opt) {
            // Do not cache these object, because the mey be changed.
            var axisModel = this.axisModel;
            var axis = axisModel.axis;

            var intervals = zrUtil.map(coverInfoList, function (coverInfo) {
                return [
                    axis.coordToData(coverInfo.range[0], true),
                    axis.coordToData(coverInfo.range[1], true)
                ];
            });

            // If realtime is true, action is not dispatched on drag end, because
            // the drag end emits the same params with the last drag move event,
            // and may have some delay when using touch pad.
            if (!axisModel.option.realtime === opt.isEnd || opt.removeOnClick) { // jshint ignore:line
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