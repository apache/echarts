/**
 * Load es modules in browser.
 * rollup.browser.js is required.
 *
 * Caution: Modules are not shared between different
 * calling of `simpleModuleLoader.load()`.
 *
 * Usage:
 *
 * // AMD config like.
 * requireES.config({
 *     baseUrl: '..',
 *     paths: {
 *         ...
 *     },
 *     packages: [
 *         {...}, ...
 *     ]
 * });
 *
 * requireES([
 *     'xxx/moduleA',
 *     'yyy/moduleB'
 * ], function (moduleA, moduleB) {
 *     ...
 * });
 *
 * requireES.remove([
 *     'xxx/moduleA',
 *     'yyy/moduleB'
 * ]);
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
        packages: []
    };

    /**
     * Like AMD config.
     *
     * @param {Object} cfg {
     * @param {string} [cfg.baseUrl='.']
     * @param {Object} [cfg.paths]
     */
    function amdConfig(cfg) {
        if (cfg.baseUrl) {
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
            plugins: [{
                resolveId: function (importee, importor) {
                    if (importee === TOP_MODULE_NAME) {
                        return importee;
                    }
                    // console.log('resolveid', importee, importor);
                    return resolvePath(importee, importor);
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
            var external = [];
            for (var i = 0; i < bundle.imports.length; i++) {
                external.push();
            }
            return bundle.generate({
                format: 'iife',
                name: TOP_MODULE_NAME
            });
        }).then(function (result) {
            var modules = (new Function(
                'var __DEV__ = true; '
                + result.code
                + '\n return ' + TOP_MODULE_NAME
            ))();

            var exportsList = [];
            for (var i = 0; i < moduleIds.length; i++) {
                exportsList.push(modules['m' + i]);
            }
            onload && onload.apply(null, exportsList);
        });
    }

    requireES.config = amdConfig;

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

    // Get absolute path. `refPath` can be omitted if moduleId is absolute.
    function resolvePath(moduleId, basePath) {
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

        return moduleId;
    }

    function addExt(moduleId) {
        if (moduleId.split('/').pop().indexOf('.') < 0) {
            moduleId += '.js';
        }
        return moduleId;
    }

    function ajax(toUrl) {
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
