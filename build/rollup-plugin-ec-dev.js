/**
 * Define variable `__DEV__`.
 *
 * Usage:
 *
 * import ecDevPlugin from 'echats/build/rollup-plugin-ec-dev';
 * let rollupConfig = {
 *     plugins: [
 *         ecDevPlugin(),
 *         ...
 *     ]
 * };
 *
 * We use global variable `__DEV__` for convenience, but it bring trouble
 * while building: it is not able to make sure the decaration of `__DEV__`
 * occures in front of the whole code if we use ES module import. So we
 * use the plugin to handle that.
 *
 * See `echarts/src/config.js`.
 */

module.exports = function (opt) {

    return {
        intro: function () {
            return [
                'if (typeof __DEV__ === "undefined") {',
                '    if (typeof window !== "undefined") {',
                '        window.__DEV__ = true;',
                '    }',
                '    else if (typeof global !== "undefined") {',
                '        global.__DEV__ = true;',
                '    }',
                '}'
            ].join('\n');
        }
    };
};
