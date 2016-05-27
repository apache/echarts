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
            var dataGroup = this._dataGroup;
            var data = seriesModel.getData();
            var oldData = this._data;
            var coordSys = seriesModel.coordinateSystem;
            var dimensions = coordSys.dimensions;
            var option = seriesModel.option;
            var progressive = option.progressive;
            var smooth = option.smooth ? SMOOTH : null;

            data.diff(oldData)
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            // Update style
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
                var line = createPoly(points, newDataIndex, progressive, smooth);
                dataGroup.add(line);
                data.setItemGraphicEl(newDataIndex, line);
            }

            function update(newDataIndex, oldDataIndex) {
                var line = oldData.getItemGraphicEl(oldDataIndex);
                var points = createLinePoints(data, newDataIndex, dimensions, coordSys);
                line.shape.points = points;
                line.dirty();
                data.setItemGraphicEl(newDataIndex, line);
            }

            function remove(oldDataIndex) {
                var line = oldData.getItemGraphicEl(oldDataIndex);
                dataGroup.remove(line);
            }
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
            progressive: progressive ? Math.round(dataIndex / progressive) : 0,
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

    // FIXME
    // 公用方法?
    function isEmptyValue(val, axisType) {
        return axisType === 'category'
            ? val == null
            : (val == null || isNaN(val)); // axisType === 'value'
    }

    return ParallelView;
});