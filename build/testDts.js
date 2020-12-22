
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
const {
    cleanTypeScriptInstalls,
    installAllTypeScriptVersions,
    typeScriptPath
} = require('@definitelytyped/utils');
const { runTsCompile } = require('./pre-publish');
const globby = require('globby');
const semver = require('semver');

const MIN_VERSION = '3.5.0';

async function installTs() {
    // await cleanTypeScriptInstalls();
    await installAllTypeScriptVersions();
}

async function runTests() {
    const compilerOptions = {
        declaration: false,
        importHelpers: false,
        sourceMap: false,
        pretty: false,
        removeComments: false,
        allowJs: false,
        outDir: __dirname + '/../test/types/tmp',
        typeRoots: [__dirname + '/../types/dist'],
        rootDir: __dirname + '/../test/types',

        // Must pass in most strict cases
        strict: true
    };
    const testsList = await globby(__dirname + '/../test/types/*.ts');

    for (let version of TypeScriptVersion.shipped) {
        if (semver.lt(version + '.0', MIN_VERSION)) {
            continue;
        }

        console.log(`Testing ts version ${version}`);
        const ts = require(typeScriptPath(version));
        await runTsCompile(ts, compilerOptions, testsList);

        console.log(`Finished test of ts version ${version}`);
    }
}

async function main() {
    await installTs();
    await runTests();
}

module.exports = main;

main();