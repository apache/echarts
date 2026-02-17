
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

const { TypeScriptVersion } = require('@definitelytyped/typescript-versions');
const { typeScriptPath, install } = require('@definitelytyped/utils');
const { runTsCompile } = require('./pre-publish');
const globby = require('globby');
const semver = require('semver');

const MIN_VERSION = '3.5.0';

async function installTs() {
    const tsVersions = getTypeScriptVersions();
    for (const version of tsVersions) {
        await install(version);
    }
}

async function runTests() {
    const casesESM = await globby(__dirname + '/../test/types/esm/*.ts');
    const casesCJS = await globby(__dirname + '/../test/types/cjs/*.ts');
    const casesNoModule = await globby(__dirname + '/../test/types/no-module/*.ts');

    const tsVersions = getTypeScriptVersions();

    function createCompilerOptions(overrideOptions) {
        return {
            declaration: false,
            importHelpers: false,
            sourceMap: false,
            pretty: false,
            removeComments: false,
            allowJs: false,
            rootDir: __dirname + '/../test/types',
            outDir: __dirname + '/../test/types/tmp',
            // Disable global types, necessary to avoid other
            // irrelevant node_modules types interference.
            typeRoots: [],
            // Must pass in most strict cases
            strict: true,
            ...overrideOptions
        };
    };

    async function singleTest(ts, tsVersion, tsconfigModule, tsconfigModuleResolution, testList) {
        if (!isSupportedTSConfigModuleField(ts, tsconfigModule)) {
            console.log(`Skip: tsVersion: ${tsVersion} does not support {"module": "${tsconfigModule}"}.`);
            return;
        }
        if (!isSupportedTSConfigModuleResolutionField(ts, tsVersion, tsconfigModuleResolution)) {
            console.log(`Skip: tsVersion: ${tsVersion} does not support {"moduleResolution": "${tsconfigModuleResolution}"}.`);
            return;
        }

        console.log(`Testing: tsVersion: ${tsVersion}, tsconfig: {"module": "${tsconfigModule}", "moduleResolution": "${tsconfigModuleResolution}"}`);
        await runTsCompile(ts, createCompilerOptions({
            // noEmit: true,
            module: tsconfigModule,
            moduleResolution: tsconfigModuleResolution,
        }), testList);
    }

    for (const version of tsVersions) {
        const ts = require(typeScriptPath(version));

        // console.log(ts.ModuleKind);
        // console.log(ts.ModuleResolutionKind);

        // await singleTest(ts, version, undefined , undefined, casesESM);
        // await singleTest(ts, version, 'None', 'classic', casesNoModule);
        // await singleTest(ts, version, 'CommonJS', 'node', casesESM);
        // await singleTest(ts, version, 'CommonJS', 'node', casesCJS);
        // await singleTest(ts, version, 'ESNext', 'node', casesESM);
        // await singleTest(ts, version, 'ESNext', 'Bundler', casesESM);
        await singleTest(ts, version, 'NodeNext', 'NodeNext', casesESM);
        // await singleTest(ts, version, 'NodeNext', 'NodeNext', casesCJS);

        console.log(`Finished test of tsVersion ${version}`);
    }
}

function isSupportedTSConfigModuleField(ts, moduleName) {
    if (moduleName === undefined) {
        return true;
    }
    const map = {
        'none': 'None',
        'commonjs': 'CommonJS',
        'amd': 'AMD',
        'umd': 'UMD',
        'system': 'System',
        'es6': 'ES2015',
        'es2015': 'ES2015',
        'es2020': 'ES2020',
        'es2022': 'ES2022',
        'esnext': 'ESNext',
        'node16': 'Node16',
        'nodenext': 'NodeNext',
    };
    const enumKey = map[moduleName.toLowerCase()];
    return enumKey != null && ts.ModuleKind[enumKey] != null;
}

function isSupportedTSConfigModuleResolutionField(ts, tsVersion, moduleResolutionName) {
    if (moduleResolutionName === undefined) {
        return true;
    }
    const map = {
        'classic': 'Classic',
        'node': 'NodeJs',
        // 'nodejs': 'NodeJs', // Older TS do not support value "nodejs".
        'node10': 'Node10',
        'node16': 'Node16',
        'nodenext': 'NodeNext',
        'bundler': 'Bundler',
    };
    const enumKey = map[moduleResolutionName.toLowerCase()];

    if (enumKey === 'NodeNext') {
        // "NodeNext" is unstable before TSv4.7, and error will be thrown.
        if (semver.lt(tsVersion + '.0', '4.7.0')) {
            return false;
        }
    }

    return enumKey != null && ts.ModuleResolutionKind[enumKey] != null;
}

function getTypeScriptVersions() {
    return TypeScriptVersion.unsupported
        .concat(TypeScriptVersion.shipped)
        .filter(version => semver.gte(version + '.0', MIN_VERSION));
}

async function main() {
    await installTs();
    await runTests();
}

module.exports = main;

main();
