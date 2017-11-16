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


module.exports = function () {

    fsExtra.removeSync(libDir);
    fsExtra.ensureDirSync(libDir);

    travelSrcDir(srcDir, ({fileName, relativePath, absolutePath}) => {
        prePulishSrc({
            inputPath: absolutePath,
            outputPath: path.resolve(libDir, relativePath, fileName),
            transform
        });
    });

    travelSrcDir(extensionSrcDir, ({fileName, relativePath, absolutePath}) => {
        prePulishSrc({
            inputPath: absolutePath,
            outputPath: path.resolve(extensionDir, relativePath, fileName),
            transform
        });
    });

    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.all.js'),
        outputPath: path.resolve(ecDir, 'index.js')
    });
    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.common.js'),
        outputPath: path.resolve(ecDir, 'index.common.js')
    });
    prePulishSrc({
        inputPath: path.resolve(ecDir, 'echarts.simple.js'),
        outputPath: path.resolve(ecDir, 'index.simple.js')
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
