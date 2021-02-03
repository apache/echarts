
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

const path = require('path');
const {build} = require('esbuild');

const outFilePath = path.resolve(__dirname, '../dist/echarts.js');

const umdMark = '// ------------- WRAPPED UMD --------------- //';
const umdWrapperHead = `
${umdMark}
(function (root, factory) {
    window.__DEV__ = true;
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

build({
    entryPoints: [path.resolve(__dirname, '../src/echarts.all.ts')],
    outfile: outFilePath,
    format: 'cjs',
    sourcemap: true,
    bundle: true,
    banner: umdWrapperHead,
    footer: umdWrapperTail,
    watch: {
        async onRebuild(error) {
            if (error) {
                console.error('watch build failed:', error)
            } else {
                console.log('build done')
            }
        },
    },
}).then(async () => {
    console.log('build done')
}).catch(e => console.error(e.toString()))
