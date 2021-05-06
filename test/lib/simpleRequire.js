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

// A very simple require implentation that for echarts test usage.
// Which have some special design that is needed in visual regression test.
//  1. Can load JSON, text and script
//  2. Require callback will be batched and invoked in one frame.
//  3. Will throw error immediately if resource not exists.
//
// Limitations:
//  1. Not support ancient browsers.
//  2. Only `paths` can be configured

(function (global) {

    var requireCfg = { paths: {} }

    var currentDefinedExports;
    var exportsPlaceholder = {};

    // { loaded, content, callbacks: [] }
    var loadingCache = {};
    // { exports }
    var mods = {};

    function checkLoadingCache(url, cb, onMiss) {
        var cache = loadingCache[url];
        if (cache) {
            if (cache.loaded) {
                setTimeout(function () {
                    cb(cache.exports);
                });
            }
            else {
                cache.callbacks.push(cb);
            }
        }
        else {
            cache = loadingCache[url] = {
                content: null,
                loaded: null,
                callbacks: [cb]
            }
            onMiss(function (content) {
                cache.content = content;
                cache.callbacks.forEach(function (cb) {
                    cb(content);
                });
                cache.callbacks = [];
            });
        }
    }

    function loadText(url, cb) {
        checkLoadingCache(url, cb, function (loaded) {
            var xhr = new XMLHttpRequest();
            xhr.onload = function (e) {
                if (xhr.status === 200) {
                    loaded(xhr.responseText);
                }
                else {
                    throw new Error('Error loading ' + url);
                }
            }
            xhr.onerror = function (e) {
                throw new Error('Error loading ' + url);
            }
            xhr.open('GET', url);
            xhr.send();
        });
    }

    function loadJSON(url, cb) {
        loadText(url, function (text) {
            cb(JSON.parse(text));
        });
    }

    function loadScript(url, cb) {
        checkLoadingCache(url, cb, function (loaded) {
            var script = document.createElement('script');
            script.async = true;
            script.onload = function () {
                loaded();
            }
            script.onerror = function () {
                currentDefinedExports = null;
                throw new Error('Error loading ' + url);
            }
            script.src = url;
            document.head.appendChild(script);
        });
    }

    function resolvePath(p) {
        var paths = requireCfg.paths || {};

        for (var key in paths) {
            if (paths.hasOwnProperty(key)) {
                if (p.indexOf(key) === 0) {
                    p = p.replace(key, paths[key]);
                    break;
                }
            }
        }

        var filename = p.split('/').pop();
        // Add .js ext automatically
        if (filename.indexOf('.') < 0) {
            p = p + '.js';
        }

        return p;
    }

    function getExt(str) {
        return str.split('.').pop();
    }

    // var cachedResources = {};
    // var pendingRequires = [];

    // Simplify the logic. don't support id.
    function define(modId, depsIds, factory) {
        if (factory == null) {
            // define(function () {});
            if (depsIds == null) {
                factory = modId;
                modId = null;
            }
            else {
                // define('modId', function () {});
                factory = depsIds;
                depsIds = null;
                // define(['depsId'], function () {});
                if (modId instanceof Array) {
                    depsIds = modId;
                    modId = null;
                }
            }
        }

        loadDeps(depsIds || [], function (deps) {
            if (typeof factory === 'function') {
                var modExports;
                if (!modId) {
                    modExports = currentDefinedExports = {};
                }
                else {
                    mods[modId] = { exports: {} };
                    modExports = mods[modId].exports;
                }
                factory.apply(null, deps.map(function (dep) {
                    return dep === exportsPlaceholder ? modExports : dep;
                }));
            }
            else {
                // define(JSONObject)
                currentDefinedExports = factory;
            }
        });
    }

    function loadDep(modId, cb) {
        if (mods[modId]) {
            // pending async?
            cb(mods[modId].exports);
            return;
        }

        function loaded(exports) {
            // Needs to use currentDefinedExports if loading scripts.
            mods[modId] = {
                exports: currentDefinedExports || exports
            };
            // Clear.
            currentDefinedExports = null;
            cb(mods[modId].exports);
        }

        var url = resolvePath(modId);
        var ext = getExt(url);
        if (ext === 'js') {
            loadScript(url, loaded);
        }
        else if (ext === 'json' || ext === 'geojson') {
            loadJSON(url, loaded);
        }
        else {
            loadText(url, loaded);
        }
    }

    function loadDeps(depsIds, cb) {
        var deps = [];
        var count = depsIds.length;
        depsIds.forEach(function (depId, idx) {
            if (depId === 'exports') {
                deps[idx] = exportsPlaceholder;
                count--;
                if (!count) {
                    cb(deps);
                }
            }
            else {
                loadDep(depId, function (dep) {
                    deps[idx] = dep;
                    count--;
                    if (!count) {
                        cb(deps);
                    }
                });
            }
        });
        if (!count) {
            cb(deps);
        }
    }
    function require(depsIds, cb) {
        if (typeof depsIds === 'string') {
            depsIds = [depsIds];
        }

        // Batch multiple requires in one frame and callback theme in one frame.
        // Ensure all instances are started at one time and avoid time difference in visual regression test
        loadDeps(depsIds, function (deps) {
            cb && cb.apply(null, deps);
        });
    }

    require.config = function (cfg) {
        requireCfg = cfg || {};
    }

    global.require = require;
    global.define = define;
    global.define.amd = {};
})(window);