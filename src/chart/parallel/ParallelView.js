define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');
    var each = zrUtil.each;

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
            var dimensionNames = coordSys.getDimensionNames();

            // var hasAnimation = ecModel.get('animation');
            var lineStyleModel = seriesModel.getModel('lineStyle.normal');
            var lineStyle = zrUtil.extend(
                lineStyleModel.getLineStyle(),
                {stroke: data.getVisual('color')}
            );

            data.diff(oldData)
                .add(add)
                .update(update)
                .remove(remove)
                .execute();

            this._data = data;

            function add(newDataIndex) {
                var values = data.getValues(dimensionNames, newDataIndex);
                var els = [];

                eachAxisPair(
                    values, dimensions, coordSys,
                    function (pointPair, pairIndex) {
                        // FIXME
                        // init animation
                        if (pointPair) {
                            els[pairIndex] = createEl(pointPair, dataGroup);
                        }
                    }
                );

                setStyle(els, data, newDataIndex, lineStyle);
                data.setItemGraphicEl(newDataIndex, els);
            }

            function update(newDataIndex, oldDataIndex) {
                var values = data.getValues(dimensionNames, newDataIndex);
                var els = oldData.getItemGraphicEl(oldDataIndex);

                eachAxisPair(
                    values, dimensions, coordSys,
                    function (pointPair, pairIndex) {
                        var el = els[pairIndex];

                        if (pointPair && !el) {
                            els[pairIndex] = createEl(pointPair, dataGroup);
                        }
                        else if (pointPair) {
                            el.setShape({points: pointPair});
                        }
                        else {
                            els[pairIndex] = null;
                            dataGroup.remove(el);
                        }
                    }
                );

                // Remove redundent els
                for (var i = axisPairCount(dimensions), len = els.length; i < len; i++) {
                    els[i] = null;
                    dataGroup.remove(els[i]);
                }

                setStyle(els, data, newDataIndex, lineStyle);
                data.setItemGraphicEl(newDataIndex, els);
            }

            function remove(oldDataIndex) {
                var els = oldData.getItemGraphicEl(oldDataIndex);
                each(els, function (el) {
                    el && dataGroup.remove(el);
                });
            }
        },

        /**
         * @override
         */
        remove: function () {
            this._dataGroup && this._dataGroup.removeAll();
        }
    });

    function axisPairCount(dimensions) {
        return dimensions.length - 1;
    }

    function eachAxisPair(values, dimensions, coordSys, cb) {
        for (var i = 0, len = axisPairCount(dimensions); i < len; i++) {
            var dimA = dimensions[i];
            var dimB = dimensions[i + 1];
            var valueA = values[i];
            var valueB = values[i + 1];

            cb(
                (isEmptyValue(valueA, dimA) || isEmptyValue(valueB, dimB))
                    ? null
                    : [
                        coordSys.dataToPoint(valueA, dimA.name),
                        coordSys.dataToPoint(valueB, dimB.name)
                    ],
                i
            );
        }
    }

    function createEl(pointPair, dataGroup) {
        var el = new graphic.Polyline({
            shape: {points: pointPair},
            silent: true
        });
        dataGroup.add(el);
        return el;
    }

    function setStyle(els, data, dataIndex, lineStyle) {
        each(els, function (el, pairIndex) {
            if (!el) {
                return;
            }
            el.setStyle(lineStyle);
            el.setStyle('opacity', data.getItemVisual(dataIndex, 'opacity', true));
        });
    }

    // FIXME
    // 公用方法?
    function isEmptyValue(val, dim) {
        return dim.axisType === 'category'
            ? val == null
            : (val == null || isNaN(val)); // axisType === 'value'
    }

    return ParallelView;
});