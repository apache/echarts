const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const uglifyPlugin = require('rollup-plugin-uglify');
const {dirname, resolve} = require('path');

// Based on echarts/
function getPath(relativePath) {
    return resolve(__dirname, '../', relativePath);
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
 */
exports.createECharts = function (opt) {
    opt = opt || {};
    let postfixType = opt.type ? '.' + opt.type : '';
    let postfixMin = opt.min ? '.min' : '';
    let postfixLang = opt.lang ? '-' + opt.lang.toLowerCase() : '';

    return {
        plugins: getPlugins(opt.min, opt.lang),
        input: getPath(`./index${postfixType}.js`),
        legacy: true, // Support IE8-
        output: {
            name: 'echarts',
            format: 'umd',
            sourcemap: !opt.min && !postfixType,
            legacy: true, // Must be declared both in inputOptions and outputOptions.
            file: getPath(`dist/echarts${postfixLang}${postfixType}${postfixMin}.js`)
        },
        watch: {
            include: [getPath('./src/**'), getPath('./index*.js'), getPath('../zrender/src/**')]
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
        input: getPath(`./extension/bmap/bmap.js`),
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
            file: getPath(`dist/extension/bmap${postfix}.js`)
        },
        watch: {
            include: [getPath('./extension/bmap/**')]
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
        input: getPath(`./extension/dataTool/index.js`),
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
            file: getPath(`dist/extension/dataTool${postfix}.js`)
        },
        watch: {
            include: [getPath('./extension/dataTool/**')]
        }
    };
};

