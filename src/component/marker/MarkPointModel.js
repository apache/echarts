import MarkerModel from './MarkerModel';

export default MarkerModel.extend({

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
            show: true,
            position: 'inside'
        },
        itemStyle: {
            borderWidth: 2
        },
        emphasis: {
            label: {
                show: true
            }
        }
    }
});