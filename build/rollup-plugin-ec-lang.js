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

const {resolve} = require('path');
const {readFileSync} = require('fs');

/**
 * @param {Object} [opt]
 * @param {string} [opt.lang=null] null/undefined/'' or 'en' or 'fi' or a file path.
 */
function getPlugin(opt) {
    let lang = opt && opt.lang || '';

    return {
        load: function (absolutePath) {
            if (/\/src\/lang\.js$/.test(absolutePath)) {
                let langPath = getLangFileInfo(lang).absolutePath;
                if (langPath) {
                    absolutePath = langPath;
                }
            }
            return readFileSync(absolutePath, 'utf-8');
        }
    };
}

/**
 * @param {string} lang null/undefined/'' or 'en' or 'fi' or a file path.
 * @return {Object} {isOuter, absolutePath}
 */
let getLangFileInfo = getPlugin.getLangFileInfo = function (lang) {
    let absolutePath;
    let isOuter = false;

    if (lang) {
        if (/^[a-zA-Z]{2}$/.test(lang)) {
            absolutePath = resolve(__dirname, '../', 'src/lang' + lang.toUpperCase() + '.js')
        }
        else {
            isOuter = true;
            // `lang` is an absolute path or a relative path based on process.cwd().
            absolutePath = resolve(lang);
        }
    }

    return {isOuter, absolutePath};
};

module.exports = getPlugin;