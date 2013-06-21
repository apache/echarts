var myChart;
var domCode = document.getElementById('sidebar-code');
var domGraphic = document.getElementById('graphic');
var domMain = document.getElementById('main');
var domMessage = document.getElementById('wrong-message');
var iconResize = document.getElementById('icon-resize');
var needRefresh = false;

function autoResize() {
    if (iconResize.className == 'icon-resize-full') {
        focusCode();
        iconResize.className = 'icon-resize-small';
    }
    else {
        focusGraphic();
        iconResize.className = 'icon-resize-full';
    }
}

function focusCode() {
    domCode.className = 'span8 ani';
    domGraphic.className = 'span4 ani';
}

function focusGraphic() {
    domCode.className = 'span4 ani';
    domGraphic.className = 'span8 ani';
    if (needRefresh) {
        myChart.showLoading();
        setTimeout(refresh, 1000);
    }
}

var editor = CodeMirror.fromTextArea(
    document.getElementById("code"),
    { lineNumbers: true }
);
editor.setOption("theme", 'monokai');


editor.on('change', function(){needRefresh = true;});

function refresh(isBtnRefresh){
    if (isBtnRefresh) {
        needRefresh = true;
        focusGraphic();
        return;
    }
    needRefresh = false;
    (new Function(editor.doc.getValue()))();
    myChart.setOption(option, true);
    domMessage.innerHTML = '';
}

require.config({
    paths: {
        'js': '../asset/js/esl/js'
    },
    packages: [
        {
            name: 'echarts',
            location: '../../src',
            main: 'echarts'
        },
        {
            name: 'zrender',
            location: 'http://ecomfe.github.io/zrender/src',
            location: '../../../zrender/src',
            main: 'zrender'
        }
    ]
});

var echarts;
require(
    [
        'echarts/echarts',
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/map',
        'echarts/chart/force'
    ],
    function(ec) {
        echarts = ec;
        if (myChart && myChart.dispose) {
            myChart.dispose();
        }
        myChart = echarts.init(domMain);
        refresh();
    }
)
