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
const commander = require('commander');
const fse = require('fs-extra');
const pathTool = require('path');

commander
    .usage('[options]')
    .description([
        'Generate source release'
    ].join('\n'))
    .option(
        '--rcversion <version>',
        'Release version'
    )
    .option(
        '--commit <commit>',
        'Hash of commit'
    )
    .option(
        '--out <out>',
        'Out directory. Default to be tmp/release-mail'
    )
    .parse(process.argv);

let rcVersion = commander.rcversion + '';
if (rcVersion.startsWith('v')) {   // tag may have v prefix, v5.1.0
    rcVersion = rcVersion.substr(1);
}
if (rcVersion.indexOf('-rc.') < 0) {
    throw new Error('Only rc version is accepeted.');
}
const releaseCommit = commander.commit;
if (!releaseCommit) {
    throw new Error('Release commit is required');
}

const outDir = pathTool.resolve(process.cwd(), commander.out || 'tmp/release-mails');

const parts = /(\d+)\.(\d+)\.(\d+)\-rc\.(\d+)/.exec(rcVersion);
if (!parts) {
    throw new Error(`Invalid version number ${rcVersion}`);
}

const major = +parts[1];
const minor = +parts[2];
const patch = +parts[3];
const rc = +parts[4];

const releaseFullName = `Apache ECharts ${major}.${minor}.${patch} (release candidate ${rc})`

console.log('[Release Verion] ' + rcVersion);
console.log('[Release Commit] ' + releaseCommit);
console.log('[Release Name] ' + releaseFullName);

const voteTpl = fse.readFileSync(pathTool.join(__dirname, './template/vote-release.tpl'), 'utf-8');
const announceTpl = fse.readFileSync(pathTool.join(__dirname, './template/announce-release.tpl'), 'utf-8');
const voteUntil = new Date(+new Date() + (72 + 12) * 3600 * 1000);   // 3.5 day.

fse.ensureDirSync(outDir);
fse.writeFileSync(
    pathTool.resolve(outDir, 'vote.txt'),
    voteTpl.replace(/{{ECHARTS_RELEASE_VERSION}}/g, rcVersion)
        .replace(/{{ECHARTS_RELEASE_VERSION_FULL_NAME}}/g, releaseFullName)
        .replace(/{{ECHARTS_RELEASE_COMMIT}}/g, releaseCommit)
        .replace(/{{VOTE_UNTIL}}/g, voteUntil.toISOString()),
    'utf-8'
);

fse.writeFileSync(
    pathTool.resolve(outDir, 'announce.txt'),
    announceTpl.replace(/{{ECHARTS_RELEASE_VERSION}}/g, `${major}.${minor}.${patch}`)
        .replace(/{{ECHARTS_RELEASE_COMMIT}}/g, releaseCommit),
    'utf-8'
);