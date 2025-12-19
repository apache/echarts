import echarts = require('echarts');

function init() {
    var myChart = echarts.init(document.getElementById('chart0'));

    const option: echarts.EChartsOption = {
        title: {
            text: 'ECharts Getting Started Example'
        },
        tooltip: {},
        xAxis: {
            data: ['a', 'b', 'c', 'd', 'e', 'f']
        },
        yAxis: {},
        series: [
            {
            name: 'sales',
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20]
            }
        ]
    };

    myChart.on('click', function (params) {
        console.log(params.name);
        this.off('click');
    });

    myChart.on('rendered', function (params) {
        console.log(params.elapsedTime);
        this.off('rendered');
    });

    myChart.getZr().on('click', function (params) {
        console.log(params.offsetX);
        this.off('click');
    });

    myChart.setOption(option);
}

export function start() {
    init();
};
