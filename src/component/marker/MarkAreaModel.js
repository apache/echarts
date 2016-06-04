define(function (require) {

    return require('./MarkerModel').extend({

        type: 'markArea',

        defaultOption: {
            zlevel: 0,
            z: 5,
            tooltip: {
                trigger: 'item'
            },
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