
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
 * Load es modules in browser.
 * rollup.browser.js is required.
 *
 * [Usage]:
 *
 * // AMD config like.
 * requireES.config({
 *     baseUrl: '..',
 *     paths: {
 *         ...
 *     },
 *     packages: [
 *         {...}, ...
 *     ],
 *     urlArgs: +new Date(),
 *     sourceMap: true // Enable sourceMap for debugging. `false` by default.
 * });
 *
 * requireES([
 *     'xxx/moduleA',
 *     'yyy/moduleB'
 * ], function (moduleA, moduleB) {
 *     ...
 * });
 *
 * [Caution]:
 *
 * 1) Modules are not shared between different calling of `requireES(...)`.
 *
 * 2) Whether import `*` or `default` is determined by the module itself.
 * That is, if the module (like `xxx/SomeClz`) only export `default` , it
 * imports `default`, otherwise (like `xxx/util`) it imports `*`.
 */

/* global define, ActiveXObject */

(function (global, factory) {
    typeof define === 'function' && define.amd
        ? define(['rollup'], factory)
        : (global.requireES = factory(global.rollup));
    }(this, function (rollup) { 'use strict';

    var TOP_MODULE_NAME = 'topModuleInRequireES';

    var amdCfg = {
        baseUrl: cwd(),
        paths: {},
        packages: [],
        urlArgs: null
    };

    /**
     * Like AMD config.
     *
     * @param {Object} cfg {
     * @param {string} [cfg.baseUrl='.']
     * @param {Object} [cfg.paths={}]
     * @param {Array.<Object>} [cfg.packages=[]]
     * @param {string} [cfg.urlArgs='']
     * @param {boolean} [cfg.sourceMap=false]
     */
    function amdConfig(cfg) {
        if (cfg.baseUrl != null) {
            amdCfg.baseUrl = resolve(cwd(), cfg.baseUrl);
        }
        if (cfg.paths) {
            amdCfg.paths = extend({}, cfg.paths);
        }
        if (cfg.packages) {
            amdCfg.packages.length = 0;
            for (var i = 0; i < cfg.packages.length; i++) {
                amdCfg.packages[i] = extend({}, cfg.packages[i]);
            }
        }
        if (cfg.urlArgs != null) {
            amdCfg.urlArgs = cfg.urlArgs;
        }
        if (cfg.sourceMap != null) {
            amdCfg.sourceMap = cfg.sourceMap;
        }
    }

    /**
     * Load es modules and convert to AMD modules.
     *
     * @param {Array.<string>} moduleIds like ['./echarts', ...]
     * @param {Function} onload Arguments: loaded modules,
     *  which has been converted to AMD module.
     */
    function requireES(moduleIds, onload) {

        if (!(moduleIds instanceof Array)) {
            throw new Error('`path` should be an array');
        }

        if (!moduleIds.length) {
            return;
        }

        var topCode = generateTopModuleCode(moduleIds);

        rollup.rollup({
            input: TOP_MODULE_NAME,
            legacy: true,
            plugins: [{
                resolveId: function (importee, importor) {
                    if (importee === TOP_MODULE_NAME) {
                        return importee;
                    }
                    // console.log('resolveid', importee, importor);
                    return getAbsolutePath(
                        importee,
                        importor !== TOP_MODULE_NAME ? importor : null
                    );
                },
                load: function (path) {
                    if (path === TOP_MODULE_NAME) {
                        return topCode;
                    }
                    // TODO Use tag to void browser cache and cache manually.
                    return ajax(location.origin + path);
                }
            }]
        }).then(function (bundle) {
            return bundle.generate({
                format: 'iife',
                legacy: true,
                // But only bundle.write support generating inline source map.
                sourcemap: 'inline',
                name: TOP_MODULE_NAME
            });
        }).then(function (result) {

            var code = result.code;

            if (amdCfg.sourceMap) {
                code = addSourceMap(code, result.map);
            }

            var modules = (new Function(
                'var __DEV__ = true; '
                + code
                + '\n return ' + TOP_MODULE_NAME
            ))();

            var exportsList = [];
            for (var i = 0; i < moduleIds.length; i++) {
                var mod = modules['m' + i];
                // Guess whether `*` or `default` is required: if only `default`
                // exported, like 'xxx/SomeClz', `default` is required.
                if (onlyDefaultExported(mod)) {
                    mod = mod['default'];
                }
                exportsList.push(mod);
            }
            onload && onload.apply(null, exportsList);
        });
    }

    requireES.config = amdConfig;

    function onlyDefaultExported(mod) {
        for (var name in mod) {
            if (mod.hasOwnProperty(name)) {
                if (name !== 'default') {
                    return false;
                }
            }
        }
        return true;
    }

    function generateTopModuleCode(moduleIds) {
        var code = [];

        for (var i = 0; i < moduleIds.length; i++) {
            var moduleId = moduleIds[i];
            code.push('import * as m' + i + ' from "' + moduleId + '";');
        }

        for (var i = 0; i < moduleIds.length; i++) {
            code.push('export {m' + i + '};');
        }

        return code.join('\n');
    }

    // Get absolute path. `basePath` can be omitted if moduleId is absolute.
    function getAbsolutePath(moduleId, basePath) {
        moduleId = addExt(moduleId);

        for (var path in amdCfg.paths) {
            if (amdCfg.paths.hasOwnProperty(path)) {
                if (moduleId.indexOf(path) === 0) {
                    moduleId = moduleId.replace(path, amdCfg.paths[path]);
                    return resolve(amdCfg.baseUrl, moduleId);
                }
            }
        }

        for (var i = 0; i < amdCfg.packages.length; i++) {
            var packageCfg = amdCfg.packages[i];
            var moduleIdArr = moduleId.split('/');
            if (moduleIdArr[0] === packageCfg.name) {
                moduleIdArr[0] = packageCfg.location;
                if (!moduleIdArr[1]) {
                    moduleIdArr[1] = packageCfg.main;
                }
                moduleId = moduleIdArr.join('/');
                return resolve(amdCfg.baseUrl, moduleId);
            }
        }

        if (basePath) {
            moduleId = resolve(dir(basePath), moduleId);
        }

        if (moduleId.charAt(0) !== '/') {
            throw new Error('"' + moduleId + '" can not be found.');
        }

        return moduleId;
    }

    function addExt(moduleId) {
        if (moduleId.split('/').pop().indexOf('.') < 0) {
            moduleId += '.js';
        }
        return moduleId;
    }

    function ajax(toUrl) {
        if (amdCfg.urlArgs != null) {
            toUrl += '?' + amdCfg.urlArgs;
        }

        return new Promise(function (promiseResolve, promiseReject) {
            var xhr = window.XMLHttpRequest
                ? new XMLHttpRequest()
                : new ActiveXObject('Microsoft.XMLHTTP');

            xhr.open('GET', toUrl, true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    (xhr.status >= 200 && xhr.status < 300)
                        ? promiseResolve(xhr.responseText)
                        : promiseReject({
                            status: xhr.status,
                            content: xhr.responseText
                        });
                    xhr.onreadystatechange = new Function();
                    xhr = null;
                }
            };

            xhr.send(null);
        });
    }

    // Nodejs `path.resolve`.
    function resolve() {
        var resolvedPath = '';
        var resolvedAbsolute;

        for (var i = arguments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
            var path = arguments[i];
            if (path) {
                resolvedPath = path + '/' + resolvedPath;
                resolvedAbsolute = path[0] === '/';
            }
        }

        if (!resolvedAbsolute) {
            throw new Error('At least one absolute path should be input.');
        }

        // Normalize the path
        resolvedPath = normalizePathArray(resolvedPath.split('/'), false).join('/');

        return '/' + resolvedPath;
    }

    // resolves . and .. elements in a path array with directory names there
    // must be no slashes or device names (c:\) in the array
    // (so also no leading and trailing slashes - it does not distinguish
    // relative and absolute paths)
    function normalizePathArray(parts, allowAboveRoot) {
        var res = [];
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];

            // ignore empty parts
            if (!p || p === '.') {
                continue;
            }

            if (p === '..') {
                if (res.length && res[res.length - 1] !== '..') {
                    res.pop();
                } else if (allowAboveRoot) {
                    res.push('..');
                }
            } else {
                res.push(p);
            }
        }

        return res;
    }

    function addSourceMap(code, map) {
        // Use unescape(encodeURIComponent) to avoid the error on Chrome:
        // Uncaught (in promise) DOMException: Failed to execute 'btoa' on 'Window':
        // The string to be encoded contains characters outside of the Latin1 range
        var dataURI = btoa(unescape(encodeURIComponent(map.toString()))); // jshint ignore:line
        dataURI = 'data:application/json;charset=utf-8;base64,' + dataURI;

        // Split the string to prevent sourcemap tooling from mistaking
        // this for an actual sourceMappingURL.
        code += '//# ' + 'sourceMa' + 'ppingURL' + '=' + dataURI + '\n';

        return code;
    }

    function cwd() {
        // Only support that works in browser.
        return dir(location.pathname);
    }

    function dir(path) {
        if (path) {
            return path.charAt(path.length - 1) === '/' ? path : resolve(path, '..');
        }
    }

    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    return requireES;

}));
