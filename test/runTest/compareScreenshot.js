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

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const fs = require('fs');

function readPNG(path) {
    return new Promise(resolve => {
        fs.createReadStream(path)
            .pipe(new PNG())
            .on('parsed', function () {
                resolve({
                    data: this.data,
                    width: this.width,
                    height: this.height
                });
            });
    });
}

module.exports = function (expectedShotPath, actualShotPath, threshold = 0.01) {
    return Promise.all([
        readPNG(expectedShotPath),
        readPNG(actualShotPath)
    ]).then(([expectedImg, actualImg]) => {
        let width = expectedImg.width;
        let height = expectedImg.height;
        if (
            (width !== actualImg.width)
          || (height !== actualImg.height)
        ) {
            throw new Error('Image size not match');
        }
        const diffPNG = new PNG({width, height});
        let diffPixelsCount = pixelmatch(expectedImg.data, actualImg.data, diffPNG.data, width, height, {threshold});
        let totalPixelsCount = width * height;

        return {
            diffRatio: diffPixelsCount / totalPixelsCount,
            diffPNG
        };
    });
};
