/**
 * Remove the code of `if (__DEV__) { ... }`.
 *
 * Usage:
 *
 * import ecRemoveDevPlugin from 'echats/build/rollup-plugin-ec-remove-dev';
 * let rollupConfig = {
 *     plugins: [
 *         ecRemoveDevPlugin(),
 *         ...
 *     ]
 * };
 */

const babel = require('@babel/core');
const removeDEVPlugin = require('zrender/build/babel-plugin-transform-remove-dev');

/**
 * @param {Object} [opt]
 * @param {Object} [opt.sourcemap]
 */
module.exports = function ({sourcemap} = {}) {

    return {
        transform: function (sourceCode) {

            let {code, map} = babel.transform(sourceCode, {
                plugins: [removeDEVPlugin],
                sourceMaps: sourcemap
            });

            return {code, map};
        }
    };
};
