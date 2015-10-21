define(function(require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var layout = require('../../util/layout');
    var Group = graphic.Group;
    var Rect = graphic.Rect;

    return require('../../echarts').extendChartView({

        type: 'treemap',

        /**
         * @override
         */
        init: function () {

        },

        /**
         * @override
         */
        render: function (seriesModel, ecModel, api) {
            var contentGroup = new Group();

            this._renderNodes(seriesModel.getViewRoot(), contentGroup);

            this.group.add(contentGroup);

            layout.positionGroup(
                contentGroup,
                {
                    x: seriesModel.get('x'),
                    y: seriesModel.get('y'),
                    x2: seriesModel.get('x2'),
                    y2: seriesModel.get('y2')
                },
                {
                    width: api.getWidth(),
                    height: api.getHeight()
                }
            );
        },

        /**
         * @private
         */
        _renderNodes: function (node, parentGroup) {
            var layout = node.getLayout();
            var thisWidth = layout.width;
            var thisHeight = layout.height;
            var viewChildren = node.viewChildren;

            var group = new Group();
            group.position = [layout.x, layout.y];

            // Background
            var itemModel = node.getItemModel();
            // FIXME
            // levels configuration ?????
            var borderColor = itemModel.get('itemStyle.normal.borderColor')
                || itemModel.get('itemStyle.normal.gapColor');
            group.add(new Rect({
                shape: {x: 0, y: 0, width: thisWidth, height: thisHeight},
                style: {fill: borderColor}
            }));

            // No children, render content.
            if (!viewChildren || !viewChildren.length) {
                var borderWidth = layout.borderWidth;
                group.add(new Rect({
                    shape: {
                        x: borderWidth,
                        y: borderWidth,
                        width: thisWidth - 2 * borderWidth,
                        height: thisHeight - 2 * borderWidth
                    },
                    style: {
                        fill: node.getVisual('color', true)
                    }
                    // ?????????? text
                }));
            }
            // Render children recursively.
            else {
                zrUtil.each(viewChildren, function (child) {
                    this._renderNodes(child, group);
                }, this);
            }

            parentGroup.add(group);
        },

        /**
         * @override
         */
        remove: function () {
            // var group = this.group;
            // group.remove(this._polyline);
            // group.remove(this._polygon);
            // this._dataSymbol.remove(true);
        }

    });
});