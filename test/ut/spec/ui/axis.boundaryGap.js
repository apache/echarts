
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

describe('axis', function () {

    var uiHelper = window.uiHelper;

    var suites = [{
        name: 'boundaryGap',
        cases: [{
            name: 'should display gap for positive data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [60, 15, 10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: 0,
                    max: 70
                },
                series: [{
                    type: 'bar',
                    data: [60, 15, 10, 12]
                }]
            }
        }, {
            name: 'should not display negative gap for positive data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '200%'
                },
                series: [{
                    type: 'bar',
                    data: [60, 15, 10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: 0,
                    max: 180
                },
                series: [{
                    type: 'bar',
                    data: [60, 15, 10, 12]
                }]
            }
        }, {
            name: 'should not display positive gap for negative data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '200%'
                },
                series: [{
                    type: 'bar',
                    data: [-60, -15, -10, -12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: -180,
                    max: 0
                },
                series: [{
                    type: 'bar',
                    data: [-60, -15, -10, -12]
                }]
            }
        }, {
            name: 'should display both gap for those containing positive '
                + 'and negative data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: -20,
                    max: 50
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            }
        }, {
            name: 'should not display gap by default',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: 0
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            }
        }, {
            name: 'should not display gap when boundaryGap is true for '
                + 'non-ordinal axis',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: true
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: 0
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            }
        }, {
            name: 'should have default value as true for ordinal axis',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    boundaryGap: true
                },
                yAxis: {
                },
                series: [{
                    type: 'bar',
                    data: [40, 15, -10, 12]
                }]
            }
        }, {
            name: 'should have no gap when boundaryGap is false for ordinal '
                + 'axis',
            test: 'notEqualOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    boundaryGap: false
                },
                yAxis: {
                },
                series: [{
                    type: 'line',
                    data: [40, 15, -10, 12]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    boundaryGap: true
                },
                yAxis: {
                },
                series: [{
                    type: 'line',
                    data: [40, 15, -10, 12]
                }]
            }
        }, {
            name: 'should have positive gap for single positive data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [40]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: 0,
                    max: 50
                },
                series: [{
                    type: 'bar',
                    data: [40]
                }]
            }
        }, {
            name: 'should have negative gap for single negative data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [-40]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: -50,
                    max: 0
                },
                series: [{
                    type: 'bar',
                    data: [-40]
                }]
            }
        }, {
            name: 'should have positive gap for same positive data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [40, 40, 40]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: 0,
                    max: 50
                },
                series: [{
                    type: 'bar',
                    data: [40, 40, 40]
                }]
            }
        }, {
            name: 'should have negative gap for single negative data',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    boundaryGap: '20%'
                },
                series: [{
                    type: 'bar',
                    data: [-40, -40, -40]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {
                    min: -50,
                    max: 0
                },
                series: [{
                    type: 'bar',
                    data: [-40, -40, -40]
                }]
            }
        }]
    }];

    uiHelper.testOptionSpec('axis', suites, true);

});
