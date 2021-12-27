/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* 'License'); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig')

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    rootDir: __dirname,
    collectCoverage: true,
    setupFiles: [
        'jest-canvas-mock',
        '<rootDir>/core/setup.ts'
    ],
    setupFilesAfterEnv: [
        '<rootDir>/core/extendExpect.ts'
    ],
    globals: {
        '__DEV__': true
    },
    // Not exclude node_modules because zrender also needs to be transformed.
    transformIgnorePatterns: [
        "node_modules/(?!zrender/)"
    ],
    testMatch: [
        '**/spec/api/*.test.ts',
        '**/spec/component/**/*.test.ts',
        '**/spec/series/**/*.test.ts',
        '**/spec/data/*.test.ts',
        '**/spec/model/*.test.ts',
        '**/spec/scale/*.test.ts',
        '**/spec/util/*.test.ts'
    ],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/'
    })
};
