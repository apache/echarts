var developMode = false;
if (developMode) {
    // for develop
    require.config({
        packages: [
            {
                name: 'echarts',
                location: '../../src',
                main: 'echarts'
            },
            {
                name: 'zrender',
                //location: 'http://ecomfe.github.io/zrender/src',
                location: '../../../zrender/src',
                main: 'zrender'
            }
        ]
    });
}
else {
    // for echarts online home page
    require.config({
        paths:{ 
            echarts: '../../build/dist'
        }
    });
}

// 按需加载
require(
    [
        'echarts',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/radar',
        'echarts/chart/force',
        'echarts/chart/chord',
        'echarts/chart/map',
        'echarts/chart/gauge',
        'echarts/chart/funnel'
    ],
    requireCallback
);

var echarts;
var myChart;
function requireCallback (ec) {
    echarts = ec;
    myChart = echarts.init(domMain);
    var opt = option('line', 100);
    myChart.setOption(opt, true);
    document.getElementById('res').innerHTML = 'ready!<br/>';
    document.getElementById('run').onclick = start;
    document.getElementById('auto-run').onclick = autoStart;
}

var domMain = document.getElementById('main');
var isRunning = false;

var isRunning;
var round;
var n;
var result;
var total;
var chartType;

function start() {
    if (isRunning) {
        return;
    }
    isRunning = true;
    document.getElementById('res').innerHTML += 'running ';

    round = document.getElementById('round').value;
    n = document.getElementById('count').value;
    result = [];
    total = 0;
    chartType = document.getElementById('chart').value;
    setTimeout(run,50);
}

var cList = [
    'line','bar','scatter','k',
    'pie','radar','chord','map'
];
var autoIdx = 0;
var autoRun = false;
function autoStart() {
    if (isRunning) {
        return;
    }
    autoIdx = 0;
    autoRun = true;
    autoCheck();
}
function autoCheck() {
    if (autoRun && autoIdx < cList.length) {
        document.getElementById('chart').value = cList[autoIdx++];
        start();
    }
    else {
        autoRun = false;
        autoIdx = 0;
    }
}

function run(){
    if (round--) {
        var opt = option(chartType, n - 0);
        var ticket = new Date();
        myChart.setOption(opt, true);
        ticket = new Date() - ticket;
        total += ticket
        result.push(ticket);
        setTimeout(run,200);
        //myChart.showLoading();
    }
    else {
        //myChart.hideLoading();
        isRunning = false;
        document.getElementById('res').innerHTML +=
            '【' + chartType + '】 : ' +
            (
                (chartType == 'map' || chartType == 'radar' || chartType == 'pie' || chartType == 'chord')
                ? (n > 200 ? 200 : n)
                : (n >= 10000 ? (n / 10000 + '万') : n)
            )
            + '个数据平均render时间:'
            + Math.round(total/result.length)
            + 'ms : [' + result.join(',') + ']<br/>';
        autoCheck();
    }
}