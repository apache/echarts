/**
 * Dependencies: testHelper.js, jquery, caseFrame.css
 */
(function () {

    var testHelper = window.testHelper;
    var encodeHTML = testHelper.encodeHTML;

    var CSS_BASE = '.case-frame';
    var SELECTOR_CASES_LIST_CONTAINER = CSS_BASE + ' .cases-list ul';
    var SELECTOR_CASES_ITEM = 'li a';
    var SELECTOR_CONTENT_IFRAME = CSS_BASE + ' .page-content iframe';
    var SELECTOR_RENDERER = CSS_BASE + ' .renderer-selector input';
    var SELECTOR_CURRENT = CSS_BASE + ' .info-panel .current';
    var SELECTOR_DIST = CSS_BASE + ' .dist-selector';

    var HTML = [
        '<div class="cases-list">',
        '    <div class="info-panel">',
        '        <input class="current" />',
        '        <div class="renderer-selector">',
        '            <input type="radio" value="canvas" name="renderer" /> CANVAS ',
        '            <input type="radio" value="svg" name="renderer" /> SVG ',
        '        </div>',
        '        <select class="dist-selector">',
        '           <option value="dist"/>echarts/dist</option>',
        '           <option value="webpack-req-ec"/>boilerplat/webpack-req-ec</option>',
        '           <option value="webpack-req-eclibec"/>boilerplat/webpack-req-eclibec</option>',
        '           <option value="webpackold-req-ec"/>boilerplat/webpackold-req-ec</option>',
        '           <option value="webpackold-req-eclibec"/>boilerplat/webpackold-req-eclibec</option>',
        '        </select>',
        '    </div>',
        '    <ul></ul>',
        '</div>',
        '<div class="page-content">',
        '    <iframe frameborder="no" border="0" marginwidth="0" marginheight="0"',
        '        hspace="0" vspace="0">',
        '    </iframe>',
        '</div>',
    ].join('');

    var pagePaths;
    var baseURL;

    /**
     * @public
     */
    var caseFrame = window.caseFrame = {};

    /**
     * @public
     * @param {Object} opt
     * @param {HTMLElement} opt.dom
     * @param {Array.<string>} opt.pagePaths Relative paths.
     * @param {string} [opt.baseURL='.']
     * @param {string} [opt.disableRendererSelector]
     * @param {string} [opt.disableDistSelector]
     */
    caseFrame.init = function (opt) {
        renderHTML(opt.dom);

        pagePaths = opt.pagePaths.slice();
        baseURL = opt.baseURL || '.';

        $(window).on('hashchange', updateView);

        initPanel(opt);
        initList();
        updateView();
    };

    function renderHTML(dom) {
        dom.className = 'case-frame';
        dom.innerHTML = HTML;
    }

    function initList() {
        var html = [];

        for (var i = 0; i < pagePaths.length; i++) {
            var path = pagePaths[i];
            html.push('<li><a href="' + baseURL + '/' + encodeHTML(path) + '">' + encodeHTML(path) + '</a></li>');
        }

        var caseListContainer = $(SELECTOR_CASES_LIST_CONTAINER);

        caseListContainer[0].innerHTML = html.join('');

        caseListContainer.on('click', SELECTOR_CASES_ITEM, function (e) {
            setState('pagePath', e.currentTarget.innerHTML);
            return false;
        });
    }

    function initPanel(opt) {
        var rendererSelector = $(SELECTOR_RENDERER);
        var distSelector = $(SELECTOR_DIST);

        if (opt.disableRendererSelector) {
            rendererSelector.each(function (index, el) {
                el.disabled = true;
            });
        }
        if (opt.disableDistSelector) {
            distSelector[0].disabled = true;
        }

        rendererSelector.on('click', function (e) {
            setState('renderer', e.target.value);
        });

        $(SELECTOR_CURRENT).on('mouseover', function (e) {
            updatePageHint('full');
            this.select();
        });
        $(SELECTOR_CURRENT).on('mouseout', function (e) {
            updatePageHint('short');
        });
        distSelector.on('change', function (e) {
            var selector = e.target;
            setState('dist', selector.options[selector.selectedIndex].value);
        });
    }

    // prop: renderer, dist, pagePath
    function getState(prop) {
        return stateGetters[prop](getCurrentPageURL());
    }

    var stateGetters = {
        // 'canvas', 'svg'
        renderer: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
            return matchResult && matchResult[1] || 'canvas';
        },
        // 'dist', 'webpack', 'webpackold'
        dist: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__ECDIST__=(webpack-req-ec|webpack-req-eclibec|webpackold-req-ec|webpackold-req-eclibec)(&|$)/);
            return matchResult && matchResult[1] || 'dist';
        },
        // {index, pagePath} or null
        pagePathInfo: getStatePagePathInfo,
        pagePath: function (pageURL) {
            return getStatePagePathInfo(pageURL).pagePath;
        }
    };

    function getStatePagePathInfo(pageURL) {
        var matchResult = (pageURL || '').match(/^[^?&]*/);
        var pagePath = matchResult && matchResult[0];
        var index;
        if (pagePath) {
            for (var i = 0; i < pagePaths.length; i++) {
                if (pagePaths[i] === pagePath) {
                    index = i;
                }
            }
        }
        return {index: index, pagePath: pagePath};
    }

    function setState(prop, value) {
        var curr = {
            renderer: getState('renderer'),
            dist: getState('dist'),
            pagePath: getState('pagePath')
        };
        curr[prop] = value;

        var newPageURL = makePageURL(curr);

        location.hash = '#' + encodeURIComponent(newPageURL);
    }

    function makePageURL(curr) {
        return curr.pagePath + '?__RENDERER__=' + curr.renderer + '&__ECDIST__=' + curr.dist;
    }

    function updateView() {
        updateRendererSelector();
        updateDistSelector();
        updatePage();
        updatePageHint('short');
    }

    function getCurrentPageURL() {
        return decodeURIComponent(
            (location.hash || '').replace(/^#/, '')
        );
    }

    function updatePage() {
        var pageURL = getCurrentPageURL();
        var pagePathInfo = getState('pagePathInfo');

        $(SELECTOR_CASES_LIST_CONTAINER + ' li').each(function (index, el) {
            el.style.background = pagePathInfo.index === index ? 'rgb(170, 224, 245)' : 'none';
        });

        var src = pagePathInfo.pagePath ? baseURL + '/' + pageURL : 'about:blank';
        var contentIframe = $(SELECTOR_CONTENT_IFRAME);
        contentIframe.attr('src', src);
    }

    // type: 'full' or 'short'
    function updatePageHint(type) {
        var pagePathInfo = getState('pagePathInfo');

        var newValue = !pagePathInfo.pagePath
            ? ''
            : type === 'short'
            ? (pagePathInfo.index != null ? (pagePathInfo.index + 1) + '. ' : '')
                + (pagePathInfo.pagePath || '')
            : testHelper.dir() + '/' + pagePathInfo.pagePath;

        $(SELECTOR_CURRENT).val(newValue);
    }

    function updateRendererSelector() {
        var renderer = getState('renderer');

        $(SELECTOR_RENDERER).each(function (index, el) {
            el.checked = el.value === renderer;
        });
    }

    function updateDistSelector() {
        var dist = getState('dist');

        var selector = $(SELECTOR_DIST)[0];
        var options = selector.options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === dist) {
                selector.selectedIndex = i;
            }
        }
    }

})();