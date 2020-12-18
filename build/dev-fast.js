
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

const chokidar = require('chokidar');
const path = require('path');
const {build} = require('esbuild');
const fs = require('fs');
const debounce = require('lodash.debounce');

const outFilePath = path.resolve(__dirname, '../dist/echarts.js');

const umdMark = '// ------------- WRAPPED UMD --------------- //';
const umdWrapperHead = `
${umdMark}
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory((root.echarts = {}));
    }
}(typeof self !== 'undefined' ? self : this, function (exports, b) {
`;

const umdWrapperTail = `
}));`;

async function wrapUMDCode() {
    const code = fs.readFileSync(outFilePath, 'utf-8');
    if (code.indexOf(umdMark) >= 0) {
        return;
    }

    fs.writeFileSync(
        outFilePath,
        // Replaced __DEV__ with a same length string to avoid breaking source map
        umdWrapperHead + code.replace(/__DEV__/g, "\'_DEV_\'") + umdWrapperTail,
        'utf-8'
    );

    const sourceMap = JSON.parse(fs.readFileSync(outFilePath + '.map', 'utf-8'));
    // Fast trick for fixing source map
    sourceMap.mappings = umdWrapperHead.split('\n').map(() => '').join(';') + sourceMap.mappings;

    fs.writeFileSync(outFilePath + '.map', JSON.stringify(sourceMap), 'utf-8');
}

function rebuild() {
    build({
        // stdio: 'inherit',
        entryPoints: [path.resolve(__dirname, '../src/echarts.all.ts')],
        outfile: outFilePath,
        format: 'cjs',
        sourcemap: true,
        bundle: true,
    }).catch(e => {
        console.error(e.toString());
    }).then(async () => {
        console.time('Wrap UMD');
        await wrapUMDCode();
        console.timeEnd('Wrap UMD');
    })
}

const debouncedRebuild = debounce(rebuild, 100);

chokidar.watch([
    path.resolve(__dirname, '../src/**/*.ts'),
    path.resolve(__dirname, '../node_modules/zrender/src/**/*.ts'),
], {
    persistent: true
}).on('all', debouncedRebuild);