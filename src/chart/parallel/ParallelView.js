define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

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

            data.diff(oldData)
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            // Update style
            data.eachItemGraphicEl(function (elGroup, idx) {
                var itemModel = data.getItemModel(idx);
                var lineStyleModel = itemModel.getModel('lineStyle.normal');
                elGroup.eachChild(function (child) {
                    child.useStyle(zrUtil.extend(
                        lineStyleModel.getLineStyle(),
                        {
                            fill: null,
                            stroke: data.getItemVisual(idx, 'color'),
                            opacity: data.getItemVisual(idx, 'opacity')
                        }
                    ));
                });
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
                var values = data.getValues(dimensions, newDataIndex);
                var elGroup = new graphic.Group();
                dataGroup.add(elGroup);

                eachAxisPair(
                    values, dimensions, coordSys,
                    function (pointPair, pairIndex) {
                        // FIXME
                        // init animation
                        if (pointPair) {
                            elGroup.add(createEl(pointPair));
                        }
                    }
                );

                data.setItemGraphicEl(newDataIndex, elGroup);
            }

            function update(newDataIndex, oldDataIndex) {
                var values = data.getValues(dimensions, newDataIndex);
                var elGroup = oldData.getItemGraphicEl(oldDataIndex);
                var newEls = [];
                var elGroupIndex = 0;

                eachAxisPair(
                    values, dimensions, coordSys,
                    function (pointPair, pairIndex) {
                        var el = elGroup.childAt(elGroupIndex++);

                        if (pointPair && !el) {
                            newEls.push(createEl(pointPair));
                        }
                        else if (pointPair) {
                            graphic.updateProps(el, {
                                shape: {
                                    points: pointPair
                                }
                            }, seriesModel, newDataIndex);
                        }
                    }
                );

                // Remove redundent els
                for (var i = elGroup.childCount() - 1; i >= elGroupIndex; i--) {
                    elGroup.remove(elGroup.childAt(i));
                }

                // Add new els
                for (var i = 0, len = newEls.length; i < len; i++) {
                    elGroup.add(newEls[i]);
                }

                data.setItemGraphicEl(newDataIndex, elGroup);
            }

            function remove(oldDataIndex) {
                var elGroup = oldData.getItemGraphicEl(oldDataIndex);
                dataGroup.remove(elGroup);
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

    function eachAxisPair(values, dimensions, coordSys, cb) {
        for (var i = 0, len = dimensions.length - 1; i < len; i++) {
            var dimA = dimensions[i];
            var dimB = dimensions[i + 1];
            var valueA = values[i];
            var valueB = values[i + 1];

            cb(
                (isEmptyValue(valueA, coordSys.getAxis(dimA).type)
                    || isEmptyValue(valueB, coordSys.getAxis(dimB).type)
                )
                    ? null
                    : [
                        coordSys.dataToPoint(valueA, dimA),
                        coordSys.dataToPoint(valueB, dimB)
                    ],
                i
            );
        }
    }

    function createEl(pointPair) {
        return new graphic.Polyline({
            shape: {points: pointPair},
            silent: true
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