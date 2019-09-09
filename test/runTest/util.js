const path = require('path');
const fse = require('fs-extra');
const https = require('https');
const fs = require('fs');
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

module.exports.testNameFromFile = function(fileName) {
    return path.basename(fileName, '.html');
};

module.exports.fileNameFromTest = function (testName) {
    return testName + '.html';
};

function getVersionDir(version) {
    version = version || 'developing';
    return `tmp/__version__/${version}`;
};
module.exports.getVersionDir = getVersionDir;

module.exports.getActionsFullPath = function (testName) {
    return path.join(__dirname, 'actions', testName + '.json');
};


module.exports.prepareEChartsVersion = function (version) {
    let versionFolder = path.join(__dirname, getVersionDir(version));
    fse.ensureDirSync(versionFolder);
    if (!version) {
        // Developing version, make sure it's new build
        return fse.copy(
            path.join(__dirname, '../../dist/echarts.js'),
            `${versionFolder}/echarts.js`
        );
    }
    return new Promise(resolve => {
        if (!fs.existsSync(`${versionFolder}/echarts.js`)) {
            const file = fs.createWriteStream(`${versionFolder}/echarts.js`);

            console.log('Downloading echarts4.2.1 from ', `https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`);
            https.get(`https://cdn.jsdelivr.net/npm/echarts@${version}/dist/echarts.js`, response => {
                response.pipe(file);

                file.on('finish', () => {
                    resolve();
                });
            });
        }
        else {
            resolve();
        }
    });
};

module.exports.buildRuntimeCode = async function () {
    const bundle = await rollup.rollup({
        input: path.join(__dirname, 'runtime/main.js'),
        plugins: [
            resolve(),
            commonjs(),
            {
                resolveId(importee) {
                    return importee === 'crypto' ? importee : null;
                },
                load(id) {
                    // seedrandom use crypto as external module
                    return id === 'crypto' ? 'export default null;' : null;
                }
            }
        ]
    });
    const output = await bundle.generate({
        format: 'iife',
        name: 'autorun'
    });
    return output.code;
};

module.exports.waitTime = function (time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}