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

const nodeResolvePlugin = require('@rollup/plugin-node-resolve').default;
const nodePath = require('path');
const ecDir = nodePath.resolve(__dirname, '..');
const {terser} = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const MagicString = require('magic-string');
const preamble = require('./preamble');

function createAddLicensePlugin(sourcemap) {
    return {
        renderChunk(code, chunk) {
            const s = new MagicString(code);
            s.prepend(preamble.js);
            return {
                code: s.toString(),
                map: sourcemap ? s.generateMap({ hires: true }).toString() : null
            };
        }
    }
}

function createOutputs(basename, { min }, commonOutputOpts) {
    commonOutputOpts = {
        format: 'umd',
        ...commonOutputOpts
    }
    function createReplacePlugin(replacement) {
        const plugin = replace({
            'process.env.NODE_ENV': JSON.stringify(replacement)
        });
        // Remove transform hook. It will have warning when using in output
        delete plugin.transform;
        return plugin;
    }
    const output = [{
        ...commonOutputOpts,
        // Disable sourcemap in
        sourcemap: true,
        plugins: [
            createReplacePlugin('development'),
            createAddLicensePlugin(true)
        ],
        file: basename + '.js'
    }];

    if (min) {
        output.push({
            ...commonOutputOpts,
            // Disable sourcemap in min file.
            sourcemap: false,
            // TODO preamble
            plugins: [
                createReplacePlugin('production'),
                terser(),
                createAddLicensePlugin(false)
            ],
            file: basename + '.min.js'
        })
    }
    return output;
}

/**
 * @param {Object} [opt]
 * @param {string} [opt.type=''] 'all' or 'simple' or 'common', default is 'all'
 * @param {boolean} [opt.sourcemap] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {string} [opt.format='umd'] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {string} [opt.min=false] If build minified output
 * @param {boolean} [opt.addBundleVersion=false] Only for debug in watch, prompt that the two build is different.
 */
exports.createECharts = function (opt = {}) {
    const srcType = opt.type !== 'all' ? '.' + opt.type : '';
    const postfixType = srcType;
    const format = opt.format || 'umd';
    const postfixFormat = (format !== 'umd') ? '.' + format.toLowerCase() : '';

    const input = nodePath.resolve(ecDir, `index${srcType}.js`);

    return {
        plugins: [nodeResolvePlugin()],
        treeshake: {
            moduleSideEffects: false
        },

        input: input,

        output: createOutputs(
            nodePath.resolve(ecDir, `dist/echarts${postfixFormat}${postfixType}`),
            opt,
            {
                name: 'echarts',
                // Ignore default exports, which is only for compitable code like:
                // import echarts from 'echarts/lib/echarts';
                exports: 'named',
                format: format
            }
        )
    };
};

exports.createBMap = function (opt) {
    const input = nodePath.resolve(ecDir, `extension/bmap/bmap.js`);

    return {
        plugins: [nodeResolvePlugin()],
        input: input,
        external: ['echarts'],
        output: createOutputs(
            nodePath.resolve(ecDir, `dist/extension/bmap`),
            opt,
            {
                name: 'bmap',
                globals: {
                    // For UMD `global.echarts`
                    echarts: 'echarts'
                }
            }
        )
    };
};

exports.createDataTool = function (opt) {
    let input = nodePath.resolve(ecDir, `extension/dataTool/index.js`);

    return {
        plugins: [nodeResolvePlugin()],
        input: input,
        external: ['echarts'],
        output: createOutputs(
            nodePath.resolve(ecDir, `dist/extension/dataTool`),
            opt,
            {
                name: 'dataTool',
                globals: {
                    // For UMD `global.echarts`
                    echarts: 'echarts'
                }
            }
        )
    };
};

exports.createMyTransform = function (opt) {
    let input = nodePath.resolve(ecDir, `test/lib/myTransform/src/index.ts`);

    return {
        plugins: [nodeResolvePlugin()],
        input: input,
        output: createOutputs(
            nodePath.resolve(ecDir, `test/lib/myTransform/dist/myTransform`),
            opt,
            {
                name: 'myTransform'
            }
        )
    };
};
