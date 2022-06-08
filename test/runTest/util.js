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
const fse = require('fs-extra');
const https = require('https');
const fs = require('fs');
const rollup = require('rollup');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const config = require('./config');

function modifyEChartsCode(code) {
    return code.replace(/Math\.random/g, '__random__inner__')
        // https://github.com/apache/echarts/blob/737e23c0054e6b501ecc6f562920cffae953b5c6/src/core/echarts.ts#L537
        // This code will cause infinite loop if we reduce the precision of Date in the visual regression test.
        // TODO: This is a very dirty HACK.
        .replace('remainTime > 0', 'false');
}

module.exports.testNameFromFile = function(fileName) {
    return path.basename(fileName, '.html');
};

module.exports.fileNameFromTest = function (testName) {
    return testName + '.html';
};

function getVersionDir(version) {
    version = version || 'local';
    return `tmp/__version__/${version}`;
};
module.exports.getVersionDir = getVersionDir;

module.exports.getActionsFullPath = function (testName) {
    return path.join(__dirname, 'actions', testName + '.json');
};

module.exports.getEChartsTestFileName = function () {
    return `echarts.test-${config.testVersion}.js`;
};

module.exports.prepareEChartsLib = function (version) {

    const versionFolder = path.join(__dirname, getVersionDir(version));
    const ecDownloadPath = `${versionFolder}/echarts.js`;
    fse.ensureDirSync(versionFolder);
    if (!version || version === 'local') {
        // Developing version, make sure it's new build
        fse.copySync(path.join(__dirname, '../../dist/echarts.js'), `${versionFolder}/echarts.js`);
        let code = modifyEChartsCode(fs.readFileSync(ecDownloadPath, 'utf-8'));
        fs.writeFileSync(`${versionFolder}/${module.exports.getEChartsTestFileName()}`, code, 'utf-8');

        return Promise.resolve();
    }
    return new Promise(resolve => {
        const testLibPath = `${versionFolder}/${module.exports.getEChartsTestFileName()}`;
        if (!fs.existsSync(ecDownloadPath)) {
            const file = fs.createWriteStream(ecDownloadPath);
            const isNightly = version.includes('-dev');
            const packageName = isNightly ? 'echarts-nightly' : 'echarts'

            const url = `https://unpkg.com/${packageName}@${version}/dist/echarts.js`;
            console.log(`Downloading ${packageName}@${version} from ${url}`, );
            https.get(url, response => {
                response.pipe(file);

                file.on('finish', () => {
                    let code = modifyEChartsCode(fs.readFileSync(ecDownloadPath, 'utf-8'));
                    fs.writeFileSync(testLibPath, code, 'utf-8');
                    resolve();
                });
            });
        }
        else {
            // Always do code modifaction.
            // In case we need to do replacement on old downloads.
            let code = modifyEChartsCode(fs.readFileSync(ecDownloadPath, 'utf-8'));
            fs.writeFileSync(testLibPath, code, 'utf-8');
            resolve();
        }
    });
};

module.exports.fetchVersions = function (isNighlty) {
    return new Promise((resolve, reject) => {
        https.get(
            isNighlty
                ? `https://registry.npmjs.org/echarts-nightly`
                : `https://registry.npmjs.org/echarts`
        , res => {
            if (res.statusCode !== 200) {
                res.destroy();
                reject('Failed fetch versions from https://registry.npmjs.org/echarts');
                return;
            }
            var buffers = [];
            res.on('data', buffers.push.bind(buffers));
            res.on('end', function () {
                try {
                    var data = Buffer.concat(buffers);
                    resolve(Object.keys(JSON.parse(data).versions).reverse());
                }
                catch (e) {
                    reject(e.toString());
                }
            });
        });
    });
};

module.exports.buildRuntimeCode = async function () {
    const bundle = await rollup.rollup({
        input: path.join(__dirname, 'runtime/main.js'),
        plugins: [
            {
                // https://rollupjs.org/guide/en/#a-simple-example
                resolveId(source, importer) {
                    return source === 'crypto' ? source : null;
                },
                load(id) {
                    // seedrandom use crypto as external module
                    return id === 'crypto' ? 'export default null;' : null;
                }
            },
            nodeResolve(),
            commonjs()
        ]
    });
    const { output } = await bundle.generate({
        format: 'iife',
        name: 'autorun'
    });
    return output[0].code;
};

module.exports.waitTime = function (time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};