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

// Fix for 南海诸岛

import * as zrUtil from 'zrender/src/core/util';
import Region from '../Region';

var geoCoord = [126, 25];

var points = [
    [[0,3.5],[7,11.2],[15,11.9],[30,7],[42,0.7],[52,0.7],
        [56,7.7],[59,0.7],[64,0.7],[64,0],[5,0],[0,3.5]],
    [[13,16.1],[19,14.7],[16,21.7],[11,23.1],[13,16.1]],
    [[12,32.2],[14,38.5],[15,38.5],[13,32.2],[12,32.2]],
    [[16,47.6],[12,53.2],[13,53.2],[18,47.6],[16,47.6]],
    [[6,64.4],[8,70],[9,70],[8,64.4],[6,64.4]],
    [[23,82.6],[29,79.8],[30,79.8],[25,82.6],[23,82.6]],
    [[37,70.7],[43,62.3],[44,62.3],[39,70.7],[37,70.7]],
    [[48,51.1],[51,45.5],[53,45.5],[50,51.1],[48,51.1]],
    [[51,35],[51,28.7],[53,28.7],[53,35],[51,35]],
    [[52,22.4],[55,17.5],[56,17.5],[53,22.4],[52,22.4]],
    [[58,12.6],[62,7],[63,7],[60,12.6],[58,12.6]],
    [[0,3.5],[0,93.1],[64,93.1],[64,0],[63,0],[63,92.4],
        [1,92.4],[1,3.5],[0,3.5]]
];

for (var i = 0; i < points.length; i++) {
    for (var k = 0; k < points[i].length; k++) {
        points[i][k][0] /= 10.5;
        points[i][k][1] /= -10.5 / 0.75;

        points[i][k][0] += geoCoord[0];
        points[i][k][1] += geoCoord[1];
    }
}

export default function (geo) {
    if (geo.map === 'china') {
        geo.regions.push(new Region(
            '南海诸岛',
            zrUtil.map(points, function (exterior) {
                return {
                    type: 'polygon',
                    exterior: exterior
                };
            }), geoCoord
        ));
    }
}