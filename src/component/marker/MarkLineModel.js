define(function (require) {

    return require('./MarkerModel').extend({

        type: 'markLine',

        defaultOption: {
            zlevel: 0,
            z: 5,

            symbol: ['circle', 'arrow'],
            symbolSize: [8, 16],

            //symbolRotate: 0,

            precision: 2,
            tooltip: {
                trigger: 'item'
            },
            label: {
                normal: {
                    show: true,
                    position: 'end'
                },
                emphasis: {
                    show: true
                }
            },
            lineStyle: {
                normal: {
                    type: 'dashed'
                },
                emphasis: {
                    width: 3
                }
            },
            animationEasing: 'linear'
        }
    });
});