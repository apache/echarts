
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

const fs = require('fs');
const preamble = require('./preamble');
const ts = require('typescript');
const path = require('path');
const fsExtra = require('fs-extra');

const umdWrapperHead = `
${preamble.js}
/**
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory({});
    }
})(this, function(exports) {
`;

const umdWrapperHeadWithEcharts = `
${preamble.js}
/**
 * AUTO-GENERATED FILE. DO NOT MODIFY.
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'echarts'], factory);
    } else if (
        typeof exports === 'object' &&
        typeof exports.nodeName !== 'string'
    ) {
        // CommonJS
        factory(exports, require('echarts/lib/echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
})(this, function(exports, echarts) {
`;

const umdWrapperTail = `
});`;

async function buildI18nWrap() {
    const targetDir = path.join(__dirname, '../i18n');
    const sourceDir = path.join(__dirname, '../src/i18n');
    const files = fs.readdirSync(sourceDir);
    files.forEach(t => {
        if(!t.startsWith('lang')) {
            return;
        }
        const fileName = t.replace(/\.ts$/, '');
        const type = fileName.replace(/^lang/, '');
        const echartsRegister = `
    echarts.registerLocale('${type}', localeObj);
        `;
        const pureExports = `
    for (var key in localeObj) {
        if (localeObj.hasOwnProperty(key)) {
            exports[key] = localeObj[key];
        }
    }
        `;
        const code = fs.readFileSync(path.join(sourceDir, t), 'utf-8');
        // const outputText = ts.transpileModule(code, {
        //     module: ts.ModuleKind.CommonJS,
        // }).outputText;
        // Simple regexp replace is enough
        const outputCode = code.replace(/export\s+?default/, 'var localeObj =')
            .replace(/\/\*([\w\W]*?)\*\//, '');

        fsExtra.ensureDirSync(targetDir);

        fs.writeFileSync(path.join(targetDir, fileName + '.js'), umdWrapperHeadWithEcharts + outputCode + echartsRegister + umdWrapperTail, 'utf-8');
        fs.writeFileSync(path.join(targetDir, fileName + '-obj.js'), umdWrapperHead + outputCode + pureExports + umdWrapperTail, 'utf-8');
    })
    console.log('i18n build completed');
}

buildI18nWrap();

module.exports = {
    buildI18n: buildI18nWrap
};
