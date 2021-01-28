
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

(function () {

    var baseUrl = window.AMD_BASE_URL || '../';
    var sourceMap = window.AMD_ENABLE_SOURCE_MAP;
    // `true` by default for debugging.
    sourceMap == null && (sourceMap = true);

    var params = {};
    var parts = location.search.slice(1).split('&');
    for (var i = 0; i < parts.length; ++i) {
        var kv = parts[i].split('=');
        params[kv[0]] = kv[1];
    }
    // Set default renderer in dev mode from hash.
    if (params.__RENDERER__) {
        window.__ECHARTS__DEFAULT__RENDERER__ = params.__RENDERER__;
    }
    if (params.__USE_DIRTY_RECT__) {
        window.__ECHARTS__DEFAULT__USE_DIRTY_RECT__ = params.__USE_DIRTY_RECT__ === 'true';
    }

    // Set echarts source code.
    var ecDistPath;
    if (params.__ECDIST__) {
        ecDistPath = ({
            'webpack-req-ec': '../echarts-boilerplate/echarts-webpack/dist/webpack-req-ec',
            'webpack-req-eclibec': '../echarts-boilerplate/echarts-webpack/dist/webpack-req-eclibec',
            'webpackold-req-ec': '../echarts-boilerplate/echarts-webpackold/dist/webpackold-req-ec',
            'webpackold-req-eclibec': '../echarts-boilerplate/echarts-webpackold/dist/webpackold-req-eclibec'
        })[params.__ECDIST__];
        if (!ecDistPath && params.__ECDIST__.match(/[0-9.]/)) {
            // Version number
            ecDistPath = 'test/runTest/tmp/__version__/' + params.__ECDIST__ + '/echarts';
        }
    }
    if (!ecDistPath) {
        ecDistPath = 'dist/echarts';
    }

    if (typeof require !== 'undefined') {
        require.config({
            baseUrl: baseUrl,
            paths: {
                'echarts': ecDistPath,
                'zrender': 'node_modules/zrender/dist/zrender',
                'ecStat': 'test/lib/ecStat.min',
                'ecSimpleTransform': 'test/lib/ecSimpleTransform',
                'ecSimpleOptionPlayer': 'test/lib/ecSimpleOptionPlayer',
                // 'ecStat': 'http://localhost:8001/echarts/echarts-stat/dist/ecStat',
                'geoJson': '../geoData/geoJson',
                'theme': 'theme',
                'data': 'test/data',
                'map': 'test/data/map',
                'extension': 'dist/extension',
            }
            // urlArgs will prevent break point on init in debug tool.
            // urlArgs: '_v_=' + (+new Date())
        });
    }

    if (typeof requireES !== 'undefined') {
        requireES.config({
            baseUrl: baseUrl,
            paths: {
                'echarts': './',
                'zrender': 'node_modules/zrender',
                'geoJson': 'geoData/geoJson',
                'theme': 'theme',
                'data': 'test/data',
                'map': 'test/data/map',
                'extension': 'extension'
            },
            // urlArgs: '_v_=' + (+new Date()),
            sourceMap: sourceMap
        });
    }

    // Not let scrollbar affect page size.
    // It will AFFECT interaction in the automatic testing.
    if (typeof MutationObserver !== 'undefined') {
        // Must be set as soon as possible(before chart is created)
        var observer = new MutationObserver(function() {
            if (document.body) {
                document.body.style.cssText = 'overflow:overlay!important';
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement, {childList: true});
    };

    // It is not a good solution.
    // Do not need it any more:

    // Mount bundle version print.
    // if (typeof require !== 'undefined') {
    //     var originalRequire = require;
    //     window.require = function (deps, cb) {
    //         var newCb = function () {
    //             if (deps && deps instanceof Array) {
    //                 printBundleVersion(deps, [].slice.call(arguments));
    //             }
    //             cb && cb.apply(this, arguments);
    //         };
    //         return originalRequire.call(this, deps, newCb);
    //     };
    // }

    // function printBundleVersion(bundleIds, bundles) {
    //     var content = [];
    //     for (var i = 0; i < bundleIds.length; i++) {
    //         var bundle = bundles[i];
    //         var bundleVersion = bundle && bundle.bundleVersion;
    //         if (bundleVersion) {
    //             var date = new Date(+bundleVersion);
    //             // Check whether timestamp.
    //             if (!isNaN(+date)) {
    //                 bundleVersion = '<span style="color:yellow">'
    //                     + pad(date.getHours(), 2) + ':'
    //                     + pad(date.getMinutes(), 2) + ':'
    //                     + pad(date.getSeconds(), 2) + '.' + pad(date.getMilliseconds(), 3)
    //                     + '</span>';
    //             }
    //             else {
    //                 bundleVersion = encodeHTML(bundleVersion);
    //             }
    //             content.push(encodeHTML(bundleIds[i]) + '.js: ' + bundleVersion);
    //         }
    //     }

    //     var domId = 'ec-test-bundle-version';
    //     var dom = document.getElementById(domId);
    //     if (!dom) {
    //         dom = document.createElement('div');
    //         dom.setAttribute('id', domId);
    //         dom.style.cssText = [
    //             'background: rgb(52,56,64)',
    //             'color: rgb(215,215,215)',
    //             'position: fixed',
    //             'right: 0',
    //             'top: 0',
    //             'font-size: 10px',
    //             'padding: 1px 3px 1px 3px',
    //             'border-bottom-left-radius: 3px'
    //         ].join(';');
    //         document.body.appendChild(dom);
    //     }
    //     dom.innerHTML += content.join('');
    // }

    // function pad(num, len) {
    //     return ('000000' + num).substr(-len, len);
    // }

    // function encodeHTML(source) {
    //     return String(source)
    //         .replace(/&/g, '&amp;')
    //         .replace(/</g, '&lt;')
    //         .replace(/>/g, '&gt;')
    //         .replace(/"/g, '&quot;')
    //         .replace(/'/g, '&#39;');
    // }

})();