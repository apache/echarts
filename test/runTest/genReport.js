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
<div style="margin-top:10px">
<figure style="width: 30%;display:inline-block;margin:0 10px;">
  <img src="${expectedUrl}" style="width:100%" />
  <figcaption>Expected ${test.expectedVersion}</figcaption>
</figure>
<figure style="width: 30%;display:inline-block;margin:0 10px;">
  <img src="${actualUrl}" style="width:100%" />
  <figcaption>Actual ${test.actualVersion}</figcaption>
</figure>
<figure style="width: 30%;display:inline-block;margin:0 10px;">
  <img src="${diffUrl}" style="width:100%" />
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

    let failedTest = 0;

    const tests = JSON.parse(fs.readFileSync(
        path.join(testDir, RESULT_FILE_NAME), 'utf-8'
    ));

    for (let test of tests) {
        let detail = await genDetail(test);

        if (detail.failed > 0) {
            failedTest++;
            let title = `${failedTest}. ${test.name} (Failed ${detail.failed} / ${detail.total})`;
            console.log(title);

            let sectionText = `
<div style="margin-top: 100px;height: 20px;border-top: 1px solid #aaa"></div>
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

    let htmlText = '<h1> Visual Regression Test Report</h1>\n';
    htmlText += `
<p>Total: ${tests.length}</p>
<p>Failed: ${failedTest}</p>
`;
    htmlText += '<ul>\n' + sections.map(section => {
        return `<li><a href="${section.id}">${section.title}</a></li>`;
    }).join('\n') + '</ul>';
    htmlText += sections.map(section => section.content).join('\n\n');

    const file = path.join(testDir, 'report.html');
    fs.writeFileSync(file, htmlText, 'utf-8');
    return file;
}

