/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/


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