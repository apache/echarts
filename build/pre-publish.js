/**
 * Compatible with prevoius folder structure: `echarts/lib` exists in `node_modules`
 * (1) Build all files to CommonJS to `echarts/lib`.
 * (2) Remove __DEV__.
 * (3) Mount `echarts/src/export.js` to `echarts/lib/echarts.js`.
 */

const {resolve, join} = require('path');
const fsExtra = require('fs-extra');
const fs = require('fs');
const babel = require('@babel/core');
const esm2cjsPlugin = require('./babel-plugin-transform-modules-commonjs-ec');
const removeDEVPlugin = require('./babel-plugin-transform-remove-dev');
const {color} = require('./helper');

const ecDir = resolve(__dirname, '..');
const srcDir = resolve(__dirname, '../src');
const extensionSrcDir = resolve(__dirname, '../extension-src');
const extensionDir = resolve(__dirname, '../extension');
const libDir = resolve(__dirname, '../lib');

const REG_SRC = /^[^.].*[.]js$/;
const REG_DIR = /^[^.].*$/;


module.exports = function () {

    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);
    // fsExtra.copySync(getPath('./src'), getPath('./lib'));

    travelDir(srcDir, '.', ({fileName, basePath, absolutePath}) => {
        transform(absolutePath, resolve(libDir, basePath, fileName));
    });

    travelDir(extensionSrcDir, '.', ({fileName, basePath, absolutePath}) => {
        transform(absolutePath, resolve(extensionDir, basePath, fileName));
    });

    transform(resolve(ecDir, 'echarts.all.js'), resolve(ecDir, 'index.js'));
    transform(resolve(ecDir, 'echarts.common.js'), resolve(ecDir, 'index.common.js'));
    transform(resolve(ecDir, 'echarts.simple.js'), resolve(ecDir, 'index.simple.js'));

    function transform(inputPath, outputPath) {
        console.log(
            color('fgGreen', 'dim')('[transform] '),
            color('fgGreen')(inputPath),
            color('fgGreen', 'dim')('...')
        );

        let {code} = babel.transformFileSync(inputPath, {
            plugins: [removeDEVPlugin, esm2cjsPlugin]
        });

        if (inputPath !== resolve(ecDir, 'src/config.js')) {
            removeDEVPlugin.recheckDEV(code);
        }

        if (inputPath === resolve(ecDir, 'src/echarts.js')) {
            // Using `echarts/echarts.blank.js` to overwrite `echarts/lib/echarts.js`
            // for including exports API.
            code +=
`var ___ec_export = require("./export");
(function () {
    for (var key in ___ec_export) {
        if (___ec_export.hasOwnProperty(key)) {
            exports[key] = ___ec_export[key];
        }
    }
})();`;
        }

        fsExtra.ensureFileSync(outputPath);
        fs.writeFileSync(outputPath, code, {encoding:'utf-8'});
    }

    console.log(color('fgGreen', 'bright')('All done.'));
};

function travelDir(tSrcDir, basePath, cb) {
    travelSrcDir(basePath);

    function travelSrcDir(basePath) {
        const absolutePath = resolve(tSrcDir, basePath);

        fs.readdirSync(absolutePath).forEach(fileName => {
            const childAbsolutePath = resolve(absolutePath, fileName);
            const stat = fs.statSync(childAbsolutePath);
            if (stat.isDirectory()) {
                if (REG_DIR.test(fileName)) {
                    travelSrcDir(join(basePath, fileName));
                }
            }
            else if (stat.isFile()) {
                if (REG_SRC.test(fileName)) {
                    cb({fileName, basePath: basePath, absolutePath: childAbsolutePath});
                }
            }
        });
    }
}

