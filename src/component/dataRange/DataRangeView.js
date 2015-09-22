define(function (require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var textContain = require('zrender/contain/text');

    return echarts.extendComponentView({

        type: 'dataRange',

        /**
         * @readOnly
         * @type {Object}
         */
        autoPositionValues: {left: 1, right: 1, top: 1, bottom: 1},

        init: function (api) {
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
        getTextRect: function (text) {
            var textStyleModel = this.textStyleModel;
            return textContain.getTextRect(
                text,
                textStyleModel.get('font'),
                textStyleModel.get('align'),
                textStyleModel.get('baseline')
            );
        },

        /**
         * @protected
         */
        initLayout: function () {
            var dataRangeModel = this.dataRangeModel;
            var orient = dataRangeModel.get('orient');
            var x = dataRangeModel.get('x');
            var y = dataRangeModel.get('y');
            var api = this.api;
            var ecWidth = api.getWidth();
            var ecHeight = api.getHeight();

            this.layout = {
                orient: orient,
                maxWidth: this.autoPositionValues[x] ? ecWidth : ecWidth - x,
                ecWidth: ecWidth,
                ecHeight: ecHeight,
                x: x,
                y: y
            };
        },

        /**
         * @private
         */
        _layoutOuter: function () {
            // Depends on contentLayout
            var layout = this.layout;
            var contentLayout = layout.content;
            var dataRangeModel = this.dataRangeModel;
            var x = dataRangeModel.get('x');
            var y = dataRangeModel.get('y');

            layout.x = x === 'left'
                ? 0
                : x === 'right'
                ? layout.ecWidth - contentLayout.width
                : x;
            layout.y = y === 'top'
                ? 0
                : y === 'bottom'
                ? layout.ecHeight - contentLayout.height
                : y;

            // TODO
            // 考虑padding boder
        },

        /**
         * @protected
         */
        render: function () {
            // FIXME
            // padding
            // var padding = this.reformCssArray(this.dataRangeOption.padding);

            // TODO : TEST
            // 文字不超出边界，例如x 'right' orient 'vertical'时。

            var dataRangeModel = this.dataRangeModel;
            var layout = this.layout;

            this.initLayout();
            this.layoutContent();
            this._layoutOuter();

            this.group.push(new graphic.Rect({
                // zlevel: this.getZlevelBase(),
                // z: this.getZBase(),
                hoverable: false,
                shape: {
                    x: layout.x,
                    y: layout.y,
                    width: layout.width,
                    height: layout.height
                },
                style: {
                    brushType: dataRangeModel.get('borderWidth') === 0 ? 'fill' : 'both',
                    color: dataRangeModel.get('backgroundColor'),
                    strokeColor: dataRangeModel.get('borderColor'),
                    lineWidth: dataRangeModel.get('borderWidth')
                }
            }));

            this.rendercontent();
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