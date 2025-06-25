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


const fs = require('fs');
const path = require('path');
const util = require('util');
const { RESULT_FILE_NAME } = require('./store');

const readFileAsync = util.promisify(fs.readFile);

function resolveImagePath(imageUrl) {
    if (!imageUrl) {
        return '';
    }

    // The original image path is relative to the client.
    return imageUrl.replace(/\\/g, '/').replace(/\.\.\/tmp/g, './tmp');
}

async function inlineImage(imageUrl) {
    if (!imageUrl) {
        return '';
    }
    try {
        let fullPath = path.join(__dirname, resolveImagePath(imageUrl));
        // let img = await jimp.read(fullPath);
        // img.quality(70);
        // return img.getBase64Async('image/jpeg');
        let imgBuffer = await readFileAsync(fullPath);
        return 'data:image/webp;base64,' + imgBuffer.toString('base64');
    }
    catch (e) {
        console.error(e);
        return '';
    }

}

function shouldShowMarkAsExpected(test, expectedSource, expectedVersion) {
    if (expectedSource === 'release' && (expectedVersion !== test.expectedVersion)
        || !test.markedAsExpected
    ) {
        return false;
    }
    if (expectedSource !== 'release' && test.markedAsExpected.length > 0) {
        return true;
    }

    for (let i = 0; i < test.markedAsExpected.length; i++) {
        if (test.markedAsExpected[i].lastVersion === expectedVersion) {
            return true;
        }
    }
    return false;
}

function generateMarkDetails(test) {
    if (!test.markedAsExpected || test.markedAsExpected.length === 0) {
        return '';
    }

    let markDetailsHtml = `
<div class="mark-details">
<h3>Marked As Expected Details</h3>
<table>
    <tr>
        <th>Time</th>
        <th>Type</th>
        <th>Marked By</th>
        <th>Version</th>
        <th>Comment</th>
        <th>Link</th>
    </tr>
`;

    test.markedAsExpected.forEach((mark) => {
        const timeStr = mark.markTime ? new Date(mark.markTime).toLocaleString() : '-';
        markDetailsHtml += `
    <tr>
        <td>${timeStr}</td>
        <td>${mark.type || '-'}</td>
        <td>${mark.markedBy || '-'}</td>
        <td>${mark.lastVersion || '-'}</td>
        <td>${mark.comment || '-'}</td>
        <td>
            ${mark.link ? `<a href="${mark.link}" target="_blank">${mark.link}</a>` : '-'}
        </td>
    </tr>`;
    });

    markDetailsHtml += `
</table>
</div>`;

    return markDetailsHtml;
}

async function genDetail(test) {
    let shotDetail = '';
    let prevShotDesc = '';
    let failed = 0;
    for (let shot of test.results) {
        if (shot.diffRatio < 0.001) {
            continue;
        }
        failed++;

        // Batch same description shot
        if (shot.desc !== prevShotDesc) {
            shotDetail += `\n#### ${shot.desc}`;
            prevShotDesc = shot.desc;
        }

        let [expectedUrl, actualUrl, diffUrl] = await Promise.all([
            inlineImage(shot.expected),
            inlineImage(shot.actual),
            inlineImage(shot.diff)
            // resolveImagePath(shot.expected),
            // resolveImagePath(shot.actual),
            // resolveImagePath(shot.diff)
        ]);
        shotDetail += `
<div class="diff-container">
<figure class="diff-figure">
  <img src="${expectedUrl}" />
  <figcaption>Expected ${test.expectedVersion}</figcaption>
</figure>
<figure class="diff-figure">
  <img src="${actualUrl}" />
  <figcaption>Actual ${test.actualVersion}</figcaption>
</figure>
<figure class="diff-figure">
  <img src="${diffUrl}" />
  <figcaption>Diff(${shot.diffRatio && shot.diffRatio.toFixed(3)})</figcaption>
</figure>
</div>
`;
    }
    return {
        content: shotDetail,
        failed,
        total: test.results.length
    };
}

module.exports = async function(testDir) {
    let sections = [];
    let markedSections = [];

    let failedTest = 0;
    let markedTests = 0;

    const tests = JSON.parse(fs.readFileSync(
        path.join(testDir, RESULT_FILE_NAME), 'utf-8'
    ));

    // 从测试中提取expectedSource和expectedVersion信息
    const expectedSource = tests.length > 0 ? tests[0].expectedSource || 'local' : 'local';
    const expectedVersion = tests.length > 0 ? tests[0].expectedVersion || 'local' : 'local';

    for (let test of tests) {
        let detail = await genDetail(test);

        if (detail.failed > 0) {
            // 检查是否被标记为预期的测试
            if (shouldShowMarkAsExpected(test, expectedSource, expectedVersion)) {
                markedTests++;
                let title = `${markedTests}. ${test.name}`;

                let markContent = generateMarkDetails(test);
                let sectionText = `
<div class="section-divider"></div>
<a id="marked-${test.name}"></a>

<h2>${title}</h2>

${markContent}

${detail.content}
`;

                markedSections.push({
                    content: sectionText,
                    title,
                    id: `marked-${test.name}`
                });
            }
            else {
                failedTest++;
                let title = `${failedTest}. ${test.name} (Failed ${detail.failed} / ${detail.total})`;
                console.log(title);

                let sectionText = `
<div class="section-divider"></div>
<a id="${test.name}"></a>

<h2>${title}</h2>

${detail.content}
    `;

                sections.push({
                    content: sectionText,
                    title,
                    id: test.name
                });
            }
        }
    }

    let htmlText = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Visual Regression Test Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        h1, h2, h3, h4 {
            margin-top: 20px;
        }
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100%;
            background-color: #f8f8f8;
            padding: 20px;
            overflow-y: auto;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .main-content {
            margin-left: 320px;
            padding: 20px;
        }
        .section-divider {
            margin-top: 100px;
            height: 20px;
            border-top: 1px solid #aaa;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .diff-container {
            margin-top: 10px;
        }
        .diff-figure {
            width: 30%;
            display: inline-block;
            margin: 0 10px;
        }
        .diff-figure img {
            width: 100%;
        }
        .mark-details {
            margin-top: 20px;
        }
        .nav-section {
            margin-top: 20px;
        }
        .nav-section h3 {
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }
        .nav-list {
            list-style-type: none;
            padding-left: 5px;
        }
        .nav-list li {
            margin-bottom: 8px;
        }
        .nav-list a {
            text-decoration: none;
            color: #333;
        }
        .nav-list a:hover {
            color: #0066cc;
            text-decoration: underline;
        }
        .summary {
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
<div class="sidebar">
    <h2>Test Report</h2>
    <div class="summary">
        <p>Total: ${tests.length}</p>
        <p>Failed: ${failedTest}</p>
        <p>Marked As Expected: ${markedTests}</p>
    </div>
`;

    if (markedTests > 0) {
        htmlText += `
    <div class="nav-section">
        <h3>Marked As Expected Tests</h3>
        <ul class="nav-list">
            ${markedSections.map(section => {
                return `<li><a href="#${section.id}">${section.title}</a></li>`;
            }).join('\n')}
        </ul>
    </div>`;
    }

    if (failedTest > 0) {
        htmlText += `
    <div class="nav-section">
        <h3>Failed Tests</h3>
        <ul class="nav-list">
            ${sections.map(section => {
                return `<li><a href="#${section.id}">${section.title}</a></li>`;
            }).join('\n')}
        </ul>
    </div>`;
    }

    htmlText += `
</div>
<div class="main-content">
<h1>Visual Regression Test Report</h1>
`;

    htmlText += markedSections.map(section => section.content).join('\n\n');
    htmlText += sections.map(section => section.content).join('\n\n');

    htmlText += '\n</div>\n</body>\n</html>';

    const file = path.join(testDir, 'report.html');
    fs.writeFileSync(file, htmlText, 'utf-8');
    return file;
}

