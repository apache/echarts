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

const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const uglifyPlugin = require('rollup-plugin-uglify');
const ecRemoveDevPlugin = require('./rollup-plugin-ec-remove-dev');
const ecLangPlugin = require('./rollup-plugin-ec-lang');
const {resolve} = require('path');
const preamble = require('./preamble');

function getPathBasedOnECharts(path) {
    return resolve(__dirname, '../', path);
}

function getPlugins({min, lang, sourcemap, removeDev, addBundleVersion}) {
    let plugins = [];

    removeDev && plugins.push(
        ecRemoveDevPlugin({sourcemap})
    );

    lang && plugins.push(
        ecLangPlugin({lang})
    );

    plugins.push(
        nodeResolvePlugin()
    );

    addBundleVersion && plugins.push({
        outro: function () {
            return 'exports.bundleVersion = \'' + (+new Date()) + '\';';
        }
    });

    min && plugins.push(uglifyPlugin({
        compress: {
            // Eliminate __DEV__ code.
            // Currently, in uglify:
            // `var vx; if(vx) {...}` can not be removed.
            // `if (__DEV__) {...}` can be removed if `__DEV__` is defined as `false` in `global_defs`.
            // 'global_defs': {
            //     __DEV__: false
            // },
            'dead_code': true
        },
        output: {
            preamble: preamble
        }
    }));

    return plugins;
}

/**
 * @param {Object} [opt]
 * @param {string} [opt.type=''] '' or 'simple' or 'common'
 * @param {boolean} [opt.min=false]
 * @param {string} [opt.lang=undefined] null/undefined/'' or 'en' or 'fi' or a file path.
 * @param {string} [opt.input=undefined] If set, `opt.output` is required too, and `opt.type` is ignored.
 * @param {string} [opt.output=undefined] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.sourcemap] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.removeDev]
 * @param {string} [opt.format='umd'] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.addBundleVersion=false] Only for debug in watch, prompt that the two build is different.
 */
exports.createECharts = function (opt = {}) {
    let min = opt.min;
    let srcType = opt.type ? '.' + opt.type : '.all';
    let postfixType = opt.type ? '.' + opt.type : '';
    let postfixMin = min ? '.min' : '';
    let postfixLang = opt.lang ? '-' + opt.lang.toLowerCase() : '';
    let input = opt.input;
    let output = opt.output;
    let sourcemap = opt.sourcemap;
    let format = opt.format || 'umd';

    if (input != null || output != null) {
        // Based on process.cwd();
        input = resolve(input);
        output = resolve(output);
    }
    else {
        input = getPathBasedOnECharts(`./echarts${srcType}.js`);
        output = getPathBasedOnECharts(`dist/echarts${postfixLang}${postfixType}${postfixMin}.js`);
    }

    return {
        plugins: getPlugins(opt),
        input: input,
        legacy: true, // Support IE8-
        output: {
            name: 'echarts',
            format: format,
            sourcemap: sourcemap,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            file: output
        },
        watch: {
            include: [
                getPathBasedOnECharts('./src/**'),
                getPathBasedOnECharts('./echarts*.js'),
                getPathBasedOnECharts('../zrender/src/**')
            ]
        }
    };
};

/**
 * @param {boolean} [min=false]
 */
exports.createBMap = function (min) {
    let postfix = min ? '.min' : '';

    return {
        plugins: getPlugins({min}),
        input: getPathBasedOnECharts(`./extension-src/bmap/bmap.js`),
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'bmap',
            format: 'umd',
            sourcemap: !min,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: getPathBasedOnECharts(`dist/extension/bmap${postfix}.js`)
        },
        watch: {
            include: [getPathBasedOnECharts('./extension-src/bmap/**')]
        }
    };
};

/**
 * @param {boolean} [min=false]
 */
exports.createDataTool = function (min) {
    let postfix = min ? '.min' : '';
    return {
        plugins: getPlugins({min}),
        input: getPathBasedOnECharts(`./extension-src/dataTool/index.js`),
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'dataTool',
            format: 'umd',
            sourcemap: !min,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: getPathBasedOnECharts(`dist/extension/dataTool${postfix}.js`)
        },
        watch: {
            include: [getPathBasedOnECharts('./extension-src/dataTool/**')]
        }
    };
};
