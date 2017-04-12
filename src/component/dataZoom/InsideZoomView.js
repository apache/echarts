define(function (require) {

    var DataZoomView = require('./DataZoomView');
    var zrUtil = require('zrender/core/util');
    var sliderMove = require('../helper/sliderMove');
    var roams = require('./roams');
    var bind = zrUtil.bind;

    var InsideZoomView = DataZoomView.extend({

        type: 'dataZoom.inside',

        /**
         * @override
         */
        init: function (ecModel, api) {
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
            InsideZoomView.superApply(this, 'render', arguments);

            // Notice: origin this._range should be maintained, and should not be re-fetched
            // from dataZoomModel when payload.type is 'dataZoom', otherwise 'pan' or 'zoom'
            // info will be missed because of 'throttle' of this.dispatchAction.
            if (roams.shouldRecordRange(payload, dataZoomModel.id)) {
                this._range = dataZoomModel.getPercentRange();
            }

            // Reset controllers.
            zrUtil.each(this.getTargetCoordInfo(), function (coordInfoList, coordSysName) {

                var allCoordIds = zrUtil.map(coordInfoList, function (coordInfo) {
                    return roams.generateCoordId(coordInfo.model);
                });

                zrUtil.each(coordInfoList, function (coordInfo) {
                    var coordModel = coordInfo.model;

                    roams.register(
                        api,
                        {
                            coordId: roams.generateCoordId(coordModel),
                            allCoordIds: allCoordIds,
                            containsPoint: function (e, x, y) {
                                return coordModel.coordinateSystem.containPoint([x, y]);
                            },
                            dataZoomId: dataZoomModel.id,
                            throttleRate: dataZoomModel.get('throttle', true),
                            panGetRange: bind(this._onPan, this, coordInfo, coordSysName),
                            zoomGetRange: bind(this._onZoom, this, coordInfo, coordSysName)
                        }
                    );
                }, this);

            }, this);
        },

        /**
         * @override
         */
        dispose: function () {
            roams.unregister(this.api, this.dataZoomModel.id);
            InsideZoomView.superApply(this, 'dispose', arguments);
            this._range = null;
        },

        /**
         * @private
         */
        _onPan: function (coordInfo, coordSysName, controller, dx, dy, oldX, oldY, newX, newY) {
            if (this.dataZoomModel.option.disabled) {
                return this._range;
            }

            var range = this._range.slice();

            // Calculate transform by the first axis.
            var axisModel = coordInfo.axisModels[0];
            if (!axisModel) {
                return;
            }

            var directionInfo = getDirectionInfo[coordSysName](
                [oldX, oldY], [newX, newY], axisModel, controller, coordInfo
            );

            var percentDelta = directionInfo.signal
                * (range[1] - range[0])
                * directionInfo.pixel / directionInfo.pixelLength;

            sliderMove(percentDelta, range, [0, 100], 'rigid');

            return (this._range = range);
        },

        /**
         * @private
         */
        _onZoom: function (coordInfo, coordSysName, controller, scale, mouseX, mouseY) {
            var option = this.dataZoomModel.option;

            if (option.disabled || option.zoomLock) {
                return this._range;
            }

            var range = this._range.slice();

            // Calculate transform by the first axis.
            var axisModel = coordInfo.axisModels[0];
            if (!axisModel) {
                return;
            }

            var directionInfo = getDirectionInfo[coordSysName](
                null, [mouseX, mouseY], axisModel, controller, coordInfo
            );

            var percentPoint = (directionInfo.pixel - directionInfo.pixelStart) /
                directionInfo.pixelLength * (range[1] - range[0]) + range[0];

            scale = Math.max(1 / scale, 0);
            range[0] = (range[0] - percentPoint) * scale + percentPoint;
            range[1] = (range[1] - percentPoint) * scale + percentPoint;
            return (this._range = fixRange(range));
        }

    });

    var getDirectionInfo = {

        grid: function (oldPoint, newPoint, axisModel, controller, coordInfo) {
            var axis = axisModel.axis;
            var ret = {};
            var rect = coordInfo.model.coordinateSystem.getRect();
            oldPoint = oldPoint || [0, 0];

            if (axis.dim === 'x') {
                ret.pixel = newPoint[0] - oldPoint[0];
                ret.pixelLength = rect.width;
                ret.pixelStart = rect.x;
                ret.signal = axis.inverse ? 1 : -1;
            }
            else { // axis.dim === 'y'
                ret.pixel = newPoint[1] - oldPoint[1];
                ret.pixelLength = rect.height;
                ret.pixelStart = rect.y;
                ret.signal = axis.inverse ? -1 : 1;
            }

            return ret;
        },

        polar: function (oldPoint, newPoint, axisModel, controller, coordInfo) {
            var axis = axisModel.axis;
            var ret = {};
            var polar = coordInfo.model.coordinateSystem;
            var radiusExtent = polar.getRadiusAxis().getExtent();
            var angleExtent = polar.getAngleAxis().getExtent();

            oldPoint = oldPoint ? polar.pointToCoord(oldPoint) : [0, 0];
            newPoint = polar.pointToCoord(newPoint);

            if (axisModel.mainType === 'radiusAxis') {
                ret.pixel = newPoint[0] - oldPoint[0];
                // ret.pixelLength = Math.abs(radiusExtent[1] - radiusExtent[0]);
                // ret.pixelStart = Math.min(radiusExtent[0], radiusExtent[1]);
                ret.pixelLength = radiusExtent[1] - radiusExtent[0];
                ret.pixelStart = radiusExtent[0];
                ret.signal = axis.inverse ? 1 : -1;
            }
            else { // 'angleAxis'
                ret.pixel = newPoint[1] - oldPoint[1];
                // ret.pixelLength = Math.abs(angleExtent[1] - angleExtent[0]);
                // ret.pixelStart = Math.min(angleExtent[0], angleExtent[1]);
                ret.pixelLength = angleExtent[1] - angleExtent[0];
                ret.pixelStart = angleExtent[0];
                ret.signal = axis.inverse ? -1 : 1;
            }

            return ret;
        },

        singleAxis: function (oldPoint, newPoint, axisModel, controller, coordInfo) {
            var axis = axisModel.axis;
            var rect = coordInfo.model.coordinateSystem.getRect();
            var ret = {};

            oldPoint = oldPoint || [0, 0];

            if (axis.orient === 'horizontal') {
                ret.pixel = newPoint[0] - oldPoint[0];
                ret.pixelLength = rect.width;
                ret.pixelStart = rect.x;
                ret.signal = axis.inverse ? 1 : -1;
            }
            else { // 'vertical'
                ret.pixel = newPoint[1] - oldPoint[1];
                ret.pixelLength = rect.height;
                ret.pixelStart = rect.y;
                ret.signal = axis.inverse ? -1 : 1;
            }

            return ret;
        }
    };

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

    return InsideZoomView;
});