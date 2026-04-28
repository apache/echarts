#!/usr/bin/env node

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


/**
 * [CAUTION]!!!
 *  Ensure this script to be able to run in low versions of Node.js, since
 *  npm local install or npm install from git can call `npm run prepare`
 *  automatically, which calls this script. Users existing pipelines may
 *  use old versions of Node.js. But `build/build.js` requires Node.js
 *  version > v19 or higher due to some lib like rollup-terser.
 */
const prePublish = require('./pre-publish');

async function run() {
    await prePublish();
}

run();
