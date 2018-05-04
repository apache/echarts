
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

var fs = require('fs');
var path = require('path');

var inputPath = path.resolve(__dirname, '../data/house-price-area.json');
var outputPath = path.resolve(__dirname, '../data/house-price-area2.json');

var xGridCount = 20;
var yGridCount = 20;
var dimX = 0;
var dimY = 1;

function process() {

    var data = readFile(inputPath);
    data = JSON.parse(data);

    if (!(data instanceof Array)) {
        throw new Error('Data should be array');
    }

    var xMin = Infinity;
    var xMax = -Infinity;
    var yMin = Infinity;
    var yMax = -Infinity;

    data.forEach(function (point) {
        xMin = Math.min(point[dimX], xMin);
        xMax = Math.max(point[dimX], xMax);
        yMin = Math.min(point[dimY], yMin);
        yMax = Math.max(point[dimY], yMax);
    });

    console.log('xMin', xMin, 'xMax', xMax, 'yMin', yMin, 'yMax', yMax);

    var cellWidth = (xMax - xMin) / xGridCount;
    var cellHeight = (yMax - yMin) / yGridCount;

    var grids = [];
    var gridsSize = [];

    data.forEach(function (point) {
        var gridXIndex = Math.floor((point[dimX] - xMin) / cellWidth);
        var gridYIndex = Math.floor((point[dimY] - yMin) / cellHeight);

        var line = grids[gridYIndex] || (grids[gridYIndex] = []);
        var cell = line[gridXIndex] || (line[gridXIndex] = []);

        cell.push(point);

        gridsSize[gridYIndex] = gridsSize[gridYIndex] || [];
        gridsSize[gridYIndex][gridXIndex] = gridsSize[gridYIndex][gridXIndex] || [];
        gridsSize[gridYIndex][gridXIndex] = cell.length;
    });

    // Sort for render outline firstly.
    for (var i = 0; i < grids.length; i++) {
        var line = grids[i];
        if (!line || !line.length) {
            continue;
        }

        for (var j = 0; j < line.length; j++) {
            var cell = line[j];
            if (!cell || !cell.length) {
                continue;
            }

            cell.sort(function (a, b) {
                return b.length - a.length;
            });
        }
    }

    var output = [];
    var hasMore;
    do {
        hasMore = false;

        for (var i = 0; i < grids.length; i++) {
            var lines = grids[i];

            if (!lines || !lines.length) {
                continue;
            }
            for (var j = 0; j < lines.length; j++) {
                var cell = lines[j];
                if (!cell || !cell.length) {
                    continue;
                }
                var idx = Math.floor(Math.random() * cell.length);
                if (idx === cell.length) {
                    idx--;
                }
                var point = cell[idx];
                cell.splice(idx, 1);
                output.push(point);

                hasMore |= cell.length > 0;
            }
        }
    } while (hasMore);

    output = JSON.stringify(output);

    writeToFile(outputPath, output);

    console.log('Done.');
}

function readFile(fullFilePath) {
    return fs.readFileSync(fullFilePath, {encoding: 'utf-8'});
}

function writeToFile(outputPath, text) {
    fs.writeFileSync(outputPath, text, {encoding: 'utf-8'});
}



process();
