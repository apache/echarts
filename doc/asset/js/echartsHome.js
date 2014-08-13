var version = '2.0.2';
var curPage = location.href.match(/(\w*).html/) ? location.href.match(/(\w*).html/)[1] : 'index';

var activeClass = {};
var loc = {};
var forkWidth = 149;
switch (curPage) {
    case 'index' :
        activeClass[curPage] = 'active';
        loc[curPage] = '.';
        loc.feature = './doc';
        loc.example = './doc';
        loc.doc = './doc';
        loc.about = './doc';
        loc.changelog = './doc';
        loc.start = './doc';
        loc.img = './doc';
        break;
    case 'feature' :
    case 'example' :
    case 'doc' :
    case 'about' :
    case 'changelog' :
    case 'start' :
        activeClass[curPage] = 'active';
        loc.index = '..';
        break;
    default :
        forkWidth = 60;
        activeClass['example'] = 'active';
        loc.index = '../..';
        loc.feature = '../../doc';
        loc.example = '../../doc';
        loc.doc = '../../doc';
        loc.about = '../../doc';
        loc.changelog = '../../doc';
        loc.start = '../../doc';
        loc.img = '../../doc';
        break;
}

$('#head')[0].innerHTML = 
    '<div class="container">'
        + '<div class="navbar-header">'
          + '<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">'
            + '<span class="sr-only">Toggle navigation</span>'
            + '<span class="icon-bar"></span>'
            + '<span class="icon-bar"></span>'
            + '<span class="icon-bar"></span>'
          + '</button>'
          + '<a class="navbar-brand" href="http://echarts.baidu.com">ECharts</a>'
        + '</div>'
        + '<a href="https://github.com/ecomfe/echarts" target="_blank">'
            + '<img id="fork-image" style="position:absolute;top:0;right:0;border:0;z-index:1000;width:' + forkWidth + 'px" src="'+ (loc.img || '.') + '/asset/img/fork.png" alt="Fork me on GitHub">'
        + '</a>'
        + '<div class="navbar-collapse collapse" id="nav-wrap">'
          + '<ul class="nav navbar-nav navbar-right" id="nav" style="max-width:100%;">'
            + '<li class="' + (activeClass.index || '') + '"><a href="' + (loc.index || '.') + '/index.html">首页</a></li>'
            + '<li class="' + (activeClass.feature || '') + '"><a href="' + (loc.feature || '.') + '/feature.html">特性</a></li>'
            + '<li class="' + (activeClass.example || '') + '"><a href="' + (loc.example || '.') + '/example.html">实例</a></li>'
            + '<li class="' + (activeClass.doc || '') + '"><a href="' + (loc.doc || '.') + '/doc.html">文档</a></li>'
            /*
            + '<li class="dropdown">'
              + '<a href="#" class="dropdown-toggle" data-toggle="dropdown">教学 <b class="caret"></b></a>'
              + '<ul class="dropdown-menu">'
                + '<li><a href="#">初学教程</a></li>'
                + '<li class="divider"></li>'
                + '<li class="dropdown-header">外部资源</li>'
                + '<li><a href="#"></a></li>'
                + '<li><a href="#"></a></li>'
              + '</ul>'
            + '</li>'
            */
            + '<li class="dropdown">'
              + '<a href="#" class="dropdown-toggle" data-toggle="dropdown">下载 <b class="caret"></b></a>'
              + '<ul class="dropdown-menu">'
                + '<li><a href="http://echarts.baidu.com/build/echarts-' + version + '.zip"> echarts-' + version + '</a></li>'
                + '<li><a href="http://echarts.baidu.com/build/echarts-1.4.1.zip"> echarts-1.4.1</a></li>'
              + '</ul>'
            + '</li>'
            //+ '<li><a href="http://echarts.baidu.com/build/echarts-' + version + '.rar">下载</a></li>'
            + '<li class="' + (activeClass.about || '') + '"><a href="' + (loc.about || '.') + '/about.html">关于我们</a></li>'
          + '</ul>'
        + '</div><!--/.nav-collapse -->'
      + '</div>';
      
function back2Top() {
    $("body,html").animate({scrollTop:0},1000);
    return false;
}
$('#footer')[0].style.marginTop = '50px';
$('#footer')[0].innerHTML =
     '<div class="container">'
        + '<div class="row" style="padding-bottom:20px;">'
            + '<div class="col-md-3">'
                + '<p>友情链接</p>'
                + '<ul>'
                    + '<li><a href="http://efe.baidu.com" target="_blank">Baidu EFE</a></li>'
                    + '<li><a href="http://fex.baidu.com" target="_blank">Baidu FEX</a></li>'
                    + '<li><a href="http://datavlab.org/" target="_blank">DataV</a></li>'
                    + '<li><a href="http://ecomfe.github.io/zrender/index.html" target="_blank">ZRender</a></li>'
                + '</ul>'
            + '</div>'
            + '<div class="col-md-3">'
                + '<p>更多</p>'
                + '<ul>'
                    + '<li><a href="https://github.com/ecomfe/echarts/blob/master/LICENSE.txt" target="_blank">License</a></li>'
                    + '<li><a href="http://echarts.baidu.com/doc/changelog.html" target="_blank">Changelog</a></li>'
                    + '<li><a href="http://www.oschina.net/p/echarts" target="_blank">开源中国</a></li>'
                + '</ul>'
            + '</div>'
            + '<div class="col-md-3">'
                + '<p>联系我们</p>'
                + '<ul>'
                    + '<li><a href="mailto:echarts(a)baidu.com">echarts(a)baidu.com</a></li>'
                    + '<li><a href="https://github.com/ecomfe/echarts" target="_blank"> Github</a></li>'
                    + '<li><a href="http://weibo.com/echarts" target="_blank">Weibo</a></li>'
                + '</ul>'
            + '</div>'
            + '<div class="col-md-3 flogo">'
                + '<a href="javascript:void(0)" onclick="back2Top()" title="回到顶部"><img src="'+ (loc.img || '.')+ '/asset/img/echarts-logo2.png" alt="ECharts"/></a>'
            + '</div>'
        + '</div>'
        + '<p class="pull-right"><a href="javascript:void(0)" onclick="back2Top()" >Back to top</a></p>'
        + '<p>&copy; 2014 <a href="http://www.baidu.com/" target="_blank">Baidu</a></p>'
    + '</div>';


if (document.location.href.indexOf('local') == -1) {
    var _bdhmProtocol = (("https:" == document.location.protocol) ? " https://" : " http://");
    document.write(unescape("%3Cscript src='" + _bdhmProtocol + "hm.baidu.com/h.js%3Fb78830c9a5dad062d08b90b2bc0cf5da' type='text/javascript'%3E%3C/script%3E"));   
}

function fixFork () {
    var navMarginRight = 0;
    var bodyWidth = document.body.offsetWidth;
    var contnetWidth = $('#nav-wrap')[0].offsetWidth;
    if (bodyWidth < 1440) {
        navMarginRight = 150 - (bodyWidth - contnetWidth) / 2;
    }
    $('#nav')[0].style.marginRight = navMarginRight + 'px';
    $('#fork-image')[0].style.width = (document.body.offsetWidth < 768 ? 1 : forkWidth) + 'px';
};
fixFork();
$(window).on('resize', fixFork);