
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

describe('legend', function() {

    var uiHelper = window.uiHelper;

    var suites = [{
        name: 'show',
        cases: [{
            name: 'should display legend as default',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a']
                }
            }
        }, {
            name: 'should hide legend when show set to be false',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    show: false
                }
            }
        }]
    }, {
        name: 'left',
        cases: [{
            name: 'should display left position',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: 'left'
                }
            }
        }, {
            name: 'should display at 20%',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: '20%'
                }
            }
        }, {
            name: 'should display at center',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: 'center'
                }
            }
        }, {
            name: 'should display at right',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: 'right'
                }
            }
        }]
    }, {
        name: 'top',
        cases: [{
            name: 'should display top position',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: 50
                }
            }
        }, {
            name: 'should display at 20%',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: '20%'
                }
            }
        }, {
            name: 'should display at middle',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: 'middle'
                }
            }
        }, {
            name: 'should display at bottom',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: 'bottom'
                }
            }
        }]
    }, {
        name: 'right',
        cases: [{
            name: 'should display right position',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    right: 50
                }
            }
        }]
    }, {
        name: 'left and right',
        cases: [{
            name: 'are both set',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: 50,
                    right: 50
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    left: 50
                }
            }
        }]
    }, {
        name: 'top and bottom',
        cases: [{
            name: 'are both set',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: 50,
                    bottom: 50
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    top: 50
                }
            }
        }]
    }, {
        name: 'width',
        cases: [{
            name: 'should display in seperate lines',
            test: 'notEqualOption',
            option1: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    width: 200
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...']
                }
            }
        }]
    }, {
        name: 'hight',
        cases: [{
            name: 'should display in seperate lines',
            test: 'notEqualOption',
            option1: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    height: 50,
                    orient: 'vertical'
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    orient: 'vertical'
                }
            }
        }]
    }, {
        name: 'orient',
        cases: [{
            name: 'should display horizontally',
            option: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    orient: 'horizontal'
                }
            }
        }, {
            name: 'should display vertically',
            option: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    orient: 'vertical'
                }
            }
        }, {
            name: 'should display different with horizontal and vertical',
            test: 'notEqualOption',
            option1: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    orient: 'vertical'
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...']
                }
            }
        }]
    }, {
        name: 'align',
        cases: [{
            name: 'should render correctly with align right',
            option: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b bbb',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ccc ccc',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b bbb',
                        'this is c ccc ccc'],
                    left: 'right',
                    height: 50,
                    orient: 'vertical'
                }
            }
        }, {
            name: 'should align to right when left is right and orient is vertical',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    left: 'right',
                    orient: 'vertical'
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b ...',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c ... ...',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b ...',
                        'this is c ... ...'],
                    left: 'right',
                    orient: 'vertical',
                    align: 'right'
                }
            }
        }, {
            name: 'should align to right when left is right and orient is vertical with height',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: []
                }, {
                    name: 'b',
                    type: 'line',
                    data: []
                }, {
                    name: 'c',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b', 'c'],
                    left: 'right',
                    height: 50,
                    orient: 'vertical'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: []
                }, {
                    name: 'b',
                    type: 'line',
                    data: []
                }, {
                    name: 'c',
                    type: 'line',
                    data: []
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b', 'c'],
                    left: 'right',
                    orient: 'vertical',
                    height: 50,
                    align: 'right'
                }
            }
        }]
    }, {
        name: 'padding',
        cases: [{
            name: 'should display padding at 5px by default',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    padding: 5,
                    backgroundColor: 'yellow'
                }
            }
        }, {
            name: 'should display padding with two values',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    padding: [5, 10],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a'],
                    padding: [5, 10, 5, 10],
                    backgroundColor: 'yellow'
                }
            }
        }]
    }, {
        name: 'itemGap',
        cases: [{
            name: 'should display itemGap at 10 by default',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    itemGap: 10,
                    backgroundColor: 'yellow'
                }
            }
        }]
    }, {
        name: 'itemGap',
        cases: [{
            name: 'should display larger itemGap',
            test: 'notEqualOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    itemGap: 100,
                    backgroundColor: 'yellow'
                }
            }
        }]
    }, {
        name: 'itemGap',
        cases: [{
            name: 'should display larger itemGap into another line',
            test: 'notEqualOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    itemGap: 350,
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: ['x','y','z']
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow'
                }
            }
        }]
    }, {
        name: 'itemWidth',
        cases: [{
            name: 'should have default value of 25',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: []
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: []
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow',
                    itemWidth: 25
                }
            }
        }, {
            name: 'should have larger itemWidth',
            cases: (function() {
                var types = ['bar', 'line', 'scatter', 'effectScatter',
                    'radar'];
                var res = [];
                for (var i = 0; i < types.length; ++i) {
                    res.push({
                        name: types[i],
                        option: {
                            series: [{
                                name: 'a',
                                type: types[i],
                            }, {
                                name: 'b',
                                type: types[i],
                            }],
                            xAxis: [{
                                type: 'category',
                                data: []
                            }],
                            yAxis: [{
                                type: 'value'
                            }],
                            legend: {
                                data: ['a', 'b'],
                                backgroundColor: 'yellow',
                                itemWidth: 50
                            }
                        }
                    });
                }
                res.push({
                    name: 'pie',
                    option: {
                        series: [{
                            type: 'pie',
                            data: [{
                                name: 'a'
                            }, {
                                name: 'b'
                            }, {
                                name: 'c'
                            }]
                        }],
                        legend: {
                            data: ['a', 'b', 'c'],
                            backgroundColor: 'yellow',
                            itemWidth: 50
                        }
                    }
                })
                return res;
            })()
        }]
    }, {
        name: 'itemHeight',
        cases: [{
            name: 'should have default value of 14',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: []
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow'
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'bar',
                }, {
                    name: 'b',
                    type: 'bar',
                }],
                xAxis: [{
                    type: 'category',
                    data: []
                }],
                yAxis: [{
                    type: 'value'
                }],
                legend: {
                    data: ['a', 'b'],
                    backgroundColor: 'yellow',
                    itemHeight: 14
                }
            }
        }, {
            name: 'should have larger itemHeight',
            cases: (function() {
                var types = ['bar', 'line', 'scatter', 'effectScatter',
                    'radar'];
                var res = [];
                for (var i = 0; i < types.length; ++i) {
                    res.push({
                        name: types[i],
                        option: {
                            series: [{
                                name: 'a',
                                type: types[i],
                            }, {
                                name: 'b',
                                type: types[i],
                            }],
                            xAxis: [{
                                type: 'category',
                                data: []
                            }],
                            yAxis: [{
                                type: 'value'
                            }],
                            legend: {
                                data: ['a', 'b'],
                                backgroundColor: 'yellow',
                                itemHeight: 30
                            }
                        }
                    });
                }
                res.push({
                    name: 'pie',
                    option: {
                        series: [{
                            type: 'pie',
                            data: [{
                                name: 'a'
                            }, {
                                name: 'b'
                            }, {
                                name: 'c'
                            }]
                        }],
                        legend: {
                            data: ['a', 'b', 'c'],
                            backgroundColor: 'yellow',
                            itemHeight: 30
                        }
                    }
                })
                return res;
            })()
        }]
    }, {
        name: 'formatter',
        cases: [{
            name: 'should have default value as null',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'abc',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['abc']
                }
            },
            option2: {
                series: [{
                    name: 'abc',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['abc'],
                    formatter: null
                }
            }
        }, {
            name: 'should work with string formatter',
            option: {
                series: [{
                    name: 'abc',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['abc'],
                    formatter: '{name} series'
                }
            }
        }, {
            name: 'should work with callback formatter',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'abc',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['abc'],
                    formatter: function(name) {
                        return name + ' series';
                    }
                }
            },
            option2: {
                series: [{
                    name: 'abc',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['abc'],
                    formatter: '{name} series'
                }
            }
        }]
    }, {
        name: 'inactiveColor',
        cases: [{
            name: 'should have default value as #ccc',
            test: 'equalOption',
            option1: {
                series: [{
                    name: 'a',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['a'],
                    selected: {
                        a: false
                    }
                }
            },
            option2: {
                series: [{
                    name: 'a',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['a'],
                    selected: {
                        a: false
                    },
                    inactiveColor: '#ccc'
                }
            }
        }, {
            name: 'can be changed to other color',
            option: {
                series: [{
                    name: 'a',
                    type: 'pie',
                    data: []
                }],
                legend: {
                    data: ['a'],
                    selected: {
                        a: false
                    },
                    inactiveColor: '#f00'
                }
            }
        }]
    }, {
        name: 'selected',
        cases: [{
            name: 'should select all by default',
            test: 'equalOption',
            option1: {
                series: [{
                    type: 'pie',
                    data: [{
                        name: 'a'
                    }, {
                        name: 'b'
                    }, {
                        name: 'c'
                    }]
                }],
                legend: {
                    data: ['a', 'b', 'c']
                }
            },
            option2: {
                series: [{
                    type: 'pie',
                    data: [{
                        name: 'a'
                    }, {
                        name: 'b'
                    }, {
                        name: 'c'
                    }]
                }],
                legend: {
                    data: ['a', 'b', 'c'],
                    selected: {
                        a: true,
                        b: true,
                        c: true
                    }
                }
            }
        }, {
            name: 'should hide when selected is set to be false',
            test: 'notEqualOption',
            option1: {
                series: [{
                    type: 'pie',
                    data: [{
                        name: 'a'
                    }, {
                        name: 'b'
                    }, {
                        name: 'c'
                    }]
                }],
                legend: {
                    data: ['a', 'b', 'c'],
                    selected: {
                        a: false,
                        b: true,
                        c: true
                    }
                }
            },
            option2: {
                series: [{
                    type: 'pie',
                    data: [{
                        name: 'a'
                    }, {
                        name: 'b'
                    }, {
                        name: 'c'
                    }]
                }],
                legend: {
                    data: ['a', 'b', 'c'],
                    selected: {
                        a: true,
                        b: true,
                        c: true
                    }
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('legend', suites, false);

});
