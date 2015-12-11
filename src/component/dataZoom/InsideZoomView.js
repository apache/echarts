define(function (require) {

    var DataZoomView = require('./DataZoomView');
    var zrUtil = require('zrender/core/util');
    var sliderMove = require('../helper/sliderMove');
    var BoundingRect = require('zrender/core/BoundingRect');
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
        },

        /**
         * @override
         */
        render: function (dataZoomModel, ecModel, api, payload) {
            DataZoomView.prototype.render.apply(this, arguments);

            this._resetController(api);
        },

        /**
         * @override
         */
        remove: function () {
            var controllers = this._controllers;
            zrUtil.each(controllers, function (controller) {
                controller.off('pan').off('zoom');
            });
            controllers.length = 0;
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

                var rect = item.model.coordinateSystem.getRect();

                controller.rect = rect
                    ? new BoundingRect(rect.x, rect.y, rect.width, rect.height)
                    : new BoundingRect(0, 0, 0, 0);
            }, this);

            // TODO
            // polar支持
        },

        /**
         * @private
         */
        _onPan: function (controller, coordInfo, dx, dy) {
            var dataZoomModel = this.dataZoomModel;
            var range = panCartesian(
                [dx, dy], dataZoomModel.getRange(), controller, coordInfo
            );

            if (range) {
                this.dispatchZoomAction(range);
            }
        },

        /**
         * @private
         */
        _onZoom: function (controller, coordInfo, scale, mouseX, mouseY) {
            var dataZoomModel = this.dataZoomModel;
            scale = 1 / scale;
            var range = scaleCartesian(
                scale, [mouseX, mouseY], dataZoomModel.getRange(),
                controller, coordInfo, dataZoomModel
            );

            this.dispatchZoomAction(range);
        },

        /**
         * This action will be throttled.
         * @override
         */
        dispatchZoomAction: function (range) {
            this.api.dispatchAction({
                type: 'dataZoom',
                from: this.uid,
                dataZoomId: this.dataZoomModel.id,
                range: range
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

        return dataZoomModel.fixRange(range);
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

});