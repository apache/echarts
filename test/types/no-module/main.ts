/// <reference types="echarts" />

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
        series: [{
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20]
        }]
    };

    myChart.setOption(option);
}

init();
