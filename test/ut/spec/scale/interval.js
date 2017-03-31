describe('scale_interval', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/scale/helper',
        'echarts/util/number',
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


    describe('ticks', function () {

        // testCase.createChart()('randomCover', function (scaleHelper) {
        //     doRandomTest(scaleHelper, 10, 5);
        // });

        function randomNumber(quantity) {
            return (Math.random() - 0.5) * Math.pow(10, (Math.random() - 0.5) * quantity);
        }

        function check(cond) {
            expect(cond).toEqual(true);
            return +cond;
        }

        function doSingleTest(scaleHelper, numberUtil, extent, splitNumber) {
            var result = scaleHelper.intervalScaleNiceTicks(extent, splitNumber);
            var intervalPrecision = result.intervalPrecision;
            var interval = result.interval;
            var niceTickExtent = result.niceTickExtent;

            var fails = [];

            !check(utHelper.isValueFinite(interval)) && fails.push(0);
            !check(utHelper.isValueFinite(intervalPrecision)) && fails.push(1);
            !check(utHelper.isValueFinite(niceTickExtent[0])) && fails.push(2);
            !check(utHelper.isValueFinite(niceTickExtent[1])) && fails.push(3);
            !check(niceTickExtent[0] >= extent[0]) && fails.push(4);
            !check(niceTickExtent[1] <= extent[1]) && fails.push(5);
            !check(niceTickExtent[1] >= niceTickExtent[0]) && fails.push(6);

            var ticks = scaleHelper.intervalScaleGetTicks(interval, extent, niceTickExtent, intervalPrecision);
            !check(ticks.length > 0) && fails.push(7);
            !check(ticks[0] === extent[0] && ticks[ticks.length - 1] === extent[1]) && fails.push(8);

            var ticksOK = 1;
            for (var i = 1; i < ticks.length; i++) {
                ticksOK &= check(ticks[i - 1] < ticks[i]);
                if (ticks[i] !== extent[0] && ticks[i] !== extent[1]) {
                    var tickPrecision = numberUtil.getPrecisionSafe(ticks[i]);
                    ticksOK &= check(tickPrecision <= intervalPrecision);
                }
            }
            !ticksOK && fails.push(9);

            // check precision rounding error ????????????

            if (fails.length) {
                utHelper.print(
                    'FAIL:[' + fails
                    + ']  extent:[' + extent + '] niceTickExtent:[' + niceTickExtent + '] ticks:['
                    + ticks + '] '
                );
            }
        }

        function doRandomTest(scaleHelper, numberUtil, count, splitNumber, quantity) {
            for (var i = 0; i < count; i++) {
                var extent = [];
                extent[0] = randomNumber(quantity);
                extent[1] = extent[0] + randomNumber(quantity);
                if (extent[1] === extent[0]) {
                    extent[1] = extent[0] + 1;
                }
                if (extent[0] > extent[1]) {
                    extent.reverse();
                }
                doSingleTest(scaleHelper, numberUtil, extent, splitNumber);
            }
        }

        testCase.createChart()('cases', function (scaleHelper, numberUtil) {
            doSingleTest(scaleHelper, numberUtil, [3.7210923755786733e-8,176.4352516752083], 1);
            doSingleTest(scaleHelper, numberUtil, [1550932.3941785, 1550932.3941786], 5);
            doSingleTest(scaleHelper, numberUtil, [-3711126.9907707,-3711126.990770699], 5);
        });

        testCase.createChart()('randomCover', function (scaleHelper, numberUtil) {
            doRandomTest(scaleHelper, numberUtil, 500, 5, 20);
            doRandomTest(scaleHelper, numberUtil, 200, 1, 20);
        });
    });

});