var myChart;
var domCode = document.getElementById('sidebar-code');
var domGraphic = document.getElementById('graphic');
var domMain = document.getElementById('main');
var domMessage = document.getElementById('wrong-message');
var iconResize = document.getElementById('icon-resize');
var needRefresh = false;

var hash = location.hash.replace('#','') || (needMap() ? 'default' : 'macarons');
var curTheme;
function requireCallback (ec, defaultTheme) {
    curTheme = themeSelector 
               ? defaultTheme
               : {};
    echarts = ec;
    refresh();
    window.onresize = myChart.resize;
}

var themeSelector = $('#theme-select');
if (themeSelector) {
    themeSelector.html(
        '<option selected="true" name="macarons">macarons</option>' 
        + '<option name="infographic">infographic</option>'
        + '<option name="shine">shine</option>'
        + '<option name="dark">dark</option>'
        + '<option name="blue">blue</option>'
        + '<option name="green">green</option>'
        + '<option name="red">red</option>'
        + '<option name="gray">gray</option>'
        + '<option name="default">default</option>'
    );
    $(themeSelector).on('change', function(){
        selectChange($(this).val());
    });
    function selectChange(value){
        var theme = value;
        myChart.showLoading();
        $(themeSelector).val(theme);
        if (theme != 'default') {
            window.location.hash = value;
            require(['theme/' + theme], function(tarTheme){
                curTheme = tarTheme;
                setTimeout(refreshTheme, 500);
            })
        }
        else {
            window.location.hash = '';
            curTheme = {};
            setTimeout(refreshTheme, 500);
        }
    }
    function refreshTheme(){
        myChart.hideLoading();
        myChart.setTheme(curTheme);
    }
    if ($(themeSelector).val(hash).val() != hash) {
        $(themeSelector).val('macarons');
        hash = 'macarons';
        window.location.hash = hash;
    }
}

function autoResize() {
    if ($(iconResize).hasClass('glyphicon-resize-full')) {
        focusCode();
        iconResize.className = 'glyphicon glyphicon-resize-small';
    }
    else {
        focusGraphic();
        iconResize.className = 'glyphicon glyphicon-resize-full';
    }
}

function focusCode() {
    domCode.className = 'col-md-8 ani';
    domGraphic.className = 'col-md-4 ani';
}

function focusGraphic() {
    domCode.className = 'col-md-4 ani';
    domGraphic.className = 'col-md-8 ani';
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
    if (myChart && myChart.dispose) {
        myChart.dispose();
    }
    myChart = echarts.init(domMain, curTheme);
    window.onresize = myChart.resize;
    (new Function(editor.doc.getValue()))();
    myChart.setOption(option, true)
    domMessage.innerHTML = '';
}

function needMap() {
    var href = location.href;
    return href.indexOf('map') != -1
           || href.indexOf('mix3') != -1
           || href.indexOf('mix5') != -1
           || href.indexOf('dataRange') != -1;

}

var echarts;
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
    var fileLocation = needMap() ? './www/js/echarts-map' : './www/js/echarts';
    require.config({
        paths:{ 
            echarts: fileLocation,
            'echarts/chart/line': fileLocation,
            'echarts/chart/bar': fileLocation,
            'echarts/chart/scatter': fileLocation,
            'echarts/chart/k': fileLocation,
            'echarts/chart/pie': fileLocation,
            'echarts/chart/radar': fileLocation,
            'echarts/chart/map': fileLocation,
            'echarts/chart/chord': fileLocation,
            'echarts/chart/force': fileLocation,
            'echarts/chart/gauge': fileLocation,
            'echarts/chart/funnel': fileLocation
        }
    });
}

// 按需加载
require(
    [
        'echarts',
        'theme/' + hash,
        'echarts/chart/line',
        'echarts/chart/bar',
        'echarts/chart/scatter',
        'echarts/chart/k',
        'echarts/chart/pie',
        'echarts/chart/radar',
        'echarts/chart/force',
        'echarts/chart/chord',
        'echarts/chart/gauge',
        'echarts/chart/funnel',
        needMap() ? 'echarts/chart/map' : 'echarts'
    ],
    requireCallback
);

