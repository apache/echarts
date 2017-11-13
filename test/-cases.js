(function () {

    var testHelper = window.testHelper;
    var encodeHTML = testHelper.encodeHTML;

    var caseFrame = window.caseFrame;

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
                        pagePaths: pagePaths
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