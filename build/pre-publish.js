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
 * Compatible with prevoius folder structure: `echarts/lib` exists in `node_modules`
 * (1) Build all files to CommonJS to `echarts/lib`.
 * (2) Remove __DEV__.
 * (3) Mount `echarts/src/export.js` to `echarts/lib/echarts.js`.
 */

const path = require('path');
const fsExtra = require('fs-extra');
const {color, travelSrcDir, prePulishSrc} = require('zrender/build/helper');

const ecDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(__dirname, '../src');
const extensionSrcDir = path.resolve(__dirname, '../extension-src');
const extensionDir = path.resolve(__dirname, '../extension');
const libDir = path.resolve(__dirname, '../lib');
const preamble = require('./preamble');


module.exports = function () {

    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);

    travelSrcDir(srcDir, ({fileName, relativePath, absolutePath}) => {
        prePulishSrc({
            inputPath: absolutePath,
            outputPath: path.resolve(libDir, relativePath, fileName),
            transform: transform,
            preamble: preamble.js
        });
    });

    travelSrcDir(extensionSrcDir, ({fileName, relativePath, absolutePath}) => {
        prePulishSrc({
            inputPath: absolutePath,
            outputPath: path.resolve(extensionDir, relativePath, fileName),
            transform: transform,
            preamble: preamble.js
        });
    });

    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.all.js'),
        outputPath: path.resolve(ecDir, 'index.js'),
        preamble: preamble.js
    });
    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.common.js'),
        outputPath: path.resolve(ecDir, 'index.common.js'),
        preamble: preamble.js
    });
    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.simple.js'),
        outputPath: path.resolve(ecDir, 'index.simple.js'),
        preamble: preamble.js
    });

    function transform({code, inputPath, outputPath}) {
        if (inputPath === path.resolve(ecDir, 'src/echarts.js')) {
            // Using `echarts/echarts.blank.js` to overwrite `echarts/lib/echarts.js`
            // for including exports API.
            code += `
var ___ec_export = require("./export");
(function () {
    for (var key in ___ec_export) {
        if (___ec_export.hasOwnProperty(key)) {
            exports[key] = ___ec_export[key];
        }
    }
})();`;
        }

        return code;
    }

    console.log(color('fgGreen', 'bright')('All done.'));
};
