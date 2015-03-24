var myChart = [];
var domCode = $("[md='sidebar-code']");
var domGraphic = $("[md='graphic']");
var domMain = $("[md='main']");
var domMessage = $("[md='wrong-message']");
var iconResize = $("[md='icon-resize']");
var needRefresh = false;

function findIdxFromEvent(event) {
    event = event || window.event;
    return findIdx(event.target || event.srcElement);
}
function findIdx(d) {
    var p = d;
    while (p.className != 'container-fluid') {
        p = p.parentElement;
    }
    return $(p).attr('idx');
}
var idx;
function autoResize(event) {
    idx = findIdxFromEvent(event);
    if (iconResize[idx].className == 'icon-resize-full') {
        focusCode();
        iconResize[idx].className = 'icon-resize-small';
    }
    else {
        focusGraphic();
        iconResize[idx].className = 'icon-resize-full';
    }
}

function focusCode() {
    domCode[idx].className = 'span8 ani';
    domGraphic[idx].className = 'span4 ani';
}

function focusGraphic() {
    domCode[idx].className = 'span4 ani';
    domGraphic[idx].className = 'span8 ani';
    if (needRefresh) {
        myChart[idx].showLoading();
        setTimeout(refresh, 1000);
    }
}

var domTextarea = $("[md='code']");
var editor = [];
for (var i = 0, l = domTextarea.length; i < l; i++) {
    editor[i] = CodeMirror.fromTextArea(
        domTextarea[i],
        { lineNumbers: true }
    );
    editor[i].setOption("theme", 'monokai');
    editor[i].on('change', function (){needRefresh = true;});
}

function refresh(isBtnRefresh, idd){
    if (isBtnRefresh) {
        idx = idd;
        needRefresh = true;
        focusGraphic();
        return;
    }
    needRefresh = false;
    if (myChart[idx] && myChart[idx].dispose) {
        myChart[idx].dispose();
    }
    myChart[idx] = echarts.init(domMain[idx]);
    (new Function (editor[idx].doc.getValue().replace(
        'option', 'option[' + idx + ']'))
    )()
    myChart[idx].setOption(option[idx], true);
    domMessage[idx].innerHTML = '';
}

function refreshAll() {
    for (var i = 0, l = myChart.length; i < l; i++) {
        (new Function (editor[i].doc.getValue().replace(
            'option', 'option[' + i + ']'))
        )();
        myChart[i].setOption(option[i], true);
        domMessage[i].innerHTML = '';
    }
}

var developMode = false;
if (developMode) {
    window.esl = null;
    window.define = null;
    window.require = null;
    (function () {
        var script = document.createElement('script');
        script.async = true;

        script.src = '../../doc/asset/js/esl/esl.js';
        if (script.readyState) {
            script.onreadystatechange = fireLoad;
        }
        else {
            script.onload = fireLoad;
        }
        (document.getElementsByTagName('head')[0] || document.body).appendChild(script);
        
        function fireLoad() {
            script.onload = script.onreadystatechange = null;
            setTimeout(loadedListener,100);
        }
        function loadedListener() {
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
            launchExample();
        }
    })();
}
else {
    // for echarts online home page
    require.config({
        paths:{ 
            echarts: '../../build/dist'
        }
    });
    launchExample();
}

var isExampleLaunched;
function launchExample() {
    if (isExampleLaunched) {
        return;
    }

    // 按需加载
    isExampleLaunched = 1;
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
            'echarts/chart/funnel',
            'echarts/chart/venn',
            'echarts/chart/eventRiver'
        ],
        requireCallback
    );
}

var echarts;
var option = {};
function requireCallback (ec) {
    echarts = ec;
    if (myChart.length > 0) {
        for (var i = 0, l = myChart.length; i < l; i++) {
            myChart[i].dispose && myChart[i].dispose();
        }
    }
    myChart = [];
    for (var i = 0, l = domMain.length; i < l; i++) {
        myChart[i] = echarts.init(domMain[i]);
    }
    refreshAll();
    
    window.onresize = function (){
        for (var i = 0, l = myChart.length; i < l; i++) {
            myChart[i].resize && myChart[i].resize();
        }
    };
}