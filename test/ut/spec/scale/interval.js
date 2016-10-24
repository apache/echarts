describe('scale_interval', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/component/grid',
        'echarts/chart/line'
    ]);

    testCase.createChart()('ticks', function () {
        var min = 0;
        var max = 54.090909;
        var splitNumber = 5;

        this.chart.setOption({
            xAxis: {},
            yAxis: {
                type: 'value',
                min: min,
                max: max,
                interval: max / splitNumber,
                splitNumber: splitNumber
            },
            series: [{type: 'line', data: []}]
        });

        var yAxis = this.chart.getModel().getComponent('yAxis', 0);
        var scale = yAxis.axis.scale;
        var ticks = scale.getTicks();

        expect(ticks[0]).toEqual(min);
        expect(ticks[ticks.length - 1]).toEqual(max);
    });

});