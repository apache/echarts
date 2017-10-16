import MarkerModel from './MarkerModel';

export default MarkerModel.extend({

    type: 'markArea',

    defaultOption: {
        zlevel: 0,
        // PENDING
        z: 1,
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
                // color and borderColor default to use color from series
                // color: 'auto'
                // borderColor: 'auto'
                borderWidth: 0
            }
        }
    }
});