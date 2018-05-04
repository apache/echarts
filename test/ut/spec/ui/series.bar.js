
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

describe('series.bar', function () {

    var uiHelper = window.uiHelper;

    var defaultOption = {
        xAxis: {
            data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        },
        yAxis: {},
        series: {
            type: 'bar',
            data: [220, 182, 191, 234, 290, 330, 310]
        }
    };
    // get a clone of default option
    var getOption = function () {
        return JSON.parse(JSON.stringify(defaultOption));
    };

    var suites = [{
        name: 'bar color',
        cases: [{
            name: 'should display default bar color',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    itemStyle: {
                        normal: {
                            color: '#c23531'
                        }
                    }
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    itemStyle: {
                        normal: {
                            color: '#2f4554'
                        }
                    }
                }]
            }
        }]
    }, {
        name: 'border color',
        cases: [{
            name: 'should have default border color',
            ignore: true,
            test: 'equalOption',
            option1: (function () {
                var option = getOption();
                option.series.itemStyle = {
                    normal: {
                        borderWidth: 1
                    }
                }
                return option;
            })(),
            option2: (function () {
                var option = getOption();
                option.series.itemStyle = {
                    normal: {
                        borderColor: '#000',
                        borderWidth: 1
                    }
                }
                return option;
            })()
        }]
    }, {
        name: 'border width',
        cases: [{
            name: 'should have default width',
            test: 'equalOption',
            option1: getOption(),
            option2: (function () {
                var option = getOption();
                option.series.itemStyle = {
                    normal: {
                        borderWidth: 0
                    }
                }
                return option;
            })()
        }, {
            name: 'can be set to other width',
            test: 'notEqualOption',
            option1: (function () {
                var option = getOption();
                option.series.itemStyle = {
                    normal: {
                        borderWidth: 10,
                        borderColor: 'red'
                    }
                }
                return option;
            })(),
            option2: getOption()
        }]
    }, {
        name: 'opacity',
        cases: [{
            name: 'can be set to other opacity',
            test: 'notEqualOption',
            option1: (function () {
                var option = getOption();
                option.series.itemStyle = {
                    normal: {
                        opacity: 0.8
                    }
                }
                return option;
            })(),
            option2: getOption()
        }]
    }, {
        name: 'stack',
        cases: [{
            name: 'should stack properly',
            test: 'notEqualOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }]
            }
        }]
    }, {
        name: 'barMaxWidth',
        cases: [{
            name: 'should work for pixels',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 10
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barWidth: 10
                }]
            }
        }, {
            name: 'should work for percentage',
            option: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: '10%'
                }]
            }
        }, {
            name: 'should take effect when barWidth is larger than barMaxWidth',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barWidth: 15,
                    barMaxWidth: 10
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 10
                }]
            }
        }, {
            name: 'should not take effect when barWidth is less than '
                + 'barMaxWidth',
            test: 'notEqualOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barWidth: 5,
                    barMaxWidth: 10
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 10
                }]
            }
        }, {
            name: 'should not take effect when barMaxWidth is larger than '
                + 'default',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 100
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }]
            }
        }, {
            name: 'should work with stack',
            test: 'notEqualOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 10,
                    stack: 'a'
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }]
            }
        }, {
            name: 'should use the last value when stack',
            test: 'equalOption',
            option1: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 10,
                    stack: 'a'
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 20,
                    stack: 'a'
                }]
            },
            option2: {
                xAxis: {
                    data: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                },
                yAxis: {},
                series: [{
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    barMaxWidth: 20,
                    stack: 'a'
                }, {
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310],
                    stack: 'a'
                }]
            }
        }]
    }];

    uiHelper.testOptionSpec('series.bar', suites, true);

});
