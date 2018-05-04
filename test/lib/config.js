
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

    // Set default renderer in dev mode from hash.
    var matchResult = location.href.match(/[?&]__RENDERER__=(canvas|svg)(&|$)/);
    if (matchResult) {
        window.__ECHARTS__DEFAULT__RENDERER__ = matchResult[1];
    }

    // Set echarts source code.
    var matchResult = location.href.match(/[?&]__ECDIST__=(webpack-req-ec|webpack-req-eclibec|webpackold-req-ec|webpackold-req-eclibec)(&|$)/);
    var ecDistPath = 'dist/echarts';
    if (matchResult) {
        ecDistPath = ({
            'webpack-req-ec': '../echarts-boilerplate/echarts-webpack/dist/webpack-req-ec',
            'webpack-req-eclibec': '../echarts-boilerplate/echarts-webpack/dist/webpack-req-eclibec',
            'webpackold-req-ec': '../echarts-boilerplate/echarts-webpackold/dist/webpackold-req-ec',
            'webpackold-req-eclibec': '../echarts-boilerplate/echarts-webpackold/dist/webpackold-req-eclibec',
        })[matchResult[1]];
    }

    if (typeof require !== 'undefined') {
        require.config({
            baseUrl: baseUrl,
            paths: {
                'echarts': ecDistPath,
                'zrender': 'node_modules/zrender/dist/zrender',
                'geoJson': '../geoData/geoJson',
                'theme': 'theme',
                'data': 'test/data',
                'map': 'map',
                'extension': 'dist/extension'
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
                'map': 'map',
                'extension': 'extension'
            },
            // urlArgs: '_v_=' + (+new Date()),
            sourceMap: sourceMap
        });
    }


    // Mount bundle version print.
    if (typeof require !== 'undefined') {
        var originalRequire = require;
        window.require = function (deps, cb) {
            var newCb = function () {
                if (deps && deps instanceof Array) {
                    printBundleVersion(deps, [].slice.call(arguments));
                }
                cb && cb.apply(this, arguments);
            };
            return originalRequire.call(this, deps, newCb);
        };
    }

    function printBundleVersion(bundleIds, bundles) {
        var content = [];
        for (var i = 0; i < bundleIds.length; i++) {
            var bundle = bundles[i];
            var bundleVersion = bundle && bundle.bundleVersion;
            if (bundleVersion) {
                var date = new Date(+bundleVersion);
                // Check whether timestamp.
                if (!isNaN(+date)) {
                    bundleVersion = '<span style="color:yellow">'
                        + pad(date.getHours(), 2) + ':'
                        + pad(date.getMinutes(), 2) + ':'
                        + pad(date.getSeconds(), 2) + '.' + pad(date.getMilliseconds(), 3)
                        + '</span>';
                }
                else {
                    bundleVersion = encodeHTML(bundleVersion);
                }
                content.push(encodeHTML(bundleIds[i]) + '.js: ' + bundleVersion);
            }
        }

        var domId = 'ec-test-bundle-version';
        var dom = document.getElementById(domId);
        if (!dom) {
            dom = document.createElement('div');
            dom.setAttribute('id', domId);
            dom.style.cssText = [
                'background: rgb(52,56,64)',
                'color: rgb(215,215,215)',
                'position: fixed',
                'right: 0',
                'top: 0',
                'font-size: 10px',
                'padding: 1px 3px 1px 3px',
                'border-bottom-left-radius: 3px'
            ].join(';');
            document.body.appendChild(dom);
        }
        dom.innerHTML += content.join('');
    }

    function pad(num, len) {
        return ('000000' + num).substr(-len, len);
    }

    function encodeHTML(source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

})();