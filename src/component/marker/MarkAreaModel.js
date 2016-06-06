define(function (require) {

    return require('./MarkerModel').extend({

        type: 'markArea',

        defaultOption: {
            zlevel: 0,
            z: 5,
            tooltip: {
                trigger: 'item'
            },
            // markArea should fixed on the coordinate system
            animation: false,
            label: {
                normal: {
                    show: true,
                    position: 'top'
                },
                emphasis: {
                    show: true,
                    position: 'top'
                }
            },
            itemStyle: {
                normal: {
                    opacity: 0.4
                }
            }
        }
    });
});