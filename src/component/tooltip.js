define(function (require) {

    var TooltipContent = require('./tooltip/TooltipContent');
    var zrUtil = require('zrender/core/util');

    require('./tooltip/TooltipModel');

    require('../echarts').extendComponentView({

        type: 'tooltip',

        init: function (ecModel, api) {
            var zr = api.getZr();

            zr.on('mousemove', this._mouseMove, this);

            this._tooltipContent = new TooltipContent(api.getDom());
        },

        render: function (tooltipModel, ecModel, api) {
            this._tooltipModel = tooltipModel;

            this._ecModel = ecModel;

            this._api = api;

            this._tooltipContent.hide();
        },

        _mouseMove: function (e) {
            var el = e.target;
            var tooltipModel = this._tooltipModel;
            var trigger = tooltipModel.get('trigger');

            if (!tooltipModel) {
                return;
            }

            if (!el || !el.data) {

                this._tooltipContent.hideLater(tooltipModel.get('hideDelay'));

                return;
            }

            var dataItem = el.data;

            if (trigger === 'item') {
                this._showItemTooltip(dataItem, e);
            }
            else {
                this._showAxisTooltip(e);
            }
        },

        /**
         * Show tooltip on axis
         * @param {Object} e
         */
        _showAxisTooltip: function (e) {
            var ecModel = this._ecModel;

            
        },

        /**
         * Show tooltip on item
         * @param {module:echarts/model/Model}
         * @param {Object} e
         */
        _showItemTooltip: function (dataItem, e) {

            var seriesModel = dataItem.parentModel;

            if (!seriesModel) {
                return;
            }
            var rootTooltipModel = this._tooltipModel;
            var showContent = rootTooltipModel.get('showContent');

            var tooltipContent = this._tooltipContent;

            var tooltipModel = dataItem.getModel('tooltip');

            // If series model
            if (tooltipModel.parentModel) {
                tooltipModel.parentModel.parentModel = rootTooltipModel;
            }
            else {
                tooltipModel.parentModel = this._tooltipModel;
            }

            if (showContent) {
                tooltipContent.show(tooltipModel);

                tooltipContent.setContent(
                    seriesModel.formatTooltipHTML(dataItem)
                );

                var x = e.offsetX + 20;
                var y = e.offsetY + 20;
                tooltipContent.moveTo(x, y);
            }
        },

        dispose: function (api) {
            api.getZr().off('mousemove', this._mouseMove, this);
        }
    })
});