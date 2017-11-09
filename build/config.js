/* global process */
const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const uglifyPlugin = require('rollup-plugin-uglify');
const ecDevPlugin = require('./rollup-plugin-ec-dev');
const ecLangPlugin = require('./rollup-plugin-ec-lang');
const {resolve} = require('path');

function getPathBasedOnECharts(path) {
    return resolve(__dirname, '../', path);
}

/**
 * @param {boolean} [min=false]
 * @param {string} [lang=null] null/undefined/'' or 'en' or 'fi' or a file path
 * @param {boolean} [addBundleVersion=false]
 */
function getPlugins(min, lang, addBundleVersion) {
    let plugins = [
        ecDevPlugin()
    ];

    lang && plugins.push(
        ecLangPlugin({lang})
    );

    plugins.push(
        nodeResolvePlugin()
    );

    addBundleVersion && plugins.push({
        outro: function () {
            return 'exports.bundleVersion = "' + (+new Date()) + '";';
        }
    });

    min && plugins.push(uglifyPlugin({
        compress: {
            // Eliminate __DEV__ code.
            // Currently, in uglify:
            // `var vx; if(vx) {...}` can not be removed.
            // `if (__DEV__) {...}` can be removed if `__DEV__` is defined as `false` in `global_defs`.
            'global_defs': {
                __DEV__: false
            },
            'dead_code': true
        }
    }));

    return plugins;
}

/**
 * @param {Object} [opt]
 * @param {string} [opt.type=''] '' or 'simple' or 'common'
 * @param {boolean} [opt.min=false]
 * @param {string} [opt.lang=undefined] null/undefined/'' or 'en' or 'fi' or a file path.
 * @param {string} [opt.input=undefined] If set, `opt.output` is required too, and `opt.type` is ignored.
 * @param {string} [opt.output=undefined] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.sourcemap] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {string} [opt.format='umd'] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.addBundleVersion=false] Only for debug in watch, prompt that the two build is different.
 */
exports.createECharts = function (opt) {
    opt = opt || {};
    let srcType = opt.type ? '.' + opt.type : '.all';
    let postfixType = opt.type ? '.' + opt.type : '';
    let postfixMin = opt.min ? '.min' : '';
    let postfixLang = opt.lang ? '-' + opt.lang.toLowerCase() : '';
    let isCustom;
    let input = opt.input;
    let output = opt.output;
    let sourcemap = opt.sourcemap;
    let format = opt.format || 'umd';

    if (input != null || output != null) {
        isCustom = true;
        // Based on process.cwd();
        input = resolve(input);
        output = resolve(output);
    }
    else {
        input = getPathBasedOnECharts(`./echarts${srcType}.js`);
        output = getPathBasedOnECharts(`dist/echarts${postfixLang}${postfixType}${postfixMin}.js`);
        if (sourcemap == null) {
            sourcemap = !opt.min && !opt.type;
        }
    }

    return {
        plugins: getPlugins(opt.min, opt.lang, opt.addBundleVersion),
        input: input,
        legacy: true, // Support IE8-
        output: {
            name: 'echarts',
            format: format,
            sourcemap: sourcemap,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            file: output
        },
        watch: {
            include: [
                getPathBasedOnECharts('./src/**'),
                getPathBasedOnECharts('./echarts*.js'),
                getPathBasedOnECharts('../zrender/src/**')
            ]
        }
    };
};

/**
 * @param {boolean} [min=false]
 */
exports.createBMap = function (min) {
    let postfix = min ? '.min' : '';

    return {
        plugins: getPlugins(min),
        input: getPathBasedOnECharts(`./extension/bmap/bmap.js`),
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'bmap',
            format: 'umd',
            sourcemap: !min,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: getPathBasedOnECharts(`dist/extension/bmap${postfix}.js`)
        },
        watch: {
            include: [getPathBasedOnECharts('./extension/bmap/**')]
        }
    };
};

/**
 * @param {boolean} [min=false]
 */
exports.createDataTool = function (min) {
    let postfix = min ? '.min' : '';
    return {
        plugins: getPlugins(min),
        input: getPathBasedOnECharts(`./extension/dataTool/index.js`),
        legacy: true, // Support IE8-
        external: ['echarts'],
        output: {
            name: 'dataTool',
            format: 'umd',
            sourcemap: !min,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            globals: {
                // For UMD `global.echarts`
                echarts: 'echarts'
            },
            file: getPathBasedOnECharts(`dist/extension/dataTool${postfix}.js`)
        },
        watch: {
            include: [getPathBasedOnECharts('./extension/dataTool/**')]
        }
    };
};
