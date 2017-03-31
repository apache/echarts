describe('scale_interval', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/component/grid',
        'echarts/chart/line',
        'echarts/chart/bar'
    ]);

    describe('extreme', function () {
        testCase.createChart()('ticks_min_max', function () {
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

        testCase.createChart()('ticks_small_value', function () {
            this.chart.setOption({
                tooltip: {},
                xAxis: [
                    {
                        type : 'category',
                        data : ['Mon'],
                        axisTick: {
                            alignWithLabel: true
                        }
                    }
                ],
                yAxis : [
                    {
                        type : 'value'
                    }
                ],
                series : [
                    {
                        name:'',
                        type:'bar',
                        data:[0.0000034]
                    }
                ]
            });

            var yAxis = this.chart.getModel().getComponent('yAxis', 0);
            var scale = yAxis.axis.scale;
            var ticks = scale.getTicks();
            var labels = scale.getTicksLabels();
            var labelPrecisioned = scale.getLabel(0.0000005, {precision: 10});

            expect(ticks).toEqual(
                [0, 0.0000005, 0.000001, 0.0000015, 0.000002, 0.0000025, 0.000003, 0.0000035]
            );
            expect(labels).toEqual(
                // Should not be '5e-7'
                ['0', '0.0000005', '0.000001', '0.0000015', '0.000002', '0.0000025', '0.000003', '0.0000035']
            );
            expect(labelPrecisioned).toEqual('0.0000005000');
        });

    });

});