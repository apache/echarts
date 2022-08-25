
/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

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
    var SELECTOR_LISTER_FILTER = CSS_BASE + ' .list-filter';
    var SELECTOR_CURRENT = CSS_BASE + ' .info-panel .current';
    var SELECTOR_DIST = CSS_BASE + ' .dist-selector';

    var HTML = [
        '<div class="cases-list">',
        '    <div class="info-panel">',
        '        <input class="current" />',
        '        <div class="renderer-selector">',
        '            <div class="render-selector-item">',
        '               <input type="radio" value="canvas" name="renderer" /> CANVAS ',
        '            </div>',
        '           <div class="render-selector-item">',
        '               <input type="radio" value="dirty-rect" name="renderer" /> CANVAS (dirty rect) ',
        '            </div>',
    '                <div class="render-selector-item">',
        '               <input type="radio" value="svg" name="renderer" /> SVG ',
        '            </div>',
        '        </div>',
        '        <div class="list-filter"></div>',
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

    var globalOpt;
    var pagePaths;
    var baseURL;
    var listFilters;

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
     * @param {Array.<Object} [opt.filters] [{name: 'stream', whiteList: [...]}, ...]
     */
    caseFrame.init = function (opt) {
        renderHTML(opt.dom);

        globalOpt = opt;
        pagePaths = opt.pagePaths.slice();
        baseURL = opt.baseURL || '.';
        listFilters = opt.filters || [];

        $(window).on('hashchange', updateView);

        updateView();
    };

    function renderHTML(dom) {
        dom.className = 'case-frame';
        dom.innerHTML = HTML;
    }

    function updateRendererSelector() {
        var rendererSelector = $(SELECTOR_RENDERER);

        rendererSelector.each(function (index, el) {
            el.disabled = !!globalOpt.disableRendererSelector;
        });

        rendererSelector.off('click').on('click', function (e) {
            if (e.target.value === 'dirty-rect') {
                setState('renderer', 'canvas');
                setState('useDirtyRect', true);
            }
            else {
                setState('renderer', e.target.value);
                setState('useDirtyRect', false);
            }
        });

        var renderer = getState('renderer');
        var useDirtyRect = getState('useDirtyRect');

        rendererSelector.each(function (index, el) {
            el.checked = el.value === 'dirty-rect'
                ? useDirtyRect
                : el.value === renderer;
        });
    }

    function updateListSelectedHint() {
        var hint = $(SELECTOR_CURRENT);
        hint.off('mouseover').on('mouseover', function (e) {
            updatePageHint('full');
            this.select();
        });
        hint.off('mouseout').on('mouseout', function (e) {
            updatePageHint('short');
        });
    }

    function updateDistSelector() {
        var distSelector = $(SELECTOR_DIST);

        distSelector[0].disabled = !!globalOpt.disableDistSelector;

        distSelector.off('change').on('change', function (e) {
            var selector = e.target;
            setState('dist', selector.options[selector.selectedIndex].value);
        });

        var dist = getState('dist');

        var options = distSelector[0].options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === dist) {
                distSelector[0].selectedIndex = i;
            }
        }
    }

    function updateListFilter() {
        var html = [
            '<select class="dist-selector">',
            '<option value="all">all</option>'
        ];
        for (var i = 0; i < listFilters.length; i++) {
            var name = encodeHTML(listFilters[i].name);
            html.push('<option value="' + name + '">' + name + '</option>');
        }
        html.push('</select>');

        var filterContainer = $(SELECTOR_LISTER_FILTER);

        filterContainer[0].innerHTML = 'FILTER: &nbsp;' + html.join('');

        var filterSelector = filterContainer.find('select');

        filterSelector.off('change').on('change', function (e) {
            var selector = e.target;
            setState('listFilterName', selector.options[selector.selectedIndex].value);
        });

        var currentFilterName = getState('listFilterName');
        var options = filterSelector[0].options;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === currentFilterName) {
                filterSelector[0].selectedIndex = i;
            }
        }
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
        // true, false, 'auto'
        useCoarsePointer: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__USE_COARSE_POINTER__=(true|false|auto)(&|$)/);
            return matchResult && matchResult[1]
                ? matchResult[1] === 'true'
                    ? true
                    : matchResult[1] === 'false'
                        ? false
                        : 'auto'
                : 'auto';
        },
        // true, false
        useDirtyRect: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__USE_DIRTY_RECT__=(true|false)(&|$)/);
            return matchResult && matchResult[1] === 'true';
        },
        // 'dist', 'webpack', 'webpackold'
        dist: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__ECDIST__=(webpack-req-ec|webpack-req-eclibec|webpackold-req-ec|webpackold-req-eclibec)(&|$)/);
            return matchResult && matchResult[1] || 'dist';
        },
        listFilterName: function (pageURL) {
            var matchResult = (pageURL || '').match(/[?&]__FILTER__=([a-zA-Z0-9_-]*)(&|$)/);
            return matchResult && matchResult[1] || null;
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
            useDirtyRect: getState('useDirtyRect'),
            dist: getState('dist'),
            pagePath: getState('pagePath'),
            listFilterName: getState('listFilterName')
        };
        curr[prop] = value;

        var newPageURL = makePageURL(curr);

        location.hash = '#' + encodeURIComponent(newPageURL);
    }

    function makePageURL(curr) {
        return curr.pagePath + '?' + [
            '__RENDERER__=' + curr.renderer,
            '__USE_DIRTY_RECT__=' + curr.useDirtyRect,
            '__ECDIST__=' + curr.dist,
            '__FILTER__=' + curr.listFilterName,
            '__CASE_FRAME__=1'
        ].join('&');
    }

    function updateView() {
        updateRendererSelector();
        updateDistSelector();
        updateListSelectedHint();
        updateListFilter();
        updateList();
        updatePage();
        updatePageHint('short');
    }

    function getCurrentPageURL() {
        return decodeURIComponent(
            (location.hash || '').replace(/^#/, '')
        );
    }

    function updateList() {
        var html = [];

        var filter;
        var listFilterName = getState('listFilterName');
        if (listFilters && listFilterName) {
            for (var i = 0; i < listFilters.length; i++) {
                if (listFilters[i].name === listFilterName) {
                    filter = listFilters[i];
                    break;
                }
            }
        }

        for (var i = 0; i < pagePaths.length; i++) {
            var path = pagePaths[i];

            var whiteList = filter && filter.whiteList;
            if (whiteList) {
                var j = 0;
                for (; j < whiteList.length; j++) {
                    if (path === whiteList[j]) {
                        break;
                    }
                }
                if (j >= whiteList.length) {
                    continue;
                }
            }

            html.push('<li><a href="' + baseURL + '/' + encodeHTML(path) + '">' + encodeHTML(path) + '</a></li>');
        }

        var caseListContainer = $(SELECTOR_CASES_LIST_CONTAINER);

        caseListContainer[0].innerHTML = html.join('');

        caseListContainer.off('click').on('click', SELECTOR_CASES_ITEM, function (e) {
            setState('pagePath', e.currentTarget.innerHTML);
            return false;
        });
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

})();