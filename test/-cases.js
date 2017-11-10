(function () {

    var testHelper = window.testHelper;
    var encodeHTML = testHelper.encodeHTML;
    var resolve = testHelper.resolve;

    var SELECTOR_CASES_LIST_CONTAINER = '.cases-list ul';
    var SELECTOR_CASES_ITEM = 'li a';
    var SELECTOR_CONTENT_IFRAME = '.page-content iframe';
    var SELECTOR_RENDERER = '.renderer-selector input';
    var SELECTOR_CURRENT = '.info-panel .current';

    var pagePaths;

    run();

    function run() {
        // Init list
        var url = dir() + '/';
        $.ajax({
            url: url
        }).then(
            function (content) {
                pagePaths = fetchPagePaths(content);
                if (pagePaths.length) {
                    renderList();
                    reset();
                }
                else {
                    renderFailInfo(url);
                }
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

        $(SELECTOR_CURRENT).on('mouseover', function (e) {
            setPageHintFull(getPagePathFromPageURL(getCurrentPageURL()));
            this.select();
        });
        $(SELECTOR_CURRENT).on('mouseout', function (e) {
            setPageHintShort(getPagePathFromPageURL(getCurrentPageURL()));
        });
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

    function renderList() {
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

        var pagePathInfo = getPagePathFromPageURL(pageURL);

        setPageHintShort(pagePathInfo);

        $(SELECTOR_CASES_LIST_CONTAINER + ' li').each(function (index, el) {
            el.style.background = pagePathInfo.index === index ? 'rgb(170, 224, 245)' : 'none';
        });

        var contentIframe = $(SELECTOR_CONTENT_IFRAME);
        contentIframe.attr('src', pageURL);
    }

    function setPageHintShort(pagePathInfo) {
        $(SELECTOR_CURRENT).val(pagePathInfo
            ? (pagePathInfo.index != null ? (pagePathInfo.index + 1) + '. ' : '')
                + (pagePathInfo.pagePath || '')
            : ''
        );
    }

    function setPageHintFull(pagePathInfo) {
        $(SELECTOR_CURRENT).val(pagePathInfo
            ? dir() + '/' + pagePathInfo.pagePath
            : ''
        );
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

    function getPagePathFromPageURL(pageURL) {
        if (pageURL) {
            var matchResult = pageURL.match(/^[^?&]*/);
            var pagePath = matchResult && matchResult[0];
            if (pagePath) {
                var index;
                for (var i = 0; i < pagePaths.length; i++) {
                    if (pagePaths[i] === pagePath) {
                        index = i;
                    }
                }
                return {index: index, pagePath: pagePath};
            }
        }
    }

    function replaceRendererOnPageURL(pageURL, renderer) {
        return pageURL.replace(/([?&]__RENDERER__=)([^&]*)(&|$)/, '$1' + renderer + '$3');
    }

})();