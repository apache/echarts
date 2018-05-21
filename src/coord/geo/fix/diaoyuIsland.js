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

// Fix for 钓鱼岛

// var Region = require('../Region');
// var zrUtil = require('zrender/src/core/util');

// var geoCoord = [126, 25];

var points = [
    [
        [123.45165252685547, 25.73527164402261],
        [123.49731445312499, 25.73527164402261],
        [123.49731445312499, 25.750734064600884],
        [123.45165252685547, 25.750734064600884],
        [123.45165252685547, 25.73527164402261]
    ]
];

export default function (geo) {
    if (geo.map === 'china') {
        for (var i = 0, len = geo.regions.length; i < len; ++i) {
            if (geo.regions[i].name === '台湾') {
                geo.regions[i].geometries.push({
                    type: 'polygon',
                    exterior: points[0]
                });
            }
        }
    }
}