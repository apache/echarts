(function () {

    var testHelper = window.testHelper;
    var encodeHTML = testHelper.encodeHTML;
    var resolve = testHelper.resolve;

    var SELECTOR_CASES_LIST_CONTAINER = '.cases-list ul';
    var SELECTOR_CASES_ITEM = 'li a';
    var SELECTOR_CONTENT_IFRAME = '.page-content iframe';
    var SELECTOR_RENDERER = '.renderer-selector input';

    run();

    function run() {
        // Init list
        var url = dir() + '/';
        $.ajax({
            url: url
        }).then(
            function (content) {
                var pagePaths = fetchPagePaths(content);
                pagePaths.length ? render(pagePaths) : renderFailInfo(url);
            },
            function () {
                renderFailInfo(url);
            }
        );

        $(window).on('hashchange', function () {
            reset();
        });

        $(SELECTOR_RENDERER).on('click', function (e) {
            changeRenderer(e.target.value);
        });

        reset();
    }

    function renderFailInfo(url) {
        url = encodeHTML(url);
        document.body.innerHTML = 'Error: This page requires a server that is able to list files when visiting'
            + ' <a target="_blank" href="' + url + '">' + url + '</a>.';
    }

    function reset() {
        var pageURL = getCurrentPageURL();
        resetRendererSelector(pageURL);
        enterPage(pageURL, true); // Init page from hash if exists
    }

    function render(pagePaths) {
        var html = [];

        for (var i = 0; i < pagePaths.length; i++) {
            var path = pagePaths[i];
            html.push('<li><a href="' + encodeHTML(path) + '">' + encodeHTML(path) + '</a></li>');
        }

        var caseListContainer = $(SELECTOR_CASES_LIST_CONTAINER);

        caseListContainer[0].innerHTML = html.join('');

        caseListContainer.on('click', SELECTOR_CASES_ITEM, function (e) {
            enterPage(makePageURL(
                e.currentTarget.innerHTML, getCurrentRenderer()
            ));
            return false;
        });
    }

    function getCurrentPageURL() {
        return decodeURIComponent(
            (location.hash || '').replace(/^#/, '')
        );
    }

    function getCurrentRenderer(pagePath, renderer) {
        var renderer;
        $(SELECTOR_RENDERER).each(function (index, el) {
            if (el.checked) {
                renderer = el.value;
            }
        });
        return renderer;
    }

    function changeRenderer(renderer) {
        var pageURL = getCurrentPageURL();
        if (pageURL) {
            enterPage(replaceRendererOnPageURL(pageURL, renderer));
        }
    }

    function makePageURL(pagePath, renderer) {
        return pagePath + '?__RENDERER__=' + renderer;
    }

    function enterPage(pageURL, dontUpdateHash) {
        if (!pageURL) {
            return;
        }
        if (!dontUpdateHash) {
            location.hash = '#' + encodeURIComponent(pageURL);
        }
        var contentIframe = $(SELECTOR_CONTENT_IFRAME);
        contentIframe.attr('src', pageURL);
    }

    function dir() {
        return location.origin + resolve(location.pathname, '..');
    }

    function fetchPagePaths(content) {
        var pageList = [];

        singleFetch(/"([^"]+\.html)\s*"/g);
        singleFetch(/'([^']+\.html)\s*'/g);

        function singleFetch(pattern) {
            var result;
            while ((result = pattern.exec(content)) != null) {
                pageList.push(result[1]);
            }
        }

        return pageList;
    }

    function resetRendererSelector(pageURL) {
        var renderer = getRendererFromPageURL(pageURL) || 'canvas';

        $(SELECTOR_RENDERER).each(function (index, el) {
            el.checked = el.value === renderer;
        });
    }

    function getRendererFromPageURL(pageURL) {
        if (pageURL) {
            var matchResult = pageURL.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
            return matchResult && matchResult[1];
        }
    }

    function replaceRendererOnPageURL(pageURL, renderer) {
        return pageURL.replace(/([?&]__RENDERER__=)([^&]*)(&|$)/, '$1' + renderer + '$3');
    }

})();