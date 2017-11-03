/**
 * Find language definations.
 *
 * Usage:
 *
 * import ecLangPlugin from 'echarts/build/rollup-plugin-ec-lang';
 * let rollupConfig = {
 *     plugins: [
 *         ecLangPlugin({lang: 'en'}),
 *         ...
 *     ]
 * };
 */

const {dirname, resolve} = require('path');

/**
 * @param {Object} [opt]
 * @param {string} [opt.lang=null] null/undefined/'' or 'en' or 'fi' or ...
 */
module.exports = function (opt) {
    let lang = opt && opt.lang || '';

    return {
        resolveId: function (importee, importor) {
            if (/\/lang([.]js)?$/.test(importee)) {
                return resolve(
                    dirname(importor),
                    importee.replace(/\/lang([.]js)?$/, '/lang' + lang.toUpperCase() + '.js')
                );
            }
        }
    };
};
