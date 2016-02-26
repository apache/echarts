<!DOCTYPE>
<html>
    <head>
        <meta charset="utf-8">
        <script src="esl.js"></script>
        <script src="config.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="reset.css">
    </head>
    <body>
        <style>
        </style>
        <div id="main"></div>
        <script>

            var echarts;
            var chart;
            var myChart;

            require([
                'echarts',
                'echarts/chart/line',
                'echarts/chart/bar',
                'echarts/component/legend',
                'echarts/component/grid',
                'echarts/component/tooltip',
                'echarts/component/dataZoom',
                'echarts/component/markLine'
            ], function (ec) {

                echarts = ec;

                chart = myChart = echarts.init(document.getElementById('main'), null, {
                    renderer: 'canvas'
                });

// -------------------------------------------------------------------
// -------------------------------------------------------------------
// -------------------------------------------------------------------

var app = {};

option = {
    title : {
        text: '动态数据',
        subtext: '纯属虚构'
    },
    tooltip : {
        trigger: 'axis'
    },
    legend: {
        data:['最新成交价']
    },
    toolbox: {
        show : true,
        feature : {
            dataView : {show: true, readOnly: false},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    dataZoom : [{
        type: 'inside',
        start : 0,
        end : 100
    },
    {
        type: 'slider',
        start : 0,
        end : 100
    }
    ],
    xAxis : [
        {
            type : 'value',
            scale: true
        }
    ],
    yAxis : [
        {
            type : 'value',
            scale: true,
            name : '预购量',
            max: 1200,
            min: 0,
            boundaryGap: [0.2, 0.2]
        }
    ],
    series : [
        {
            name:'最新成交价',
            type:'line',
            data:(function (){
                var res = [];
                var len = 0;
                while (len < 10) {
                    var n = [
                        len,
                        (Math.random()*10 + 5).toFixed(1)
                    ];
                    res.push({name: n[0], value: n});
                    len++;
                }
                return res;
            })(),
            animation: true,
            animationDurationUpdate: 500,
            animationEasing: 'linear',
            animationEasingUpdate: 'linear'
        }
    ]
};

myChart.setOption(option);

clearInterval(app.timeTicket);
app.count = 11;
app.timeTicket = setInterval(function (){

    var data0 = option.series[0].data;
    data0.shift();
    var lastData = data0[data0.length - 1].value;
    var x = [lastData[0] + 1, Math.round(Math.random() * 1000)];

    data0.push({name: x[0], value: x});

    myChart.setOption({series: option.series});
}, 2100);


// -------------------------------------------------------------------
// -------------------------------------------------------------------
// -------------------------------------------------------------------



            });

        </script>
    </body>
</html>