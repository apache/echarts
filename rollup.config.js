/* global process */

import nodeResolvePlugin from 'rollup-plugin-node-resolve';
import uglifyPlugin from 'rollup-plugin-uglify';
import {dirname, resolve} from 'path';

let watching = process.argv.indexOf('--watch') >= 0 || process.argv.indexOf('-w') >= 0;

function getPlugins(min, en) {
    let plugins = [];

    en && plugins.push({
        resolveId: function (importee, importor) {
            if (/\/lang([.]js)?$/.test(importee)) {
                return resolve(
                    dirname(importor),
                    importee.replace(/\/lang([.]js)?$/, '/langEN.js')
                );
            }
        }
    });

    plugins.push(
        nodeResolvePlugin()
    );

    min && plugins.push(uglifyPlugin({
        compress: {
            // Eliminate __DEV__ code.
            'global_defs': {
                __DEV__: true
            }
        }
    }));

    return plugins;
}

// ??????????
// en lang

// ??????????
// prepublish

function createEChartsBuild(type, opt) {
    type && (type = '.' + type);
    let postfixMin = opt.min ? '.min' : '';
    let postfixEN = opt.en ? '-en' : '';

    return {
        name: 'echarts',
        plugins: getPlugins(opt.min, opt.en),
        input: `./index${type}.js`,
        legacy: true, // Support IE8-
        output: {
            format: 'umd',
            sourcemap: !opt.min && !opt.en && !type,
            file: `dist/echarts${postfixEN}${type}${postfixMin}.js`
        },
        watch: {
            include: ['./src/**', './index*.js']
        }
    };
}

function createBMapBuild(min) {
    let postfix = min ? '.min' : '';

    return {
        name: 'bmap',
        plugins: getPlugins(min),
        input: `./extension/bmap/bmap.js`,
        legacy: true, // Support IE8-
        external: ['echarts'],
        globals: {
            // For UMD `global.echarts`
            echarts: 'echarts'
        },
        output: {
            format: 'umd',
            sourcemap: !min,
            file: `dist/extension/bmap${postfix}.js`
        },
        watch: {
            include: ['./extension/bmap/**']
        }
    };
}

// @see https://github.com/rollup/rollup-plugin-node-resolve/issues/72
function createDataToolBuild(min) {
    let postfix = min ? '.min' : '';
    return {
        name: 'dataTool',
        plugins: getPlugins(min),
        input: `./extension/dataTool/index.js`,
        legacy: true, // Support IE8-
        external: ['echarts'],
        globals: {
            // For UMD `global.echarts`
            echarts: 'echarts'
        },
        output: {
            format: 'umd',
            sourcemap: !min,
            file: `dist/extension/dataTool${postfix}.js`
        },
        watch: {
            include: ['./extension/dataTool/**']
        }
    };
}

let configs;

if (watching) {
    configs = createEChartsBuild('', false, false);
}
else {
    configs = [];
    [
        {min: false, en: false},
        {min: true, en: false},
        {min: false, en: true},
        {min: true, en: true}
    ].forEach(function (opt) {
        configs.push(
            createEChartsBuild('simple', opt),
            createEChartsBuild('common', opt),
            createEChartsBuild('', opt)
        );
    });

    configs.push(
        createBMapBuild(false),
        createBMapBuild(true),
        createDataToolBuild(false),
        createDataToolBuild(true)
    );
}

export default configs;