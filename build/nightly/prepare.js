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
const packageJsonPath = __dirname + '/../../package.json';
const nightlyPackageName = 'echarts-nightly';

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

function updateVersion(version) {
    const isNext = process.argv.includes('--next');
    const parts = /(\d+)\.(\d+)\.(\d+)($|\-)/.exec(version);
    if (!parts) {
        throw new Error(`Invalid version number ${version}`);
    }
    // Add date to version.
    const major = +parts[1];
    let minor = +parts[2];
    let patch = +parts[3];
    const isStable = !parts[4];
    if (isStable) {
        // It's previous stable version. Dev version should be higher.
        if (isNext) {
            // Increase minor version for next branch.
            minor++;
            patch = 0;
        }
        else {
            // Increase main version for master branch.
            patch++;
        }
    }

    const date = new Date().toISOString().replace(/:|T|\.|-/g, '').slice(0, 8);
    return `${major}.${minor}.${patch}-dev.${date}`;
}

packageJson.name = nightlyPackageName;
packageJson.version = updateVersion(packageJson.version);

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

const readmePath = __dirname + '/../../README.md';
const readmeAttention = `<h3>
<p><em>⚠️ ATTENTION PLEASE</em></p>
<p><em>This is nightly build of Apache ECharts. Please DON't use it in your production environment.</em></p>
</h3>`;
const readmeContent = fs.readFileSync(readmePath, 'utf-8');
if (!readmeContent.includes(readmeAttention)) {
    fs.writeFileSync(readmePath, `
${readmeAttention}

${readmeContent}
`, 'utf-8');
}
