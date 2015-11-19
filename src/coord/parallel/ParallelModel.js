define(function(require) {

    var zrUtil = require('zrender/core/util');
    var Component = require('../../model/Component');

    require('./AxisModel');

    var VALID_DIM_TYPES = {value: 1, category: 1};

    Component.extend({

        type: 'parallel',

        /**
         * @type {module:echarts/coord/parallel/Parallel}
         */
        coordinateSystem: null,

        defaultOption: {
            show: false,

            dimensions: 5,            // {number} 表示 dim数，如设为 3 会自动转化成 ['dim0', 'dim1', 'dim2']
                                      // {Array.<string>} 表示哪些dim，如 ['dim3', 'dim2']
                                      // {Array.<Object>} 表示哪些dim，如 [{name: 'dim3', axisType: 'category', ...]
            parallelAxisIndex: null,  // {Array.<number>} 表示引用哪些axis，如 [2, 1, 4]
                                      // {Object} 表示 mapping，如{dim1: 3, dim3: 1, others: 0}，others不设则自动取0

            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,
            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,

            layout: 'horizontal',      // 'horizontal' or 'vertical'

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

            var parallelAxisIndex = thisOption.parallelAxisIndex;
            var dimensions = thisOption.dimensions;

            dimensions = completeDimensions(dimensions);
            parallelAxisIndex = completeParallelAxisIndexByMapping(
                parallelAxisIndex, dimensions
            );
            parallelAxisIndex = completeParallelAxisIndexWhenNone(
                parallelAxisIndex, dimensions
            );

            thisOption.dimensions = dimensions;
            thisOption.parallelAxisIndex = parallelAxisIndex;
        },

        /**
         * Whether series is in this coordinate system.
         */
        containsSeries: function (seriesModel, ecModel) {
            var parallelIndex;
            return seriesModel.get('coordinateSystem') === 'parallel'
                && (parallelIndex = seriesModel.get('parallelIndex')) != null
                && ecModel.getComponent('parallel', parallelIndex) === this;
        }

    });

    function completeDimensions(dimensions) {
        // If dimensions is not array, represents dimension count.
        // Generate dimensions by dimension count.

        if (!zrUtil.isArray(dimensions)) {
            var count = dimensions;
            dimensions = [];
            for (var i = 0; i < count; i++) {
                dimensions.push('dim' + i);
            }
        }

        for (var i = 0; i < dimensions.length; i++) {
            var dim = dimensions[i];
            // dim might be string, represent dim name.
            if (!zrUtil.isObject(dim)) {
                dim = dimensions[i] = {name: dim};
            }
            if (!VALID_DIM_TYPES[dim.axisType]) {
                dim.axisType = 'value';
            }
        }

        return dimensions;
    }

    function completeParallelAxisIndexByMapping(parallelAxisIndex, dimensions) {
        // If parallelAxisIndex is {}, represents mapping.
        // like: {dim1: 3, dim3: 1, others: 0}
        // Generate parallelAxisIndex by mapping.

        if (zrUtil.isObject(parallelAxisIndex)
            && !zrUtil.isArray(parallelAxisIndex)
        ) {
            var mapping = parallelAxisIndex;
            parallelAxisIndex = [];

            var otherAxisIndex = 0; // Others default 0.
            zrUtil.each(mapping, function (axisIndex, dim) {
                var dimIndex = getDimIndex(dimensions, dim);
                if (dimIndex >= 0) {
                    parallelAxisIndex[dimIndex] = dim;
                }
                else if (dim === 'others') {
                    otherAxisIndex = axisIndex;
                }
            });

            // Complete others.
            zrUtil.each(parallelAxisIndex, function (axisIndex, idx) {
                if (axisIndex == null) {
                    parallelAxisIndex[idx] = otherAxisIndex;
                }
            });
        }

        return parallelAxisIndex;
    }

    function getDimIndex(dimensions, dimName) {
        for (var i = 0; i < dimensions.length; i++) {
            if (dimensions[i] === dimName) {
                return i;
            }
        }
        return -1;
    }

    function completeParallelAxisIndexWhenNone(parallelAxisIndex, dimensions) {
        if (!zrUtil.isObject(parallelAxisIndex)
            || !zrUtil.isArray(parallelAxisIndex)
        ) {
            parallelAxisIndex = [];
        }

        if (parallelAxisIndex.length !== dimensions.length) {
            // TODO
        }

        return parallelAxisIndex;
    }

});