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

const { ESLintUtils } = require('@typescript-eslint/utils');
const ts = require('typescript');

/**
 * [ECHARTS_SPECIFIC_ESLINT_RULES]
 *
 * [MEMO]:
 *  Currently, we still use `node_modules` to import local rules implementation (publish to NPM separately),
 *  due to following factors:
 *  - Importing local rules implementation without `node_modules` requires "flat config" (i.e., using `esling.config.js` rather than `.eslintrc`), which requires eslint `v8+`.
 *  - eslint `v9+` requires Node.js `v20+`.
 *  - Reading `esling.config.js` may not be a default behavior of VSCode ESLint Extension for eslint `v8`, but requires the explicit setting `"eslint.experimental.useFlatConfig": true`.
 */

// console.log('___eslint_plugin_ec_debug_index_loaded');

const _rules = {};

function createRule(ruleName, ruleConfig) {
    const ruleConfig1 = Object.assign({}, ruleConfig);
    ruleConfig1.name = ruleName;
    _rules[ruleName] = ESLintUtils.RuleCreator(
        () => 'https://github.com/apache/echarts/tree/master/build/eslint/eslint-plugin-ec/index.cjs'
    )(ruleConfig1);
}

const _callExpressionReceiverDetectors = {
    'Array.prototype': function (checker, node, type) {
        // Detect patterns like `[...].forEach(...)`.
        return containsArrayType(checker, type);
    },
    'String.prototype': function (checker, node, type) {
        return containsStringType(checker, type);
    },
    'Function.prototype': function (checker, node, type) {
        return containsFunctionType(checker, type);
    },
    'Date.prototype': function (checker, node, type) {
        return containsDateType(checker, type);
    },
    'Object': function (checker, node, type) {
        return isBuiltInCtor(node, type, 'Object');
    },
    'Function': function (checker, node, type) {
        return isBuiltInCtor(node, type, 'Function');
    },
    'Array': function (checker, node, type) {
        return isBuiltInCtor(node, type, 'Array');
    },
    'Date': function (type, node) {
        return isBuiltInCtor(node, type, 'Date');
    },
};

/**
 * Configuartion is like:
 *  ```js
 *  rules: {
 *      "@echarts/ec/no-props-polyfill-uncertain": [
 *          2,
 *          {
 *              "receiver": "Array.prototype",
 *              "method": "map",
 *              "message": "xxx",
 *          },
 *          {
 *              "receiver": "Object",
 *              "method": "assign",
 *              "message": "xxx"
 *          }
 *      ]
 *  }
 *  ```
 *  It's like the pattern of rule "no-restricted-properties".
 */
createRule('no-props-polyfill-uncertain', {
    meta: {
        type: 'problem',
        docs: {
            description: 'Methods with uncertain polyfills is not allowed.',
        },
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    receiver: {
                        type: 'string',
                        enum: Object.keys(_callExpressionReceiverDetectors)
                    },
                    method: {type: 'string'},
                    message: {type: 'string'}
                },
                required: ['receiver', 'method'],
                additionalProperties: false
            }
        }
    },

    defaultOptions: [],

    create(context) {

        const restrictionList = context.options.slice();
        const services = ESLintUtils.getParserServices(context);
        const typeChecker = services.program.getTypeChecker();

        // console.log('___create', context);

        return {
            CallExpression(node) {

                // console.log('___CallExpression');

                restrictionList.forEach(function (restrictionItem) {
                    if (
                        node.callee.type !== 'MemberExpression'
                        || node.callee.property.type !== 'Identifier'
                        || node.callee.property.name !== restrictionItem.method
                    ) {
                        return;
                    }

                    const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee.object);
                    const type = typeChecker.getTypeAtLocation(tsNode);
                    const isAny = (type.flags & ts.TypeFlags.Any) !== 0; // Considered union type.
                    const anyMsg = isAny ? ' (TS `any` detected. Use a concrete type to avoid this report.)' : '';

                    if (isAny || _callExpressionReceiverDetectors[restrictionItem.receiver](typeChecker, node, type)) {
                        const message = 'Direct use of `' + restrictionItem.receiver + '.' + restrictionItem.method + '`'
                            + ' is not allowed. '
                            + (restrictionItem.message || 'No polyfill for it.') + anyMsg;
                        context.report({node, message});
                    }
                });

            }, // End of `CallExpression`
        };
    },
}); // End of `createRule`

/**
 * Detect patterns like `Object.assign`
 * @usage
 *  isBuiltInCtor(node, type, 'Object')
 */
function isBuiltInCtor(
    node,
    type, // {ts.Type}
    name
    // @return {ts.Type[]}
) {
    return node.callee.object.type === 'Identifier'
        && node.callee.object.name === name;
}

/**
 * NOTE: `(some as SomeType)` is not covered.
 */
function collectTypes(
    checker, // {ts.TypeChecker}
    type // {ts.Type}
    // @return {ts.Type[]}
) {
    // handle conditional types explicitly
    if (type.flags & ts.TypeFlags.Conditional) {
        const apparent = checker.getApparentType(type);
        return collectTypes(checker, apparent);
    }

    if (type.flags & ts.TypeFlags.Union) { // NOTE: `type.isUnion` does not always exist.
        return type.types.flatMap(t => collectTypes(checker, t));
    }
    if (type.flags & ts.TypeFlags.Intersection) { // NOTE: `type.isIntersection` does not always exist.
        return type.types.flatMap(t => collectTypes(checker, t));
    }
    if (checker.isArrayType(type) || checker.isTupleType(type)) {
        return [type];
    }
    return [type];
}

function containsArrayType(
    checker, // {ts.TypeChecker}
    type // {ts.Type}
    // @return {ts.Type[]}
) {
    return collectTypes(checker, type).some(function (t) {
        return checker.isArrayType(t) || checker.isTupleType(t);
    });
}

function containsStringType(
    checker, // {ts.TypeChecker}
    type // {ts.Type}
    // @return {ts.Type[]}
) {
    return collectTypes(checker, type).some(function (t) {
        // primitive string + string literals
        return (t.flags & ts.TypeFlags.StringLike) !== 0;
    });
}

function containsFunctionType(
    checker, // {ts.TypeChecker}
    type // {ts.Type}
    // @return {ts.Type[]}
) {
    return collectTypes(checker, type).some(function (t) {
        // unwrap apparent type (important for generics/conditional types)
        const apparent = checker.getApparentType(t);
        // function detection via call signatures
        return checker.getSignaturesOfType(
            apparent,
            ts.SignatureKind.Call
        ).length > 0;
    });
}

function containsDateType(
    checker, // {ts.TypeChecker}
    type // {ts.Type}
    // @return {ts.Type[]}
) {
    return collectTypes(checker, type).some(function (t) {
        const apparent = checker.getApparentType(t);
        // Get symbol (the named declaration this type correspond to)
        const symbol = apparent.getSymbol();
        if (!symbol) {
            return false;
        }
        if (symbol.getName() === 'Date') {
            return true;
        }
        // fallback: sometimes Date is a global constructor type
        const typeStr = checker.typeToString(apparent);
        // Cover patterns like `globalThis.Date`, `lib.es5.Date`, `SomeNamespace.Date`
        return typeStr === 'Date' || typeStr.endsWith('.Date');
    });
}

module.exports = {
    rules: _rules,
};
