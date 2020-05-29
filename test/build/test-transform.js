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


const path = require('path');
const babel = require('@babel/core');
const fs = require('fs');
// See require('@babel/plugin-transform-modules-commonjs')
const esm2cjsPlugin = path.resolve(__dirname, '../../build/babel-plugin-transform-modules-commonjs-ec');
const removeDEVPlugin = path.resolve(__dirname, '../../build/babel-plugin-transform-remove-dev');

function run() {
    removeDEV();
    esm2cjs();
}

function removeDEV() {

    const suite = makeSuite('removeDEV');

    suite.eachSrcFile(({fileName, filePath}) => {
        let result = babel.transformFileSync(filePath, {
            plugins: [removeDEVPlugin]
        });

        suite.writeToExpectFile(fileName, result.code);

        console.log(`removing dev ${fileName} ...`);
    });
    console.log('All done.');
}


function esm2cjs() {

    const suite = makeSuite('esm2cjs');

    suite.eachSrcFile(({fileName, filePath}) => {
        console.log(`transforming to cjs ${fileName} ...`);

        if (/^forbiden/.test(fileName)) {
            try {
                transformSingle();
                throw new Error('Should fail.');
            }
            catch (e) {
                console.log(`${fileName} failed as expected.`);
            }
        }
        else {
            transformSingle();
        }

        function transformSingle() {
            let result = babel.transformFileSync(filePath, {
                plugins: [removeDEVPlugin, esm2cjsPlugin]
            });

            suite.writeToExpectFile(fileName, result.code);
        }
    });

    console.log('All done.');

}

const makeSuite = suiteName => {

    const srcDir = path.resolve(__dirname, `./${suiteName}/src`);
    const expectDir = path.resolve(__dirname, `./${suiteName}/expect`);

    return {
        srcDir,
        expectDir,
        eachSrcFile(cb) {
            fs.readdirSync(srcDir).forEach(fileName => {
                if (!/^[^.].*[.]src[.]js$/.test(fileName)) {
                    return;
                }
                const filePath = path.resolve(srcDir, fileName);
                cb({fileName, filePath, suiteName, srcDir, expectDir});
            });
        },
        writeToExpectFile(srcFileName, content) {
            let outputPath = path.resolve(expectDir, srcFileName.replace('.src.', '.expect.'));
            fs.writeFileSync(outputPath, content, {encoding:'utf-8'});
        }
    };
};

run();