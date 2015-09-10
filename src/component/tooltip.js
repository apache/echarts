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

        render: function (tooltipModel) {
            this._tooltipModel = tooltipModel;

            this._tooltipContent.hide();
        },

        _mouseMove: function (e) {
            var el = e.target;
            var tooltipContent = this._tooltipContent;
            if (! el) {

                if (tooltipContent.isShow()) {
                    this._hideTimeout =
                        setTimeout(zrUtil.bind(tooltipContent.hide, tooltipContent), 1000);
                }

                return;
            }

            var dataItem = el.data;

            if (!dataItem) {
                return;
            }

            clearTimeout(this._hideTimeout);

            this._showTooltip(dataItem, e);
        },

        _showTooltip: function (dataItem, e) {

            var seriesModel = dataItem.parentModel;

            if (!seriesModel) {
                return;
            }

            var tooltipContent = this._tooltipContent;

            var tooltipModel = dataItem.getModel('tooltip');

            // If series model
            if (tooltipModel.parentModel) {
                tooltipModel.parentModel.parentModel = this._tooltipModel;
            }
            else {
                tooltipModel.parentModel = this._tooltipModel;
            }

            tooltipContent.show(tooltipModel);

            tooltipContent.setContent(
                seriesModel.formatTooltipHTML(dataItem)
            );

            var x = e.offsetX + 20;
            var y = e.offsetY + 20;
            tooltipContent.moveTo(x, y);
        },

        dispose: function (api) {

            var zr = api.getZr();

            zr.off('mousemove', this._mouseMove, this);
        }
    })
});