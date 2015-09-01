define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var ComponentModel = require('./Component');

    var SeriesModel = ComponentModel.extend({

        type: '',

        /**
         * @readOnly
         */
        seriesIndex: 0,

        /**
         * @readOnly
         */
        name: '',

        // coodinateSystem will be injected in the echarts/CoordinateSystem
        coordinateSystem: null,

        /**
         * @type {Object}
         * @protected
         */
        defaultOption: null,

        init: function (option, parentModel, ecModel, dependentModels, seriesIndex) {

            /**
             * @type {number}
             */
            this.seriesIndex = seriesIndex;

            this.mergeDefaultAndTheme(option, ecModel);

            var seriesName = this.get('name');
            if (seriesName == null) {
                seriesName = this.get('type') + '' + seriesIndex;
            }
            this.name += seriesName + '';

            /**
             * @type {module:echarts/data/List|module:echarts/data/Tree|module:echarts/data/Graph}
             * @private
             */
            this._data = this.getInitialData(option, ecModel);

            this._dataBeforeProcessing = this._data.clone();
        },

        mergeDefaultAndTheme: function (option, ecModel) {
            zrUtil.merge(
                option,
                ecModel.getTheme().get(ComponentModel.parseComponentType(this.type).sub)
            );
            zrUtil.merge(option, this.defaultOption);
        },

        mergeOption: function (newSeriesOption, ecModel) {
            this._data = this.getInitialData(newSeriesOption, ecModel);
        },

        /**
         * Init a data structure from data related option in series
         * Must be overwritten
         */
        getInitialData: function () {},

        getData: function () {
            return this._data;
        },

        restoreData: function () {
            this._data = this._dataBeforeProcessing.clone();
        }
    });

    return SeriesModel;
});