define(function (require) {

    return require('./MarkerModel').extend({

        type: 'markPoint',

        defaultOption: {
            zlevel: 0,
            z: 5,
            symbol: 'pin',
            symbolSize: 50,
            //symbolRotate: 0,
            //symbolOffset: [0, 0]
            tooltip: {
                trigger: 'item'
            },
            label: {
                normal: {
                    show: true,
                    position: 'inside'
                },
                emphasis: {
                    show: true
                }
            },
            itemStyle: {
                normal: {
                    borderWidth: 2
                }
            }
        }
    });
});