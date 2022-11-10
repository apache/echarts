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

const root = __dirname + '/../../';
const echartsPkg = JSON.parse(fs.readFileSync(root + 'package.json'), 'utf-8');
const zrenderPkg = JSON.parse(fs.readFileSync(root + 'node_modules/zrender/package.json', 'utf-8'));

const echartsCorePath = root + 'src/core/echarts.ts';
const echartsCoreFile = fs.readFileSync(echartsCorePath, 'utf-8')
    .replace(/export const version = '\S+'/, `export const version = '${echartsPkg.version}'`)
    .replace(/(export const dependencies = {\s+zrender: ')\S+('\s+})/, `$1${zrenderPkg.version}$2`);
fs.writeFileSync(echartsCorePath, echartsCoreFile, 'utf-8');
