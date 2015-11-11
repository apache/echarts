<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <style>
            html, body, #main {
                width: 100%;
                height: 100%;
                margin: 0;
            }
            #main {
                width: 1000px;
                background: #fff;
            }
        </style>
        <div id="main"></div>
        <script>

            require([
                'echarts',
                'echarts/chart/bar',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/tooltip'
            ], function (echarts) {

                var chart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

                var xAxisData = [];
                var data1 = [];
                var data2 = [];
                var data3 = [];
                var data4 = [];

                for (var i = 0; i < 10; i++) {
                    xAxisData.push('类目' + i);
                    data1.push((Math.random() * 5).toFixed(2));
                    data2.push(-Math.random().toFixed(2));
                    data3.push((Math.random() + 0.5).toFixed(2));
                    data4.push((Math.random() + 0.3).toFixed(2));
                }

                chart.setOption({
                    tooltip : {         // Option config. Can be overwrited by series or data
                        trigger: 'axis',
                        //show: true,   //default true
                        showDelay: 0,
                        hideDelay: 50,
                        transitionDuration:0,
                        backgroundColor : 'rgba(255,0,255,0.7)',
                        borderColor : '#f50',
                        borderRadius : 8,
                        borderWidth: 2,
                        padding: 10,    // [5, 10, 15, 20]
                        axisPointer: {
                            type: 'shadow'
                        },
                        position : function(p) {
                            // 位置回调
                            // console.log && console.log(p);
                            return [p[0] + 10, p[1] - 10];
                        },
                        textStyle : {
                            color: 'yellow',
                            decoration: 'none',
                            fontFamily: 'Verdana, sans-serif',
                            fontSize: 15,
                            fontStyle: 'italic',
                            fontWeight: 'bold'
                        },
                        formatter: function (params,ticket,callback) {
                            var res = 'Function formatter : <br/>' + params[0].name;
                            for (var i = 0, l = params.length; i < l; i++) {
                                res += '<br/>' + params[i].seriesName + ' : ' + params[i].value;
                            }
                            setTimeout(function (){
                                // 仅为了模拟异步回调
                                callback(ticket, res);
                            }, 1000);
                            return 'loading';
                        }
                        //formatter: "Template formatter: <br/>{b}<br/>{a}:{c}<br/>{a1}:{c1}"
                    },
                    toolbox: {
                        show : true,
                        feature : {
                            mark : {show: true},
                            dataView : {show: true, readOnly: false},
                            magicType : {show: true, type: ['line', 'bar', 'stack', 'tiled']},
                            restore : {show: true},
                            saveAsImage : {show: true}
                        }
                    },
                    calculable : true,
                    xAxis : {
                        data : ['周一','周二','周三','周四','周五','周六','周日']
                    },
                    yAxis : {
                        type : 'value'
                    },
                    series : [
                        {
                            name:'坐标轴触发1',
                            type:'bar',
                            data:[
                                {value:320, extra:'Hello~'},
                                332, 301, 334, 390, 330, 320
                            ]
                        },
                        {
                            name:'坐标轴触发2',
                            type:'bar',
                            data:[862, 1018, 964, 1026, 1679, 1600, 157]
                        },
                        {
                            name:'数据项触发1',
                            type:'bar',
                            tooltip : {             // Series config.
                                trigger: 'item',
                                backgroundColor: 'black',
                                position : [0, 0],
                                formatter: 'Series formatter: <br/>{a}<br/>{b}:{c}'
                            },
                            stack: '数据项',
                            data:[
                                120, 132,
                                {
                                    value: 301,
                                    itemStyle: {normal: {color: 'red'}},
                                    tooltip : {     // Data config.
                                        backgroundColor: 'blue',
                                        formatter: 'Data formatter: <br/>{a}<br/>{b}:{c}'
                                    }
                                },
                                134, 90,
                                {
                                    value: 230,
                                    tooltip: {show: false}
                                },
                                210
                            ]
                        },
                        {
                            name:'数据项触发2',
                            type:'bar',
                            tooltip : {
                                show : false,
                                trigger: 'item'
                            },
                            stack: '数据项',
                            data:[150, 232, 201, 154, 190, 330, 410]
                        }
                    ]
                });
            });
        </script>
    </body>
</html>