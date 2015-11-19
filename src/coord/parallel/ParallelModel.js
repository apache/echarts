define(function(require) {

    var zrUtil = require('zrender/core/util');
    var Component = require('../../model/Component');

    require('./AxisModel');

    Component.extend({

        type: 'parallel',

        dependencies: ['parallelAxis'],

        /**
         * @type {module:echarts/coord/parallel/Parallel}
         */
        coordinateSystem: null,

        /**
         * Each item like: {name: 'dimX', axisType: 'value', axisIndex: 2}
         * @type {Array.<Object>}
         * @readOnly
         */
        dimensions: null,

        defaultOption: {
            show: false,

            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,

            layout: 'horizontal',      // 'horizontal' or 'vertical'

            axisDefault: null,

            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            borderColor: '#ccc'
        },

        /**
         * @override
         */
        init: function (option, parentModel, ecModel, dependentModels, index) {
            Component.prototype.init.apply(this, arguments);

            this.mergeOption({});
        },

        /**
         * @override
         */
        mergeOption: function (newOption) {
            var thisOption = this.option;

            newOption && zrUtil.merge(thisOption, newOption);

            this._initDimensions();
        },

        /**
         * Whether series or axis is in this coordinate system.
         * @param {module:echarts/model/Series|module:echarts/coord/parallel/AxisModel} model
         * @param {module:echarts/model/Global} ecModel
         */
        contains: function (model, ecModel) {
            var parallelIndex = model.get('parallelIndex');
            return parallelIndex != null
                && ecModel.getComponent('parallel', parallelIndex) === this;
        },

        /**
         * @private
         */
        _initDimensions: function () {
            var dimensions = this.dimensions = [];

            var axisModels = zrUtil.filter(this.dependentModels.parallelAxis, function (axisModel) {
                // Can not use this.contains here, because
                // initialization has not been completed yet.
                return axisModel.get('parallelIndex') === this.componentIndex;
            });

            zrUtil.each(axisModels, function (axisModel) {
                dimensions.push({
                    name: axisModel.get('dim'),
                    axisType: axisModel.get('type'),
                    axisIndex: axisModel.componentIndex
                });
            });
        }

    });

});