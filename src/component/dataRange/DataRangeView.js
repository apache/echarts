define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var parsePercent = require('../../util/number').parsePercent;

    return echarts.extendComponentView({

        type: 'dataRange',

        /**
         * @readOnly
         * @type {Object}
         */
        autoPositionValues: {left: 1, right: 1, top: 1, bottom: 1},

        init: function () {
            /**
             * @private
             * @type {Object}
             */
            this._updatableShapes = {};

            /**
             * @protected
             * @type {module:echarts/component/dataZoom/DataZoomLayout}
             */
            this.layout;

            /**
             * @private
             * @type {string}
             */
            this._orient;
        },

        /**
         * @protected
         */
        initLayout: function () {
            var dataRangeModel = this.dataRangeModel;
            var orient = dataRangeModel.get('orient');
            var api = this.api;
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();
            var x = dataRangeModel.get('x');
            var y = dataRangeModel.get('y');

            this.layout = {
                orient: orient,
                maxWidth: this.autoPositionValues[x] ? ecWidth : ecWidth - x,
                ecWidth: ecWidth,
                ecHeight: ecHeight,
                x: x,
                y: y,
                itemWidth: parsePercent(dataRangeModel.get('itemWidth'), ecWidth),
                itemHeight: parsePercent(dataRangeModel.get('itemHeight'), ecHeight)
            };
        },

        /**
         * @protected
         */
        layoutOuter: function () {
            // Depends on contentLayout
            var layout = this.layout;
            var contentLayout = layout.content;
            var dataRangeModel = this.dataRangeModel;
            var x = layout.x;
            var y = layout.y;
            var ecWidth = layout.ecWidth;
            var ecHeight = layout.ecHeight;

            layout.x = x === 'left'
                ? 0
                : x === 'right'
                ? ecWidth - contentLayout.width
                : parsePercent(x, ecWidth);
            layout.y = y === 'top'
                ? 0
                : y === 'bottom'
                ? ecHeight - contentLayout.height
                : parsePercent(y, ecHeight);

            // TODO
            // 考虑padding boder
        },

        /**
         * @protected
         */
        render: function (dataRangeModel, ecModel, api) {

            this.dataRangeModel = dataRangeModel;
            this.ecModel = ecModel;
            this.api = api;

            this.group.removeAll();

            if (!dataRangeModel.get('show')) {
                return;
            }

            // FIXME
            // padding
            // var padding = this.reformCssArray(this.dataRangeOption.padding);

            // TODO : TEST
            // 文字不超出边界，例如x 'right' orient 'vertical'时。

            this.initLayout();
            this.layoutContent();
            this.layoutOuter();

            this.renderOuter();
            this.renderContent();
        },

        /**
         * @protected
         */
        renderOuter: function () {
            var layout = this.layout;
            var contentLayout = layout.content;
            var dataRangeModel = this.dataRangeModel;
            var group = this.group;

            group.add(new graphic.Rect({
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                silent: true,
                shape: {
                    x: -layout.offsetX,
                    y: -layout.offsetY,
                    width: contentLayout.width,
                    height: contentLayout.height
                },
                style: {
                    fill: dataRangeModel.get('backgroundColor'),
                    stroke: dataRangeModel.get('borderColor'),
                    lineWidth: dataRangeModel.get('borderWidth')
                }
            }));

            group.position[0] = layout.x + layout.offsetX;
            group.position[1] = layout.y + layout.offsetY;
        },

        /**
         * @protected
         * @abstract
         */
        layoutContent: zrUtil.noop,

        /**
         * @protected
         * @abstract
         */
        renderContent: zrUtil.noop

    });
});