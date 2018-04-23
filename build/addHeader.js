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

const glob = require('glob');
const fs = require('fs');

const headerStr = `/*
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

`;

const lists = [
    '../src/**/*.js',
    '../build/*.js',
    '../benchmark/src/*.js',
    '../benchmark/src/gulpfile.js',
    '../extension-src/**/*.js',
    '../extension/**/*.js',
    '../map/js/**/*.js',
    '../test/build/**/*.js',
    '../test/node/**/*.js',
    '../test/ut/core/*.js',
    '../test/ut/spe/*.js',
    '../test/ut/ut.js',
    '../test/*.js',
    '../theme/*.js',
    '../theme/tool/**/*.js',
    '../echarts.all.js',
    '../echarts.blank.js',
    '../echarts.common.js',
    '../echarts.simple.js',
    '../index.js',
    '../index.common.js',
    '../index.simple.js'
];

function extractLicense(str) {
    str = str.trim();
    const regex = new RegExp('/\\*[\\S\\s]*?\\*/', 'm');
    const res = regex.exec(str);
    const commentText = res && res[0];
    if (commentText) {
        if(commentText.toLowerCase().includes('apache license') || commentText.toLowerCase().includes('apache commons')) {
            return 'Apache';
        }
        else if(commentText.toUpperCase().includes('BSD')) {
            return 'BSD';
        }
        else if(commentText.toUpperCase().includes('LGPL')) {
            return 'LGPL';
        }
        else if(commentText.toUpperCase().includes('GPL')) {
            return 'GPL';
        }
        else if(commentText.toLowerCase().includes('mozilla public')) {
            return 'Mozilla';
        }
        else if(commentText.toLowerCase().includes('mit license')) {
            return 'MIT';
        }
    }
}

lists.forEach(function (pattern) {
    glob(pattern, function (err, fileList) {
        if (err) {
            throw new Error();
        }
        fileList.forEach(function (fileUrl) {
            const str = fs.readFileSync(fileUrl, 'utf-8');

            const existLicense = extractLicense(str);
            if (existLicense) {
                console.log('File ' + fileUrl + ' already have license ' + existLicense);
                return;
            }

            fs.writeFileSync(fileUrl, headerStr + str, 'utf-8');
        });
    });
});