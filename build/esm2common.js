let path = require('path');
let babel = require('@babel/core');
let fs = require('fs');


let transformPluginPath = path.resolve(__dirname, './babel-plugin-transform-modules-commonjs-ec');
// let transformPluginPath = '@babel/plugin-transform-modules-commonjs';


// let fileName = path.resolve(__dirname, '../src/ExtensionAPI.js');
// let fileName = path.resolve(__dirname, '../src/util/graphic.js');
// let fileName = path.resolve(__dirname, '../index.blank.js');
// let fileName = path.resolve(__dirname, '../src/chart/bar/BarSeries.js');
// let fileName = path.resolve(__dirname, '../test/esm2cjs/a.js');
let fileName = path.resolve(__dirname, '../test/esm2cjs/a.js');




let result = babel.transformFileSync(fileName, {
    plugins: [
        [transformPluginPath, {
            // strict: true
            loose: true
        }]
    ]
});

let outputFile = path.resolve(__dirname, '../../tmp/babel.output.js');
// console.log(outputFile);
fs.writeFileSync(outputFile, result.code, {encoding:'utf-8'});








