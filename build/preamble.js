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

const cStyleComment = `
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

`;

const hashComment = `
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

`;

const mlComment = `
<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

`;

function hasPreamble(fileExt) {
    return fileExt && preambleMap[fileExt];
}

function addPreamble(fileStr, fileExt) {
    if (fileStr && fileExt) {
        const addFn = addFns[fileExt];
        const headStr = preambleMap[fileExt];
        return addFn && headStr && addFn(headStr, fileStr);
    }
}

const addFns = {

    js: function (headStr, fileStr) {
        return headStr + fileStr;
    },

    css: function (headStr, fileStr) {
        return headStr + fileStr;
    },

    java: function (headStr, fileStr) {
        return headStr + fileStr;
    },

    sh: function (headStr, fileStr) {
        // Git diff enables manual check.
        if (/^#\!/.test(fileStr)) {
            const lines = fileStr.split('\n');
            lines.splice(1, 0, headStr);
            return lines.join('\n');
        }
        else {
            return headStr + fileStr;
        }
    },

    html: function (headStr, fileStr) {
        // Git diff enables manual check.
        let resultStr = fileStr.replace(/^\s*<!DOCTYPE\s[^<>]+>/i, '$&' + headStr);
        // If no doctype
        if (resultStr.length === fileStr.length) {
            resultStr = headStr + fileStr;
        }
        return resultStr;
    },

    xml: xmlAddFn,

    xsl: xmlAddFn
};

function xmlAddFn(headStr, fileStr) {
    // Git diff enables manual check.
    let resultStr = fileStr.replace(/^\s*<\?xml\s[^<>]+\?>/i, '$&' + headStr);
    // If no <?xml version='1.0' ?>
    if (resultStr.length === fileStr.length) {
        resultStr = headStr + fileStr;
    }
    return resultStr;
}

const preambleMap = {
    js: cStyleComment,
    css: cStyleComment,
    java: cStyleComment,
    sh: hashComment,
    html: mlComment,
    xml: mlComment,
    xsl: mlComment
};

const licenseReg = [
    {name: 'Apache', reg: /apache (license|commons)/i},
    {name: 'BSD', reg: /BSD/},
    {name: 'LGPL', reg: /LGPL/},
    {name: 'GPL', reg: /GPL/},
    {name: 'Mozilla', reg: /mozilla public/i},
    {name: 'MIT', reg: /mit license/i},
    {name: 'BSD-d3', reg: /Copyright\s+\(c\)\s+2010-2015,\s+Michael\s+Bostock/i}
];

function extractLicense(fileStr, fileExt) {
    let commentText = extractComment(fileStr.trim(), fileExt);
    if (!commentText) {
        return;
    }
    for (let i = 0; i < licenseReg.length; i++) {
        if (licenseReg[i].reg.test(commentText)) {
            return licenseReg[i].name;
        }
    }
}

const cStyleCommentReg = /\/\*[\S\s]*?\*\//;
const hashCommentReg = /^\s*#.*$/gm;
const mlCommentReg = /<\!\-\-[\S\s]*?\-\->/;
const commentReg = {
    js: cStyleCommentReg,
    css: cStyleCommentReg,
    java: cStyleCommentReg,
    sh: hashCommentReg,
    html: mlCommentReg,
    xml: mlCommentReg,
    xsl: mlCommentReg
};

function extractComment(str, fileExt) {
    const reg = commentReg[fileExt];

    if (!fileExt || !reg || !str) {
        return;
    }

    reg.lastIndex = 0;

    if (fileExt === 'sh') {
        let result = str.match(reg);
        return result && result.join('\n');
    }
    else {
        let result = reg.exec(str);
        return result && result[0];
    }
}

module.exports = Object.assign({
    extractLicense,
    hasPreamble,
    addPreamble
}, preambleMap);
