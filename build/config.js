/* global process */
const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const uglifyPlugin = require('rollup-plugin-uglify');
const {dirname, resolve} = require('path');

function getPathBasedOnECharts(path) {
    return resolve(__dirname, '../', path);
}

/**
 * @param {boolean} [min=false]
 * @param {string} [lang=null] null/undefined/'' or 'en' or 'fi' or ...
 */
function getPlugins(min, lang) {
    let plugins = [];

    lang && plugins.push({
        resolveId: function (importee, importor) {
            if (/\/lang([.]js)?$/.test(importee)) {
                return resolve(
                    dirname(importor),
                    importee.replace(/\/lang([.]js)?$/, '/lang' + lang.toUpperCase() + '.js')
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

/**
 * @param {Object} [opt]
 * @param {string} [opt.type=''] '' or 'simple' or 'common'
 * @param {boolean} [opt.min=false]
 * @param {string} [opt.lang=undefined] null/undefined/'' or 'en' or 'fi' or ...
 * @param {string} [opt.input=undefined] If set, `opt.output` is required too, and `opt.type` is ignored.
 * @param {string} [opt.output=undefined] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {boolean} [opt.sourcemap] If set, `opt.input` is required too, and `opt.type` is ignored.
 * @param {string} [opt.format='umd'] If set, `opt.input` is required too, and `opt.type` is ignored.
 */
exports.createECharts = function (opt) {
    opt = opt || {};
    let postfixType = opt.type ? '.' + opt.type : '';
    let postfixMin = opt.min ? '.min' : '';
    let postfixLang = opt.lang ? '-' + opt.lang.toLowerCase() : '';
    let isCustom;
    let input = opt.input;
    let output = opt.output;
    let sourcemap = opt.sourcemap;
    let format = opt.format || 'umd';

    if (input != null || output != null) {
        if (input == null || output == null) {
            throw new Error('`input` and `output` must be both set.');
        }
        isCustom = true;
        // Based on process.cwd();
        input = resolve(input);
        output = resolve(output);
    }
    else {
        input = getPathBasedOnECharts(`./index${postfixType}.js`);
        output = getPathBasedOnECharts(`dist/echarts${postfixLang}${postfixType}${postfixMin}.js`);
        if (sourcemap == null) {
            sourcemap = !opt.min && !postfixType;
        }
    }

    return {
        plugins: getPlugins(opt.min, opt.lang),
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
                getPathBasedOnECharts('./index*.js'),
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

