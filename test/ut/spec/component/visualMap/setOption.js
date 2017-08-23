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
        expect(!!option.visualMap[0].target.inRange).toEqual(true);
        var onlyColor = true;
        for (var i in option.visualMap[0].target.inRange) {
            if (i !== 'color') {
                onlyColor = false;
            }
        }
        var inRangeColor = option.visualMap[0].target.inRange.color;
        expect(onlyColor).toEqual(true);
        expect(inRangeColor).toEqual(['#f6efa6', '#d88273', '#bf444c']);
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

        expect(!!option.visualMap[0].target.outOfRange.opacity).toEqual(true);
    });

    testCase.createChart(2)('normalizeVisualRange', function () {
        this.charts[0].setOption({
            xAxis: {},
            yAxis: {},
            series: [{type: 'scatter', data: [[12, 223]]}],
            visualMap: [
                {type: 'continuous', inRange: {color: 'red'}},
                {type: 'continuous', inRange: {opacity: 0.4}},
                {type: 'piecewise', inRange: {color: 'red'}},
                {type: 'piecewise', inRange: {opacity: 0.4}},
                {type: 'piecewise', inRange: {symbol: 'diamond'}},
                {type: 'piecewise', inRange: {color: 'red'}, categories: ['a', 'b']},
                {type: 'piecewise', inRange: {color: {a: 'red'}}, categories: ['a', 'b']},
                {type: 'piecewise', inRange: {opacity: 0.4}, categories: ['a', 'b']}
            ]
        });

        var ecModel = this.charts[0].getModel();

        function getVisual(idx, visualType) {
            return ecModel.getComponent('visualMap', idx)
                .targetVisuals.inRange[visualType].option.visual;
        }

        function makeCategoryVisual(val) {
            var CATEGORY_DEFAULT_VISUAL_INDEX = -1;
            var arr = [];
            if (val != null) {
                arr[CATEGORY_DEFAULT_VISUAL_INDEX] = val;
            }
            for (var i = 1; i < arguments.length; i++) {
                arr.push(arguments[i]);
            }
            return arr;
        }

        expect(getVisual(0, 'color')).toEqual(['red']);
        expect(getVisual(1, 'opacity')).toEqual([0.4, 0.4]);
        expect(getVisual(2, 'color')).toEqual(['red']);
        expect(getVisual(3, 'opacity')).toEqual([0.4, 0.4]);
        expect(getVisual(4, 'symbol')).toEqual(['diamond']);
        expect(getVisual(5, 'color')).toEqual(makeCategoryVisual('red'));
        expect(getVisual(6, 'color')).toEqual(makeCategoryVisual(null, 'red'));
        expect(getVisual(7, 'opacity')).toEqual(makeCategoryVisual(0.4));
    });

});