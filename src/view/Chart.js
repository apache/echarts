define(function (require) {

    var Group = require('zrender/container/Group');
    var componentUtil = require('../util/component');

    function Chart() {

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = new Group();

        /**
         * @type {string}
         * @readOnly
         */
        this.uid = componentUtil.getUID('viewChart');
    }

    Chart.prototype = {

        type: 'chart',

        /**
         * Init the chart
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         */
        init: function (ecModel, api) {},

        /**
         * Render the chart
         * @param  {module:echarts/model/Series} seriesModel
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         * @param  {Object} payload
         */
        render: function (seriesModel, ecModel, api, payload) {},

        /**
         * Highlight series or specified data item
         * @param  {module:echarts/model/Series} seriesModel
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         * @param  {Object} payload
         */
        highlight: function (seriesModel, ecModel, api, payload) {
            if (seriesModel.get('legendHoverLink')) {
                toggleHighlight(seriesModel.getData(), payload, 'emphasis');
            }
        },

        /**
         * Downplay series or specified data item
         * @param  {module:echarts/model/Series} seriesModel
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         * @param  {Object} payload
         */
        downplay: function (seriesModel, ecModel, api, payload) {
            if (seriesModel.get('legendHoverLink')) {
                toggleHighlight(seriesModel.getData(), payload, 'normal');
            }
        },

        /**
         * Remove self
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         */
        remove: function (ecModel, api) {
            this.group.removeAll();
        },

        /**
         * Dispose self
         * @param  {module:echarts/model/Global} ecModel
         * @param  {module:echarts/ExtensionAPI} api
         */
        dispose: function () {}
    };

    var chartProto = Chart.prototype;
    chartProto.updateView
        = chartProto.updateLayout
        = chartProto.updateVisual
        = function (seriesModel, ecModel, api, payload) {
            this.render(seriesModel, ecModel, api, payload);
        };

    /**
     * @param  {module:echarts/data/List} data
     * @param  {Object} payload
     * @param  {string} state 'normal'|'emphasis'
     * @inner
     */
    function toggleHighlight(data, payload, state) {
        if (payload.dataIndex != null) {
            var el = data.getItemGraphicEl(payload.dataIndex);
            el && el.trigger(state);
        }
        else if (payload.name) {
            var dataIndex = data.indexOfName(payload.name);
            var el = data.getItemGraphicEl(dataIndex);
            el && el.trigger(state);
        }
        else {
            data.eachItemGraphicEl(function (el) {
                el.trigger(state);
            });
        }
    }

    // Enable Chart.extend.
    componentUtil.enableClassExtend(Chart);

    // Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
    componentUtil.enableClassManagement(Chart, {registerWhenExtend: true});

    return Chart;
});