define(function (require) {

    var DataZoomView = require('./DataZoomView');
    var throttle = require('../../util/throttle');
    var zrUtil = require('zrender/core/util');
    var sliderMove = require('../helper/sliderMove');
    var RoamController = require('../../component/helper/RoamController');
    var bind = zrUtil.bind;

    return DataZoomView.extend({

        type: 'dataZoom.inside',

        /**
         * @override
         */
        init: function (ecModel, api) {

            /**
             * @private
             * @type {Object.<string, module:echarts/component/helper/RoamController>}
             */
            this._controllers = {};

            /**
             * 'throttle' is used in this.dispatchAction, so we save range
             * to avoid missing some 'pan' info.
             * @private
             * @type {Array.<number>}
             */
            this._range;
        },

        /**
         * @override
         */
        render: function (dataZoomModel, ecModel, api, payload) {
            this.$superApply('render', arguments);

            throttle.createOrUpdate(
                this,
                '_dispatchZoomAction',
                this.dataZoomModel.get('throttle'),
                'fixRate'
            );

            // Notice: this._resetInterval() should not be executed when payload.type
            // is 'dataZoom', origin this._range should be maintained, otherwise 'pan'
            // or 'zoom' info will be missed because of 'throttle' of this.dispatchAction,
            if (!payload || payload.type !== 'dataZoom' || payload.from !== this.uid) {
                this._range = dataZoomModel.getPercentRange();
            }

            this._resetController(api);
        },

        /**
         * @override
         */
        remove: function () {
            this.$superApply('remove', arguments);

            var controllers = this._controllers;
            zrUtil.each(controllers, function (controller) {
                controller.off('pan').off('zoom');
            });
            controllers.length = 0;

            throttle.clear(this, '_dispatchZoomAction');
        },

        /**
         * @override
         */
        dispose: function () {
            this.$superApply('dispose', arguments);
            throttle.clear(this, '_dispatchZoomAction');
        },

        /**
         * @private
         */
        _resetController: function (api) {
            var controllers = this._controllers;
            var targetInfo = this.getTargetInfo();

            zrUtil.each(targetInfo.cartesians, function (item) {
                // Init controller.
                var key = 'cartesian' + item.coordIndex;
                var controller = controllers[key];
                if (!controller) {
                    controller = controllers[key] = new RoamController(api.getZr());
                    controller.enable();
                    controller.on('pan', bind(this._onPan, this, controller, item));
                    controller.on('zoom', bind(this._onZoom, this, controller, item));
                }

                controller.rect = item.model.coordinateSystem.getRect().clone();

            }, this);

            // TODO
            // polar支持
        },

        /**
         * @private
         */
        _onPan: function (controller, coordInfo, dx, dy) {
            var range = this._range = panCartesian(
                [dx, dy], this._range, controller, coordInfo
            );

            if (range) {
                this._dispatchZoomAction(range);
            }
        },

        /**
         * @private
         */
        _onZoom: function (controller, coordInfo, scale, mouseX, mouseY) {
            var dataZoomModel = this.dataZoomModel;

            if (dataZoomModel.option.zoomLock) {
                return;
            }

            scale = 1 / scale;
            var range = this._range = scaleCartesian(
                scale, [mouseX, mouseY], this._range,
                controller, coordInfo, dataZoomModel
            );

            this._dispatchZoomAction(range);
        },

        /**
         * This action will be throttled.
         * @private
         */
        _dispatchZoomAction: function (range) {
            this.api.dispatchAction({
                type: 'dataZoom',
                from: this.uid,
                dataZoomId: this.dataZoomModel.id,
                start: range[0],
                end: range[1]
            });
        }

    });

    function panCartesian(pixelDeltas, range, controller, coordInfo) {
        range = range.slice();

        // Calculate transform by the first axis.
        var axisModel = coordInfo.axisModels[0];
        if (!axisModel) {
            return;
        }

        var directionInfo = getDirectionInfo(pixelDeltas, axisModel, controller);

        var percentDelta = directionInfo.signal
            * (range[1] - range[0])
            * directionInfo.pixel / directionInfo.pixelLength;

        sliderMove(
            percentDelta,
            range,
            [0, 100],
            'rigid'
        );

        return range;
    }

    function scaleCartesian(scale, mousePoint, range, controller, coordInfo, dataZoomModel) {
        range = range.slice();

        // Calculate transform by the first axis.
        var axisModel = coordInfo.axisModels[0];
        if (!axisModel) {
            return;
        }

        var directionInfo = getDirectionInfo(mousePoint, axisModel, controller);

        var mouse = directionInfo.pixel - directionInfo.pixelStart;
        var percentPoint = mouse / directionInfo.pixelLength * (range[1] - range[0]) + range[0];

        scale = Math.max(scale, 0);
        range[0] = (range[0] - percentPoint) * scale + percentPoint;
        range[1] = (range[1] - percentPoint) * scale + percentPoint;

        // FIXME
        // 改为基于绝对值的方式？

        return fixRange(range);
    }

    function getDirectionInfo(xy, axisModel, controller) {
        var axis = axisModel.axis;
        var rect = controller.rect;
        var ret = {};

        if (axis.dim === 'x') {
            ret.pixel = xy[0];
            ret.pixelLength = rect.width;
            ret.pixelStart = rect.x;
            ret.signal = axis.inverse ? 1 : -1;
        }
        else { // axis.dim === 'y'
            ret.pixel = xy[1];
            ret.pixelLength = rect.height;
            ret.pixelStart = rect.y;
            ret.signal = axis.inverse ? -1 : 1;
        }

        return ret;
    }

    function fixRange(range) {
        // Clamp, using !(<= or >=) to handle NaN.
        // jshint ignore:start
        var bound = [0, 100];
        !(range[0] <= bound[1]) && (range[0] = bound[1]);
        !(range[1] <= bound[1]) && (range[1] = bound[1]);
        !(range[0] >= bound[0]) && (range[0] = bound[0]);
        !(range[1] >= bound[0]) && (range[1] = bound[0]);
        // jshint ignore:end

        return range;
    }
});