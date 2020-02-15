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

const babel = require('@babel/core');
const removeDEVBabelPlugin = require('./remove-dev-babel-plugin');

/**
 * @param {string} sourceCode
 * @param {boolean} sourcemap
 * @return {Object} {code: string, map: string}
 */
module.exports.transform = function (sourceCode, sourcemap) {
    let {code, map} = babel.transformSync(sourceCode, {
        plugins: [removeDEVBabelPlugin],
        sourceMaps: sourcemap
    });

    return {code, map};
};

/**
 * @param {string} code
 * @throws {Error} If check failed.
 */
module.exports.recheckDEV = function (code) {
    let result = code.match(/.if\s*\([^()]*__DEV__/);
    if (result
        && result[0].indexOf('`if') < 0
        && result[0].indexOf('if (typeof __DEV__') < 0
    ) {
        throw new Error('__DEV__ is not removed.');
    }
};
