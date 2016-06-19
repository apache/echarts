define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var BrushController = require('../helper/BrushController');
    var echarts = require('../../echarts');

    return echarts.extendComponentView({

        type: 'brush',

        init: function (ecModel, api) {
            var zr = api.getZr();

            /**
             * @readOnly
             * @type {module:echarts/model/Global}
             */
            this.ecModel = ecModel;

            /**
             * @readOnly
             * @type {module:echarts/ExtensionAPI}
             */
            this.api = api;

            /**
             * @readOnly
             * @type {module:echarts/component/brush/BrushModel}
             */
            this.model;

            /**
             * @private
             * @type {module:zrender/container/Group}
             */
            var controllerGroup = this._controllerGroup = new graphic.Group();
            zr.add(controllerGroup);

            /**
             * @private
             * @type {module:echarts/component/helper/BrushController}
             */
            (this._brushController = new BrushController(zr))
                .on('brush', zrUtil.bind(this._onBrush, this))
                .mount(controllerGroup, false);
        },

        /**
         * @override
         */
        render: function (brushModel) {
            this.model = brushModel;
            this._brushController
                .enableBrush(brushModel.brushOption)
                .updateCovers(brushModel.brushRanges);
        },

        /**
         * @override
         */
        updateView: function (brushModel, ecModel, api, payload) {
            // Do not update controller when drawing.
            payload.$from !== this.model.id && this._brushController
                .enableBrush(brushModel.brushOption)
                .updateCovers(brushModel.brushRanges);
        },

        /**
         * @override
         */
        updateLayout: function (brushModel, ecModel) {
            ecModel.eachComponent({mainType: 'geo'}, function (geoModel) {
                var coord = geoModel.coordinateSystem;
                console.log(coord.getBoundingRect());
            });
        },

        /**
         * @override
         */
        dispose: function () {
            this._brushController.dispose();
        },

        /**
         * @private
         */
        _onBrush: function (brushRanges, opt) {
            var modelId = this.model.id;

            // Action is not dispatched on drag end, because the drag end
            // emits the same params with the last drag move event, and
            // may have some delay when using touch pad.
            (!opt.isEnd || opt.removeOnClick) && this.api.dispatchAction({
                type: 'brush',
                brushId: modelId,
                brushRanges: zrUtil.clone(brushRanges),
                $from: modelId
            });
        }

    });

});