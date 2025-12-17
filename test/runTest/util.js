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

function getVersionDir(source, version) {
    version = version || 'local';
    if (source === 'PR') {
        // For PR preview artifacts
        const prNumber = version.replace(/^#/, '');
        return `tmp/__version__/pr-${prNumber}`;
    }
    return `tmp/__version__/${version}`;
}
module.exports.getVersionDir = getVersionDir;

module.exports.getActionsFullPath = function (testName) {
    return path.join(__dirname, 'actions', testName + '.json');
};

module.exports.getMarkedAsExpectedFullPath = function (testName) {
    return path.join(__dirname, 'marks', testName + '.json');
};

module.exports.getUserMetaFullPath = function () {
    return path.join(__dirname, 'tmp', 'meta.json');
};

module.exports.getEChartsTestFileName = function () {
    return `echarts.test-${config.testVersion}.js`;
};

// Clean PR directories at the start of initing because PR code may change
module.exports.cleanPRDirectories = function () {
    const baseDir = path.join(__dirname, 'tmp/__version__');
    if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir);
        dirs.forEach(dir => {
            if (dir.startsWith('pr-')) {
                fse.removeSync(path.join(baseDir, dir));
            }
        });
    }
}

module.exports.prepareEChartsLib = function (source, version, useCNMirror) {
    console.log(`Preparing ECharts lib: ${source} ${version}`);

    const versionFolder = path.join(__dirname, getVersionDir(source, version));
    const ecDownloadPath = `${versionFolder}/echarts.js`;
    const testLibPath = `${versionFolder}/${module.exports.getEChartsTestFileName()}`;

    fse.ensureDirSync(versionFolder);

    if (!version || version === 'local') {
        // Developing version, make sure it's new build
        fse.copySync(path.join(__dirname, '../../dist/echarts.js'), ecDownloadPath);
        let code = modifyEChartsCode(fs.readFileSync(ecDownloadPath, 'utf-8'));
        fs.writeFileSync(testLibPath, code, 'utf-8');
        return Promise.resolve();
    }
    else if (fs.existsSync(ecDownloadPath) && fs.existsSync(testLibPath) &&
        fs.statSync(ecDownloadPath).size > 0 && fs.statSync(testLibPath).size > 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        let url;

        if (source === 'PR') {
            const prNumber = version.replace(/^#/, '');
            if (!/^\d+$/.test(prNumber)) {
                reject('Invalid PR number format. Should be #123');
                return;
            }
            url = `https://echarts-pr-${prNumber}.surge.sh/dist/echarts.js`;
        }
        else {
            const isNightly = source === 'nightly';
            const packageName = isNightly ? 'echarts-nightly' : 'echarts';
            url = useCNMirror
                ? `https://registry.npmmirror.com/${packageName}/${version}/files/dist/echarts.js`
                : `https://unpkg.com/${packageName}@${version}/dist/echarts.js`;
        }

        console.log(`Downloading ECharts from ${url}`);
        https.get(url, response => {
            if (response.statusCode === 404) {
                reject(`PR artifact doesn't exist at ${url}. Make sure the PR build is complete.`);
                return;
            }

            let data = '';
            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                if (!data) {
                    reject(`Downloaded file is empty from ${url}`);
                    return;
                }
                fs.writeFileSync(ecDownloadPath, data, 'utf-8');
                const code = modifyEChartsCode(data);
                fs.writeFileSync(testLibPath, code, 'utf-8');
                resolve();
            });
        }).on('error', (e) => {
            reject(`Failed to download from ${url}: ${e}`);
        });
    });
};

module.exports.fetchVersions = function (isNightly, useCNMirror) {
    return new Promise((resolve, reject) => {
        const npmRegistry = useCNMirror
            ? 'https://registry.npmmirror.com'
            : 'https://registry.npmjs.org';
        const endpoint = `${npmRegistry}/echarts${isNightly ? '-nightly' : ''}`;
        https.get(endpoint, res => {
            if (res.statusCode !== 200) {
                res.destroy();
                reject('status code: ' + res.statusCode);
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
                    reject(e);
                }
            });
        })
        .on('error', reject);
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
