const { TypeScriptVersion } = require('@definitelytyped/typescript-versions');
const {
    cleanTypeScriptInstalls,
    installAllTypeScriptVersions,
    typeScriptPath
} = require('@definitelytyped/utils');
const { runTsCompile, readTSConfig } = require('./pre-publish');
const globby = require('globby');
const semver = require('semver');

const MIN_VERSION = '3.4.0';

async function installTs() {
    // await cleanTypeScriptInstalls();
    await installAllTypeScriptVersions();
}

async function runTests() {
    const tsConfig = readTSConfig();
    const compilerOptions = {
        ...tsConfig.compilerOptions,
        declaration: false,
        importHelpers: false,
        sourceMap: false,
        pretty: false,
        removeComments: false,
        allowJs: false,
        outDir: __dirname + '/../test/types/tmp',
        typeRoots: [__dirname + '/../types/dist'],
        rootDir: __dirname + '/../test/types'
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