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

export default {
    visualMap: {
        show: true,
        min: 0,
        max: 1500,
        right: 50,
        top: 'middle',
        text:['高','低']
        // orient: 'horizontal'
    },
    selectedMode: 'single',
    series : [
        {
            name: 'iphone3',
            type: 'map',
            map: 'china',
            showLegendSymbol: true,
            label: {
                show: false,
            },
            emphasis: {
                label: {
                    show: false,
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '重庆',value: 500},
                {name: '河北',value: 500},
                {name: '河南',value: 500},
                {name: '云南',value: 500},
                {name: '辽宁',value: 500},
                {name: '黑龙江',value: 500},
                {name: '湖南',value: 500},
                {name: '安徽',value: 500},
                {name: '山东',value: 500},
                {name: '新疆',value: 500},
                {name: '江苏',value: 500},
                {name: '浙江',value: 500},
                {name: '江西',value: 500},
                {name: '湖北',value: 500},
                {name: '广西',value: 500},
                {name: '甘肃',value: 500},
                {name: '山西',value: 500},
                {name: '内蒙古',value: 500},
                {name: '陕西',value: 500},
                {name: '吉林',value: 500},
                {name: '福建',value: 500},
                {name: '贵州',value: 500},
                {name: '广东',value: 500},
                {name: '青海',value: 500},
                {name: '西藏',value: 500},
                {name: '四川',value: 500},
                {name: '宁夏',value: 500},
                {name: '海南',value: 500},
                {name: '台湾',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        },
        {
            name: 'iphone4',
            type: 'map',
            mapType: 'china',
            showLegendSymbol: true,
            label: {
                show: false,
            },
            emphasis: {
                label: {
                    show: false
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '重庆',value: 500},
                {name: '河北',value: 500},
                {name: '安徽',value: 500},
                {name: '新疆',value: 500},
                {name: '浙江',value: 500},
                {name: '江西',value: 500},
                {name: '山西',value: 500},
                {name: '内蒙古',value: 500},
                {name: '吉林',value: 500},
                {name: '福建',value: 500},
                {name: '广东',value: 500},
                {name: '西藏',value: 500},
                {name: '四川',value: 500},
                {name: '宁夏',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        },
        {
            name: 'iphone5',
            type: 'map',
            mapType: 'china',
            showLegendSymbol: true,
            label: {
                show: false,
            },
            emphasis: {
                label: {
                    show: false
                }
            },
            data:[
                {name: '北京',value: 500},
                {name: '天津',value: 500},
                {name: '上海',value: 500},
                {name: '广东',value: 500},
                {name: '台湾',value: 500},
                {name: '香港',value: 500},
                {name: '澳门',value: 500}
            ]
        }
    ]
};
