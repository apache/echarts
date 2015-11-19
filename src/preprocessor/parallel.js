define(function (require) {

    var zrUtil = require('zrender/core/util');

    // TODO
    //
    // parallelAxis: [  // 根据dim需求自动补全 parallelAxis，自动赋值已有axisoption。
    //                  // 找出所有引用axis的 parallel option，来决定如何补全。
    //                  // 但是这步在这里做比较难，在后面做比较麻烦。
    //     {
    //         axisLine: [],
    //         axisLabel: []
    //         parallelIndex: 0  // ??? 是axis引用到coord，还是coord引用到axis？
    //     }
    // ],
    // parallel: [ // 如果没有写parallel则自动创建。FIXME 是不是应该强制用户写，自动创建埋bug？
    //     {
    //         dimensions: 3                 // number表示 count, 根据dimensionCount创建 []。
    //                     ['dim1', 'dim3', {name: 'dim0', type: 'category'}], // FIXME 某列是category怎么指定？
    //                                      // 默认dim type 是value。
    //
    //         parallelAxisIndex: [3, 1], // TODO 如果不设置则根据parallelAxisMap创建此项，
    //                                    // 如果没有parallelAxisMap则顺序引用。
    //                                    // TODO 如果设置了 parallelAxisIndex 则此项无效。
    //                             {   // 根据parallelAxisMap创建 []
    //                                 dim1: 3
    //                                 dim3: 1
    //                                 others: 0 // 不配other也取parallelAxis[0]。
    //                             }
    //     }
    // ],
    // series: [
    //     {
    //         parallelIndex: 0, // 缺省则0。series引用到axis，还是引用到coord？
    //         data: [
    //             [22, 23, 34, 6, 19],
    //             [22, 23, 34, 6, 19]
    //         ]
    //     }
    // ]

    return function (option) {

        // Create a parallel coordinate if not exists.

        if (option.parallel) {
            return;
        }

        var hasParallelSeries = false;

        zrUtil.each(option.series, function (seriesOpt) {
            if (seriesOpt && seriesOpt.type === 'parallel') {
                hasParallelSeries = true;
            }
        });

        if (hasParallelSeries) {
            option.parallel = [{}];
        }
    };
});