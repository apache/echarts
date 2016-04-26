describe('vsiaulMap_setOption', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/component/grid',
        'echarts/chart/scatter',
        'echarts/component/visualMap'
    ]);

    testCase.createChart()('defaultTargetController', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
    });

    testCase.createChart()('ec2ColorCompatiable', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                color: ['yellow', 'blue', 'red']
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].color).toEqual(['yellow', 'blue', 'red']);
        expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
    });

    testCase.createChart()('remainVisualProp', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        this.chart.setOption({
            visualMap: {}
        });

        expectTheSame(this.chart.getOption());

        this.chart.setOption({
            series: [{data: [[44, 55]]}] // visualMap depends series
        });

        expectTheSame(this.chart.getOption());

        function expectTheSame(option) {
            expect(option.visualMap.length).toEqual(1);
            expect(option.visualMap[0].inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(option.visualMap[0].target.inRange.color).toEqual(['red', 'blue', 'yellow']);
            expect(option.visualMap[0].controller.inRange.color).toEqual(['red', 'blue', 'yellow']);
        }
    });

    testCase.createChart()('eraseAllVisualProps_notRelative', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow'],
                    symbolSize: [0.3, 0.5]
                }
            }
        });

        var option = this.chart.getOption();

        this.chart.setOption({
            visualMap: {
                inRange: {
                    symbolSize: [0.4, 0.6]
                }
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].inRange.symbolSize).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].target.inRange.symbolSize).toEqual([0.4, 0.6]);
        // Do not compare controller.inRange.symbolSize, which will be amplified to controller size.
        // expect(option.visualMap[0].controller.inRange.symbolSize).toEqual([?, ?]);
    });

    testCase.createChart()('eraseAllVisualProps_reletive', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow'],
                    colorAlpha: [0.3, 0.5]
                }
            }
        });

        this.chart.setOption({
            visualMap: {
                inRange: {
                    colorAlpha: [0.4, 0.6]
                }
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('color')).toEqual(false);
        expect(option.visualMap[0].inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].target.inRange.colorAlpha).toEqual([0.4, 0.6]);
        expect(option.visualMap[0].controller.inRange.colorAlpha).toEqual([0.4, 0.6]);

        this.chart.setOption({
            visualMap: {
                color: ['red', 'blue', 'green']
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(option.visualMap[0].target.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(option.visualMap[0].controller.inRange.hasOwnProperty('colorAlpha')).toEqual(false);
        expect(option.visualMap[0].target.inRange.color).toEqual(['green', 'blue', 'red']);
        expect(option.visualMap[0].controller.inRange.color).toEqual(['green', 'blue', 'red']);

        this.chart.setOption({
            visualMap: {
                controller: {
                    outOfRange: {
                        symbol: ['diamond']
                    }
                }
            }
        });

        var option = this.chart.getOption();

        expect(option.visualMap.length).toEqual(1);
        expect(!option.visualMap[0].target.inRange).toEqual(true);
        expect(option.visualMap[0].controller.outOfRange.symbol).toEqual(['diamond']);
    });

    testCase.createChart()('setOpacityWhenUseColor', function () {
        this.chart.setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: {
                inRange: {
                    color: ['red', 'blue', 'yellow']
                }
            }
        });

        var option = this.chart.getOption();

        expect(!!option.visualMap[0].outOfRange.opacity).toEqual(true);
    });


});