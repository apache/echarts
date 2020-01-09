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

var echarts = require('../../dist/echarts');
// var v8 = require('v8');
// v8.setFlagsFromString('--max-old-space-size=4096');

var { createCanvas } = require('canvas');
var fs = require('fs');
var ProgressBar = require('progress');

echarts.setCanvasCreator(function () {
    return createCanvas(100, 100);
});

var canvas = createCanvas();
canvas.width = 2048;
canvas.height = 1024;

var worldJson = JSON.parse(fs.readFileSync('../../map/json/world.json', 'utf-8'));
echarts.registerMap('world', worldJson);

var chart = echarts.init(canvas);
chart.setOption({
    backgroundColor: '#000',
    geo: {
        map: 'world',
        roam: true,
        label: {
            emphasis: {
                show: false
            }
        },
        silent: true,
        itemStyle: {
            normal: {
                areaColor: '#323c48',
                borderColor: '#111'
            },
            emphasis: {
                areaColor: '#2a333d'
            }
        }
    },
    series: [{
        name: '弱',
        type: 'scatter',
        progressive: 1e5,
        coordinateSystem: 'geo',
        symbolSize: 0.5,
        blendMode: 'lighter',
        large: true,
        itemStyle: {
            normal: {
                color: 'rgb(20, 15, 2)'
            }
        },
        postEffect: {
            enable: true
        },
        silent: true,
        dimensions: ['lng', 'lat'],
        data: new Float32Array()
    }]
});


// var CHUNK_COUNT = 277;
var CHUNK_COUNT = 229;
// https://blog.openstreetmap.org/2012/04/01/bulk-gps-point-data/
function fetchData(idx) {
    if (idx >= CHUNK_COUNT) {
        setTimeout(function () {
            fs.writeFile('out.png', canvas.toBuffer());
            chart.dispose();
        });
        return;
    }

    fs.readFile(`../../../echarts-gl/test/data/gps/gps_${idx}.bin`, function (err, buffer) {
        var arr = new Uint8Array(buffer.length);
        for (var i = 0; i < buffer.length; i++) {
            arr[i] = buffer[i];
        }

        var rawData = new Int32Array(arr.buffer);
        var data = new Float32Array(rawData.length);
        for (var i = 0; i < rawData.length; i += 2) {
            data[i] = rawData[i+1] / 1e7;
            data[i+1] = rawData[i] / 1e7;
        }

        chart.appendData({
            seriesIndex: 0,
            data: data
        });

        fetchData(idx + 1);

        progress.tick();
    });
}
var progress = new ProgressBar('Generating [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: CHUNK_COUNT
});

fetchData(0);