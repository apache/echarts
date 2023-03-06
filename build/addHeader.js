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


// Import required modules
const fs = require('fs');
const preamble = require('./preamble');
const pathTool = require('path');
const chalk = require('chalk');

// Define path variables
const excludesPath = pathTool.join(__dirname, '../.headerignore');
const ecBasePath = pathTool.join(__dirname, '../');

// Check if script is run in verbose mode
const isVerbose = process.argv[2] === '--verbose';

// Main function that runs the script
function run() {
    // Define arrays to keep track of updated, passed, and pending files
    const updatedFiles = [];
    const passFiles = [];
    const pendingFiles = [];

    // Get the list of exclude patterns from the .headerignore file
    const excludePatterns = getExcludePatterns();

    // Regular expression to match file extensions
    const extReg = /\.([a-zA-Z0-9_-]+)$/;

    // Start traversing the directory tree
    travel('./');

    // Print results
    console.log('\n');
    console.log('----------------------------');
    console.log(' Files that exists license: ');
    console.log('----------------------------');
    if (passFiles.length) {
        // If there are files that passed, print them
        if (isVerbose) {
            passFiles.forEach(function (path) {
                console.log(chalk.green(path));
            });
        }
        else {
            console.log(chalk.green(passFiles.length + ' files. (use argument "--verbose" see details)'));
        }
    }
    else {
        // If there are no files that passed, print "Nothing."
        console.log('Nothing.');
    }

    console.log('\n');
    console.log('--------------------');
    console.log(' License added for: ');
    console.log('--------------------');
    if (updatedFiles.length) {
        // If there are updated files, print them
        updatedFiles.forEach(function (path) {
            console.log(chalk.green(path));
        });
    }
    else {
        // If there are no updated files, print "Nothing."
        console.log('Nothing.');
    }

    console.log('\n');
    console.log('----------------');
    console.log(' Pending files: ');
    console.log('----------------');
    if (pendingFiles.length) {
        // If there are pending files, print them
        pendingFiles.forEach(function (path) {
            console.log(chalk.red(path));
        });
    }
    else {
        // If there are no pending files, print "Nothing."
        console.log('Nothing.');
    }

    console.log('\nDone.');

    // Recursive function to traverse the directory tree
    function travel(relativePath) {
        // Check if the current file or directory should be excluded
        if (isExclude(relativePath)) {
            return;
        }

        // Get the absolute path of the current file or directory
        const absolutePath = pathTool.join(ecBasePath, relativePath);

        // Get the file/directory stats
        const stat = fs.statSync(absolutePath);

        if (stat.isFile()) {
            // If the current item is a file, check if it has a license
            const fileExt = getExt(absolutePath);
            const fileStr = fs.readFileSync(absolutePath, 'utf-8');
            const existLicense = preamble.extractLicense(fileStr, fileExt);

            if (existLicense) {
                // If the file already has a license, add it to the "passFiles" array
                passFiles.push(absolutePath);
            }
            else if (preamble.hasPreamble(fileExt)) {
                // If the file does not have a license but requires one, add the license to the file
                fs.writeFileSync(absolutePath, preamble.addPreamble(fileStr, fileExt),
'utf-8');
                updatedFiles.push(absolutePath);
            }
            else {
                pendingFiles.push(absolutePath);
            }
        }
        else if (stat.isDirectory()) {
            fs.readdirSync(relativePath).forEach(function (file) {
                travel(pathTool.join(relativePath, file));
            });
        }
    }

    function getExcludePatterns() {
        const excludePatterns = [];
        const content = fs.readFileSync(excludesPath, { encoding: 'utf-8' });
        content.replace(/\r/g, '\n').split('\n').forEach(function (line) {
            line = line.trim();
            if (line && line.charAt(0) !== '#') {
                excludePatterns.push(new RegExp(line));
            }
        });
        return excludePatterns;
    }

    function isExclude(relativePath) {
        for (let i = 0; i < excludePatterns.length; i++) {
            if (excludePatterns[i].test(relativePath)) {
                return true;
            }
        }
        return false
