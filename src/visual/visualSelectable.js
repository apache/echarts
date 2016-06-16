define(function(require) {

    /**
     * Usage:
     *      SomeSeries = visualSelectable(SomeSeries);
     *
     * In option:
     *      `option.series.selectedDataIndex`
     *          is taken to specified selected data indices when setOption.
     *          If option.series.selectedDataIndex is null/undefined,
     *          nothing selected.
     *          If option.series.selectedDataIndex is [3, 4, 6], data
     *          items at indices 3, 4, 6 is selected.
     *      `option.series.visualSelectable`
     *          is taken to enable or disable select for a selectable series,
     *          default true.
     *      `option.series.visualInSelect` and
     *      `option.series.visualOutOfSelect`
     *          is taken to specify visuals in those states.
     */

    var echarts = require('../echarts');
    var zrUtil = require('zrender/core/util');
    var visualSolution = require('./visualSolution');

    var each = zrUtil.each;

    var STATE_LIST = ['visualInSelect', 'visualOutOfSelect'];
    var MAP_ATTR = '\0__selectedMap'; // forbiden user access.


    /**
     * defaultOption can be overrided in series.
     * @type {Object}
     */
    var defaultOption = {
        visualSelectable: true,
        visualInSelect: {
        },
        visualOutOfSelect: {
            color: '#ccc'
        }
    };


    /**
     * Register the action if this modules required.
     * payload: {
     *      seriesIndex: number, or,
     *      seriesId: string, or,
     *      seriesName: string,
     *      dataIndex: Array, or,
     *      dataIndexMap: Array,
     * }
     */
    echarts.registerAction(
        {type: 'select', event: 'select', update: 'updateView'},
        function (payload, ecModel) {
            var seriesList = ecModel.findComponents(
                {mainType: 'series', query: payload}
            );
            each(seriesList, function (seriesModel) {
                resetSelectedMapInAction(seriesModel, payload);
            });
        }
    );


    /**
     * Register the visual encoding if this modules required.
     */
    echarts.registerVisual(echarts.PRIORITY.VISUAL.SELECT, function (ecModel) {

        ecModel.eachSeries(function (seriesModel) {
            var dataIndexMap = seriesModel[MAP_ATTR];

            if (!dataIndexMap) {
                return;
            }

            var visualMappings = visualSolution.createVisualMappings(
                seriesModel.option, STATE_LIST, function (mappingOption) {
                    mappingOption.mappingMethod = 'fixed';
                }
            );

            visualSolution.applyVisual(
                STATE_LIST, visualMappings, seriesModel.getData(), getValueState
            );

            function getValueState(dataIndex) {
                return dataIndexMap[dataIndex] ? 'visualInSelect' : 'visualOutOfSelect';
            }
        });
    });


    function visualSelectable(SeriesClz) {
        var proto = SeriesClz.prototype;

        // This method is only internally used in echarts.
        proto.getSelectedDataIndexMap = getSelectedDataIndexMap;

        var rawOptionUpdated = proto.optionUpdated;
        proto.optionUpdated = function () {
            var ret = rawOptionUpdated.apply(this, arguments);
            // Clear selectd each time setOption called.
            resetSelectedMapByDataIndices(this, this.option.selectedDataIndex);
            return ret;
        };

        zrUtil.defaults(proto.defaultOption, defaultOption);

        return SeriesClz;
    }

    function getSelectedDataIndexMap() {
        // Do not clone the big object.
        return this[MAP_ATTR];
    }

    function resetSelectedMapByDataIndices(seriesModel, dataIndices) {
        // Always clear when no option.selected.
        var dataIndexMap = seriesModel[MAP_ATTR] = null;

        if (dataIndices instanceof Array) {
            var dataIndexMap = seriesModel[MAP_ATTR] = Array(seriesModel.getData().count());
            each(dataIndices, function (dataIndex) {
                dataIndexMap[dataIndex] = 1;
            });
        }
    }

    function resetSelectedMapInAction(seriesModel, payload) {
        var dataIndexMap = payload.dataIndexMap;

        // Support dataIndexMap to reuse the big object to avoid GC frequently.
        if (dataIndexMap) {
            seriesModel[MAP_ATTR] = dataIndexMap;
        }
        else {
            resetSelectedMapByDataIndices(seriesModel, payload.dataIndex);
        }

        // FIXME
        // Do not reset option.selected here for performance
        // consideration. Do that in getOption or getSelected().
    }

    return visualSelectable;
});