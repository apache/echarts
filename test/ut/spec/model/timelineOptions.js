describe('timelineOptions', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare([
        'echarts/src/component/grid',
        'echarts/src/chart/line',
        'echarts/src/chart/pie',
        'echarts/src/chart/bar',
        'echarts/src/component/timeline'
    ]);

    function getData0(chart, seriesIndex) {
        return getSeries(chart, seriesIndex).getData().get('y', 0);
    }

    function getSeries(chart, seriesIndex) {
        return chart.getModel().getComponent('series', seriesIndex);
    }

    testCase.createChart()('timeline_setOptionOnceMore_baseOption', function () {
        var option = {
            baseOption: {
                timeline: {
                    axisType: 'category',
                    autoPlay: false,
                    playInterval: 1000
                },
                xAxis: {data: ['a']},
                yAxis: {}
            },
            options: [
                {
                    series: [
                        {type: 'line', data: [11]},
                        {type: 'line', data: [22]}
                    ]
                },
                {
                    series: [
                        {type: 'line', data: [111]},
                        {type: 'line', data: [222]}
                    ]
                }
            ]
        };
        var chart = this.chart;
        chart.setOption(option);

        expect(getData0(chart, 0)).toEqual(11);
        expect(getData0(chart, 1)).toEqual(22);

        chart.setOption({
            xAxis: {data: ['b']}
        });

        expect(getData0(chart, 0)).toEqual(11);
        expect(getData0(chart, 1)).toEqual(22);

        chart.setOption({
            xAxis: {data: ['c']},
            timeline: {
                currentIndex: 1
            }
        });

        expect(getData0(chart, 0)).toEqual(111);
        expect(getData0(chart, 1)).toEqual(222);
    });



    testCase.createChart()('timeline_setOptionOnceMore_substitudeTimelineOptions', function () {
        var option = {
            baseOption: {
                timeline: {
                    axisType: 'category',
                    autoPlay: false,
                    playInterval: 1000,
                    currentIndex: 2
                },
                xAxis: {data: ['a']},
                yAxis: {}
            },
            options: [
                {
                    series: [
                        {type: 'line', data: [11]},
                        {type: 'line', data: [22]}
                    ]
                },
                {
                    series: [
                        {type: 'line', data: [111]},
                        {type: 'line', data: [222]}
                    ]
                },
                {
                    series: [
                        {type: 'line', data: [1111]},
                        {type: 'line', data: [2222]}
                    ]
                }
            ]
        };
        var chart = this.chart;
        chart.setOption(option);

        var ecModel = chart.getModel();
        expect(getData0(chart, 0)).toEqual(1111);
        expect(getData0(chart, 1)).toEqual(2222);

        chart.setOption({
            baseOption: {
                backgroundColor: '#987654',
                xAxis: {data: ['b']}
            },
            options: [
                {
                    series: [
                        {type: 'line', data: [55]},
                        {type: 'line', data: [66]}
                    ]
                },
                {
                    series: [
                        {type: 'line', data: [555]},
                        {type: 'line', data: [666]}
                    ]
                }
            ]
        });

        var ecModel = chart.getModel();
        var option = ecModel.getOption();
        expect(option.backgroundColor).toEqual('#987654');
        expect(getData0(chart, 0)).toEqual(1111);
        expect(getData0(chart, 1)).toEqual(2222);

        chart.setOption({
            timeline: {
                currentIndex: 0
            }
        });

        expect(getData0(chart, 0)).toEqual(55);
        expect(getData0(chart, 1)).toEqual(66);

        chart.setOption({
            timeline: {
                currentIndex: 2
            }
        });

        // no 1111 2222 any more, replaced totally by new timeline.
        expect(getData0(chart, 0)).toEqual(55);
        expect(getData0(chart, 1)).toEqual(66);

    });

});
