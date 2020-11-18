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

const assert = require('assert');
const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const nodePath = require('path');
const ecDir = nodePath.resolve(__dirname, '..');
const typescriptPlugin = require('rollup-plugin-typescript2');
const fs = require('fs');
const progress = require('./progress');

function preparePlugins(
    {sourcemap, addBundleVersion, totalFiles, clean},
    {include, exclude}
) {
    assert(include);

    // In case node_modules/zrender is a symlink
    const zrNodeModulePath = nodePath.resolve(ecDir, 'node_modules/zrender');
    const zrRealPath = fs.realpathSync(zrNodeModulePath);
    // if (zrRealPath !== zrNodeModulePath) {
    //     include.push(zrRealPath + '/**/*.ts');
    // }
    include.push(zrRealPath + '/**/*.ts');

    if (clean) {
        console.log('Built in clean mode without cache.');
    }

    let plugins = [
        typescriptPlugin({
            tsconfig: nodePath.resolve(ecDir, 'tsconfig.json'),
            tsconfigOverride: {
                // See: https://www.typescriptlang.org/docs/handbook/compiler-options.html
                compilerOptions: {
                    // By default: target === "ES3" or "ES5" ? "CommonJS" : "ES6".
                    // But rollup don't use CommonJS.
                    module: 'ES2015',
                    sourceMap: !!sourcemap,
                    // Use the esm d.ts
                    declaration: false
                }
                // include: include,
                // exclude: exclude || []
            },
            clean: clean || false,
            include: include,
            exclude: exclude || []
        }),
        nodeResolvePlugin(),
        progress({
            scope: {
                total: totalFiles || 0
            }
        })
    ];

    addBundleVersion && plugins.push({
        outro: function () {
            return 'exports.bundleVersion = \'' + (+new Date()) + '\';';
        }
    });

    return plugins;
}

/**
 * @param {Object} [opt]
 * @param {string} [opt.type=''] '' or 'simple' or 'common'
 * @param {string} [opt.input=undefined] If set, `opt.output` is required too, and `opt.type` is ignored.
 * @param {string} [opt.output=undefined] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.sourcemap] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {string} [opt.format='umd'] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.addBundleVersion=false] Only for debug in watch, prompt that the two build is different.
 * @param {Object} [opt.totalFiles] Total files to bundle
 */
exports.createECharts = function (opt = {}) {
    let srcType = opt.type ? '.' + opt.type : '.all';
    let postfixType = opt.type ? '.' + opt.type : '';
    let input = opt.input;
    let output = opt.output;
    let sourcemap = opt.sourcemap;
    let format = opt.format || 'umd';
    let postfixFormat = (format !== 'umd') ? '.' + format.toLowerCase() : '';

    if (input != null || output != null) {
        // Based on process.cwd();
        input = nodePath.resolve(input);
        output = nodePath.resolve(output);
    }
    else {
        input = nodePath.resolve(ecDir, `src/echarts${srcType}.ts`);
        output = nodePath.resolve(ecDir, `dist/echarts${postfixFormat}${postfixType}.js`);
    }

    const include = [
        nodePath.resolve(ecDir, 'src/**/*.ts')
    ];

    return {
        plugins: preparePlugins(opt, {
            include
        }),

        // external: ['zrender'],
        // external: id => ['zrender'].includes(id),

        input: input,
        // FIXME ??? ie8 support removed since rollup 0.60
        // legacy: true, // Support IE8-

        // onwarn ({loc, frame, message}) {
        //     if (loc) {
        //         console.warn(`${loc.file} (${loc.line}:${loc.column}) ${message}`);
        //         if (frame) {
        //             console.warn(frame);
        //         }
        //     }
        //     else {
        //         console.warn(message);
        //     }
        // },

        output: {
            name: 'echarts',
            format: format,
            sourcemap: sourcemap,
            // legacy: true, // Must be declared both in inputOptions and outputOptions.
            file: output
        },
        watch: {
            include
        }
    };
};

exports.createBMap = function () {
    let input = nodePath.resolve(ecDir, `extension-src/bmap/bmap.ts`);

    return {
        plugins: preparePlugins({
            // Always clean
            clean: true
        }, {
            include: [
                nodePath.resolve(ecDir, 'extension-src/bmap/**/*.ts')
            ]
        }),
        input: input,
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'bmap',
            format: 'umd',
            sourcemap: true,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: nodePath.resolve(ecDir, `dist/extension/bmap.js`)
        },
        watch: {
            include: [nodePath.resolve(ecDir, 'extension-src/bmap/**')]
        }
    };
};

exports.createDataTool = function () {
    let input = nodePath.resolve(ecDir, `extension-src/dataTool/index.ts`);

    return {
        plugins: preparePlugins({
            clean: true
        }, {
            include: [
                nodePath.resolve(ecDir, 'extension-src/dataTool/**/*.ts')
            ]
        }),
        input: input,
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'dataTool',
            format: 'umd',
            sourcemap: true,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: nodePath.resolve(ecDir, `dist/extension/dataTool.js`)
        },
        watch: {
            include: [nodePath.resolve(ecDir, 'extension-src/dataTool/**')]
        }
    };
};
