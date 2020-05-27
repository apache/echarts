const chokidar = require('chokidar');
const path = require('path');
const {build} = require('esbuild');
const fs = require('fs');
const debounce = require('lodash.debounce');
// const sourceMap = require('source-map');

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

async function wrapUMDCode() {
    // const consumer = await new sourceMap.SourceMapConsumer(fs.readFileSync(outFilePath + '.map', 'utf8'));
    // const node = sourceMap.SourceNode.fromStringWithSourceMap(fs.readFileSync(outFilePath, 'utf-8'), consumer);
    // // add six empty lines
    // node.prepend(umdWrapperHead);
    // node.add(umdWrapperTail);
    // const res = node.toStringWithSourceMap({
    //     file: outFilePath
    // });
    // fs.writeFileSync(outFilePath, res.code, 'utf-8');
    // fs.writeFileSync(outFilePath + '.map', res.map.toString(), 'utf-8');

    const code = fs.readFileSync(outFilePath, 'utf-8');
    fs.writeFileSync(outFilePath, umdWrapperHead + code + umdWrapperTail, 'utf-8');

    const sourceMap = JSON.parse(fs.readFileSync(outFilePath + '.map', 'utf-8'));
    // Fast trick for fixing source map
    sourceMap.mappings = umdWrapperHead.split('\n').map(() => '').join(';') + sourceMap.mappings;

    fs.writeFileSync(outFilePath + '.map', JSON.stringify(sourceMap), 'utf-8');
}

function rebuild() {
    build({
        stdio: 'inherit',
        entryPoints: [path.resolve(__dirname, '../echarts.all.ts')],
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