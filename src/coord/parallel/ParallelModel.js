define(function(require) {

    var zrUtil = require('zrender/core/util');

    require('./AxisModel');

    require('../../echarts').extendComponentModel({

        type: 'parallel',

        /**
         * @type {module:echarts/coord/parallel/Parallel}
         */
        coordinateSystem: null,

        defaultOption: {
            show: false,

            dimensions: 5,            // {number} 表示 dim数，如设为 3 会自动转化成 ['dim0', 'dim1', 'dim2']
                                      // {Array.<string>} 表示哪些dim，如 ['dim3', 'dim2']
            parallelAxisIndex: null,  // {Array.<number>} 表示引用哪些axis，如 [2, 1, 4]
                                      // {Object} 表示 mapping，如{dim1: 3, dim3: 1, others: 0}，others不设则自动取0

            zlevel: 0,                  // 一级层叠
            z: 0,                       // 二级层叠
            x: 80,
            y: 60,
            x2: 80,
            y2: 60,

            layout: 'horizontal',      // 'horizontal' or 'vertical'

            // width: {totalWidth} - x - x2,
            // height: {totalHeight} - y - y2,
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 0,
            borderColor: '#ccc'
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
                var dimIndex = zrUtil.indexOf(dimensions, dim);
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