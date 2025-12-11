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

const pathTool = require('path');
const fs = require('fs');

// In the `.headerignore`, each line is a pattern in RegExp.
// all relative path (based on the echarts base directory) is tested.
// The pattern should match the relative path completely.
const excludesPath = pathTool.join(__dirname, '../.headerignore');
const ecBasePath = pathTool.join(__dirname, '../');

function eachFile(visit) {
    const excludePatterns = [];
    const extReg = /\.([a-zA-Z0-9_-]+)$/;

    prepareExcludePatterns();
    travel('./');

    function travel(relativePath) {
        if (isExclude(relativePath)) {
            return;
        }

        const absolutePath = pathTool.join(ecBasePath, relativePath);
        const stat = fs.statSync(absolutePath);

        if (stat.isFile()) {
            visit(absolutePath, getExt(absolutePath));
        }
        else if (stat.isDirectory()) {
            fs.readdirSync(relativePath).forEach(function (file) {
                travel(pathTool.join(relativePath, file));
            });
        }
    }

    function prepareExcludePatterns() {
        const content = fs.readFileSync(excludesPath, {encoding: 'utf-8'});
        content.replace(/\r/g, '\n').split('\n').forEach(function (line) {
            line = line.trim();
            if (line && line.charAt(0) !== '#') {
                excludePatterns.push(new RegExp(line));
            }
        });
    }

    function isExclude(relativePath) {
        for (let i = 0; i < excludePatterns.length; i++) {
            if (excludePatterns[i].test(relativePath)) {
                return true;
            }
        }
    }

    function getExt(path) {
        if (path) {
            const mathResult = path.match(extReg);
            return mathResult && mathResult[1];
        }
    }
}

module.exports = {
    eachFile: eachFile
};
