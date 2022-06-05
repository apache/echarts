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

var commander = require('commander');
var encode = require('./encode');
var decode = require('./decode');
var fs = require('fs');
var path = require('path');

commander
    .option('-i, --input <file name>')
    .option('-o, --output <file name>')
    .option('-t, --type <type>', 'encode, decode')
    .parse(process.argv);

var json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), commander.input), 'utf-8'));

if (commander.type === 'decode') {
    decode(json)
}
else {
    encode(json);
}

fs.writeFileSync(path.resolve(process.cwd(), commander.output), JSON.stringify(json), 'utf8')