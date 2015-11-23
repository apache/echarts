define(function (require) {

    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    var ParallelView = require('../../view/Chart').extend({

        type: 'parallel',

        init: function () {
        },

        render: function (seriesModel, ecModel, api, payload) {

            var data = seriesModel.getData();
            var oldData = this._data;
            var group = this.group;
            var coordSys = seriesModel.coordinateSystem;
            var dimensions = coordSys.dimensions;
            var dimensionNames = zrUtil.map(dimensions, function (dim) {
                return dim.name;
            });

            var dataGroup = this._dataGroup;
            if (!dataGroup) {
                this.group.add(
                    dataGroup = this._dataGroup = new graphic.Group()
                );
            }

            var hasAnimation = ecModel.get('animation');
            var isFirstRender = !oldData;

            var lineStyleModel = seriesModel.getModel('lineStyle.normal');

            var lineStyle = zrUtil.extend(
                lineStyleModel.getLineStyle(),
                {stroke: data.getVisual('color')}
            );

            // var onSectorClick = zrUtil.curry(
            //     updateDataSelected, this.uid, seriesModel, hasAnimation, api
            // );

            // var selectedMode = seriesModel.get('selectedMode');

            data.diff(oldData)
                .add(function (dataIndex) {
                    var values = data.getValues(dimensionNames, dataIndex);

                    var els = createEls(
                        dataGroup, values, dimensions, coordSys,
                        lineStyle, hasAnimation && !isFirstRender
                    );

                    data.setItemGraphicEl(dataIndex, els);
                })
                .update(function (newDataIndex, oldDataIndex) {
                    // var els = oldData.getItemGraphicEl(oldDataIndex);
                    // var values = data.getValues(dimensions, newDataIndex);

                    // updateEls(
                    //     els, dataGroup, values, dimensions, coordSys, lineStyle
                    // );

                    // api.updateGraphicEl(sector, {
                    //     points: layout
                    // });
                    // api.updateGraphicEl(labelLine, {
                    //     shape: {
                    //         points: labelLayout.linePoints
                    //     }
                    // });
                    // api.updateGraphicEl(labelText, {
                    //     style: {
                    //         x: labelLayout.x,
                    //         y: labelLayout.y
                    //     },
                    //     rotation: labelLayout.rotation
                    // });

                    // // Set none animating style
                    // labelText.setStyle({
                    //     textAlign: labelLayout.textAlign,
                    //     textBaseline: labelLayout.textBaseline,
                    //     textFont: labelLayout.font
                    // });

                    // sectorGroup.add(sector);
                    // data.setItemGraphicEl(newDataIndex, sector);

                    // group.add(labelLine);
                    // group.add(labelText);
                })
                .remove(function (idx) {
                    // var sector = oldData.getItemGraphicEl(idx);
                    // sectorGroup.remove(sector);
                })
                .execute();

            // // Make sure data els is on top of labels
            // group.remove(dataGroup);
            // group.add(dataGroup);

            this._updateAll(data, seriesModel);

            this._data = data;
        },

        _updateAll: function (data, seriesModel, hasAnimation) {
            // var selectedOffset = seriesModel.get('selectedOffset');
            // data.eachItemGraphicEl(function (sector, idx) {
            //     var itemModel = data.getItemModel(idx);
            //     var itemStyleModel = itemModel.getModel('itemStyle');
            //     var visualColor = data.getItemVisual(idx, 'color');

            //     sector.setStyle(
            //         zrUtil.extend(
            //             {
            //                 fill: visualColor
            //             },
            //             itemStyleModel.getModel('normal').getItemStyle()
            //         )
            //     );
            //     graphic.setHoverStyle(
            //         sector,
            //         itemStyleModel.getModel('emphasis').getItemStyle()
            //     );

            //     // Set label style
            //     var labelText = sector.__labelText;
            //     var labelLine = sector.__labelLine;
            //     var labelModel = itemModel.getModel('label.normal');
            //     var textStyleModel = labelModel.getModel('textStyle');
            //     var labelPosition = labelModel.get('position');
            //     var isLabelInside = labelPosition === 'inside';
            //     labelText.setStyle({
            //         fill: textStyleModel.get('color')
            //             || isLabelInside ? '#fff' : visualColor,
            //         text: seriesModel.getFormattedLabel(idx, 'normal')
            //             || data.getName(idx),
            //         textFont: textStyleModel.getFont()
            //     });
            //     labelText.attr('ignore', !labelModel.get('show'));
            //     // Default use item visual color
            //     labelLine.attr('ignore', !itemModel.get('labelLine.show'));
            //     labelLine.setStyle({
            //         stroke: visualColor
            //     });
            //     labelLine.setStyle(itemModel.getModel('labelLine').getLineStyle());

            //     toggleItemSelected(
            //         sector,
            //         data.getItemLayout(idx),
            //         itemModel.get('selected'),
            //         selectedOffset,
            //         hasAnimation
            //     );
            // });
        },

        remove: function () {
            this._dataGroup.remove();
        }
    });

    function createEls(dataGroup, values, dimensions, coordSys, lineStyle) {
        // FIXME
        // init animation

        var els = [];
        for (var i = 0, len = dimensions.length - 1; i < len; i++) {
            var dimA = dimensions[i];
            var dimB = dimensions[i + 1];
            var valueA = values[i];
            var valueB = values[i + 1];

            if (isEmptyValue(valueA, dimA) || isEmptyValue(valueB, dimB)) {
                continue;
            }

            var points = [
                coordSys.dataToPoint(valueA, dimA.name),
                coordSys.dataToPoint(valueB, dimB.name)
            ];

            dataGroup.add(els[i] = new graphic.Polyline({
                shape: {points: points},
                style: lineStyle,
                silent: true
            }));
        }
        return els;
    }

    // FIXME
    // 公用方法?
    function isEmptyValue(val, dim) {
        return dim.axisType === 'category'
            ? val == null
            : (val == null || isNaN(val)); // axisType === 'value'
    }

    // function updateEls(els, values, dimensions, coordSys) {
    //     // FIXME
    //     // update animation

    //     var els = [];
    //     for (var i = 0, len = dimensions.length - 1; i < len; i++) {
    //         var points = [
    //             coordSys.dataToPoint(values[i], dimensions[i]),
    //             coordSys.dataToPoint(values[i + 1], dimensions[i + 1])
    //         ];
    //         dataGroup.add(els[i] = new graphic.Polyline({
    //             points: points,
    //             style: lineStyle
    //         }));
    //         api.updateGraphicEl(sector, {
    //             points: layout
    //         });
    //     }


    //     return els;
    // }


    function getElProp() {

    }

    return ParallelView;
});