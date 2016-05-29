define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var polyHelper = require('../line/poly');

    var SMOOTH = 0.3;

    var ParallelView = require('../../view/Chart').extend({

        type: 'parallel',

        init: function () {

            /**
             * @type {module:zrender/container/Group}
             * @private
             */
            this._dataGroup = new graphic.Group();

            this.group.add(this._dataGroup);

            /**
             * @type {module:echarts/data/List}
             */
            this._data;
        },

        /**
         * @override
         */
        render: function (seriesModel, ecModel, api, payload) {
            this[
                seriesModel.option.progressive
                    ? '_renderForProgressive'
                    : '_renderForNormal'
            ](seriesModel);
        },

        /**
         * @private
         */
        _renderForNormal: function (seriesModel) {
            var dataGroup = this._dataGroup;
            var data = seriesModel.getData();
            var oldData = this._data;
            var coordSys = seriesModel.coordinateSystem;
            var dimensions = coordSys.dimensions;
            var option = seriesModel.option;
            var smooth = option.smooth ? SMOOTH : null;

            // Consider switch between progressive and not.
            !oldData && dataGroup.removeAll();

            data.diff(oldData)
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            // Update style
            updateElStyle(data);

            // First create
            if (!this._data) {
                dataGroup.setClipPath(createGridClipShape(
                    coordSys, seriesModel, function () {
                        dataGroup.removeClipPath();
                    }
                ));
            }

            this._data = data;

            function add(newDataIndex) {
                var points = createLinePoints(data, newDataIndex, dimensions, coordSys);
                var line = createPoly(points, newDataIndex, null, smooth);
                dataGroup.add(line);
                data.setItemGraphicEl(newDataIndex, line);
            }

            function update(newDataIndex, oldDataIndex) {
                var line = oldData.getItemGraphicEl(oldDataIndex);
                var points = createLinePoints(data, newDataIndex, dimensions, coordSys);
                data.setItemGraphicEl(newDataIndex, line);
                graphic.updateProps(line, {shape: {points: points}}, seriesModel, newDataIndex);
            }

            function remove(oldDataIndex) {
                var line = oldData.getItemGraphicEl(oldDataIndex);
                dataGroup.remove(line);
            }

        },

        /**
         * @private
         */
        _renderForProgressive: function (seriesModel) {
            var dataGroup = this._dataGroup;
            var data = seriesModel.getData();
            var coordSys = seriesModel.coordinateSystem;
            var dimensions = coordSys.dimensions;
            var option = seriesModel.option;
            var progressive = option.progressive;
            var smooth = option.smooth ? SMOOTH : null;

            // In progressive animation is disabled, so data diff,
            // which effects performance, is not needed.
            dataGroup.removeAll();
            data.each(function (dataIndex) {
                // FIXME
                // 重复代码 ???????????????????
                var points = createLinePoints(data, dataIndex, dimensions, coordSys);
                var line = createPoly(points, dataIndex, progressive, smooth);
                dataGroup.add(line);
                data.setItemGraphicEl(dataIndex, line);
            });

            updateElStyle(data);

            // Consider switch between progressive and not.
            this._data = null;
        },

        /**
         * @override
         */
        remove: function () {
            this._dataGroup && this._dataGroup.removeAll();
            this._data = null;
        }
    });

    function createGridClipShape(coordSys, seriesModel, cb) {
        var parallelModel = coordSys.model;
        var rect = coordSys.getRect();
        var rectEl = new graphic.Rect({
            shape: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            }
        });
        var dim = parallelModel.get('layout') === 'horizontal' ? 'width' : 'height';
        rectEl.setShape(dim, 0);
        graphic.initProps(rectEl, {
            shape: {
                width: rect.width,
                height: rect.height
            }
        }, seriesModel, cb);
        return rectEl;
    }

    function createPoly(points, dataIndex, progressive, smooth) {
        return new polyHelper.Polyline({
            shape: {
                points: points,
                smooth: smooth
            },
            silent: true,
            progressive: progressive ? Math.round(dataIndex / progressive) : -1,
            z2: 10
        });
    }

    function createLinePoints(data, dataIndex, dimensions, coordSys) {
        var points = [];
        zrUtil.each(dimensions, function (dimName) {
            var value = data.get(dimName, dataIndex);
            if (!isEmptyValue(value, coordSys.getAxis(dimName).type)) {
                points.push(coordSys.dataToPoint(value, dimName));
            }
        });
        return points;
    }

    function updateElStyle(data) {
        data.eachItemGraphicEl(function (line, idx) {
            var itemModel = data.getItemModel(idx);
            var lineStyleModel = itemModel.getModel('lineStyle.normal');

            line.useStyle(zrUtil.extend(
                lineStyleModel.getLineStyle(),
                {
                    fill: null,
                    stroke: data.getItemVisual(idx, 'color'),
                    opacity: data.getItemVisual(idx, 'opacity')
                }
            ));
        });
    }

    // FIXME
    // 公用方法?
    function isEmptyValue(val, axisType) {
        return axisType === 'category'
            ? val == null
            : (val == null || isNaN(val)); // axisType === 'value'
    }

    return ParallelView;
});