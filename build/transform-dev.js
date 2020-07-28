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
const parser = require('@babel/parser');

function transformDEVPlugin ({types, template}) {
    return {
        visitor: {
            Identifier: {
                enter(path, state) {
                    if (path.isIdentifier({ name: '__DEV__' }) && path.scope.hasGlobal('__DEV__')) {
                        path.replaceWith(
                            parser.parseExpression(state.opts.expr)
                        );
                    }
                }
            }
        }
    };
};


module.exports.transform = function (sourceCode, sourcemap, expr) {
    let {code, map} = babel.transformSync(sourceCode, {
        plugins: [ [transformDEVPlugin, {
            expr: expr || 'process.env.NODE_ENV !== \'production\''
        }] ],
        compact: false,
        sourceMaps: sourcemap
    });

    return {code, map};
};

/**
 * @param {string} code
 * @throws {Error} If check failed.
 */
module.exports.recheckDEV = function (code) {
    return code.indexOf('process.env.NODE_ENV') >= 0;
};
