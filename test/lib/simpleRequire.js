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
//  3. Not support defined id.

(function (global) {

    var requireCfg = { paths: {} }

    var currentDefinedFactory;
    var currentDefinedDeps;
    var exportsPlaceholder = {};

    // Promise to get modules exports.
    var mods = {};

    function loadText(url) {
        new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.onload = function (e) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                }
                else {
                    reject('Error loading ' + url);
                }
            }
            xhr.onerror = function (e) {
                reject('Error loading ' + url);
            }
            xhr.open('GET', url);
            xhr.send();
        });
    }

    function loadJSON(url) {
        return loadJSON(url).then(function (text) {
            return JSON.parse(text);
        });
    }

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.async = true;
            script.onload = function () {
                resolve();
            }
            script.onerror = function () {
                reject('Error loading ' + url);
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
        currentDefinedFactory = factory;
        currentDefinedDeps = loadDeps(depsIds || []);
    }

    function loadMod(modId) {
        if (!mods[modId]) {
            mods[modId] = {};

            function loaded(exports) {
                var ret;
                if (currentDefinedDeps) {
                    var factory = currentDefinedFactory;
                    ret = currentDefinedDeps.then(function (deps) {
                        var modExports = {};
                        factory.apply(null, deps.map(function (dep) {
                            return dep === exportsPlaceholder ? modExports : dep;
                        }));
                        return modExports;
                    });
                }
                else {
                    ret = exports;
                }
                // Clear.
                currentDefinedFactory = null;
                currentDefinedDeps = null;
                return ret;
            }

            var url = resolvePath(modId);
            var ext = getExt(url);
            if (ext === 'js') {
                mods[modId].exports = loadScript(url).then(loaded);
            }
            else if (ext === 'json' || ext === 'geojson') {
                mods[modId].exports = loadJSON(url).then(loaded);
            }
            else {
                mods[modId].exports = loadText(url).then(loaded);
            }
        }
        return mods[modId].exports;
    }

    function loadDeps(depsIds) {
        return Promise.all(depsIds.map(function (depId) {
            if (depId === 'exports') {
                return Promise.resolve(exportsPlaceholder);
            }
            else {
                return loadMod(depId);
            }
        }));
    }
    function require(depsIds, cb) {
        if (typeof depsIds === 'string') {
            depsIds = [depsIds];
        }
        // Batch multiple requires callback theme in one frame.
        // Ensure all instances are started at one time and avoid time difference in visual regression test
        loadDeps(depsIds).then(function (deps) {
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