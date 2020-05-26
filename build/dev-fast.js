const chokidar = require('chokidar');
const path = require('path');
const {build} = require('esbuild');
const fs = require('fs');

const outFilePath = path.resolve(__dirname, '../dist/echarts.js');

const umdWrapperHead = `
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

// attach properties to the exports object to define
// the exported module properties.
exports.action = function () {};

function rebuild() {
    build({
        stdio: 'inherit',
        entryPoints: [path.resolve(__dirname, '../echarts.all.ts')],
        outfile: outFilePath,
        format: 'cjs',
        bundle: true,
    }).catch(e => {
        console.error(e.toString());
    }).then(() => {
        const mainCode = fs.readFileSync(outFilePath, 'utf-8');
        fs.writeFileSync(outFilePath, umdWrapperHead + mainCode + umdWrapperTail)
    })
}

chokidar.watch([
    path.resolve(__dirname, '../src/**/*.ts'),
    path.resolve(__dirname, '../node_modules/zrender/src/**/*.ts'),
], {
    persistent: true
}).on('change', rebuild).on('ready', function () {
    rebuild();
})