(function () {

    var testHelper = window.testHelper;
    var encodeHTML = testHelper.encodeHTML;

    var caseFrame = window.caseFrame;

    var filters = [{
        name: 'primary-cases',
        whiteList: [
            'ut/ut.html',
            'ie8.html',
            'touch-slide.html',
            'touch-test.html',
            'touch-candlestick.html',
            'tooltip-touch.html',
            'bar.html',
            'line.html',
            'geoLine.html',
            'graph.html',
            'graph-grid.html',
            'map.html',
            'media-finance.html',
            'axes.html',
            'dataZoom-axes.html',
            'dataZoom-axis-type.html',
            'dataZoom-dynamic.html',
            'visualMap-continuous.html',
            'visualMap-opacity.html',
            'brush.html',
            'brush2.html'
        ]
    }, {
        name: 'stream-cases',
        whiteList: [
            'lines-ny-appendData.html',
            'scatter-stream-large.html',
            'scatter-stream-not-large.html',
            'scatter-random-stream.html',
            'scatter-random-stream-fix-axis.html',
            'scatter-gps.html',
            'scatter-weibo.html',
            'bar-stream-large.html',
            'bar-stream-large1.html',
            'candlestick-large2.html',
            'lines-flight.html',
            'lines-stream-large.html',
            'lines-stream-not-large.html',
            'stream-filter.html',
            'scatter-stream-visual.html'
        ]
    }];


    function run() {

        // Init list
        var url = testHelper.dir() + '/';
        $.ajax({
            url: url
        }).then(
            function (content) {
                var pagePaths = fetchPagePaths(content);
                if (pagePaths.length) {
                    caseFrame.init({
                        dom: document.getElementById('main'),
                        pagePaths: pagePaths,
                        filters: filters
                    });
                }
                else {
                    renderFailInfo(url);
                }
            },
            function () {
                renderFailInfo(url);
            }
        );
    }

    function renderFailInfo(url) {
        url = encodeHTML(url);
        document.body.innerHTML = 'Error: This page requires a server that is able to list files when visiting'
            + ' <a target="_blank" href="' + url + '">' + url + '</a>.';
    }

    function fetchPagePaths(content) {
        var pageList = [];

        singleFetch(/"([^"/]*\/)*([^"/]+\.html)\s*"/g);
        singleFetch(/'([^'/]*\/)*([^'/]+\.html)\s*'/g);

        function singleFetch(pattern) {
            var result;
            while ((result = pattern.exec(content)) != null) {
                pageList.push(result[result.length - 1]);
            }
        }

        return pageList;
    }

    run();

})();