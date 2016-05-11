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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['a'],
                    right: 50
                }
            }
        }]
    }, {
        name: 'bottom',
        cases: [{
            name: 'should display bottom position',
            option: {
                series: [{
                    name: 'a',
                    type: 'line',
                    data: [1, 2, 4]
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['a'],
                    bottom: 50
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
                    width: 200
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c']
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
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
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c'],
                    orient: 'vertical'
                }
            },
            option2: {
                series: [{
                    name: 'this is a',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is b',
                    type: 'line',
                    data: []
                }, {
                    name: 'this is c',
                    type: 'line',
                    data: []
                }],
                xAxis : [{
                    type : 'category',
                    data : ['x','y','z']
                }],
                yAxis : [{
                    type : 'value'
                }],
                legend: {
                    data: ['this is a', 'this is b',
                        'this is c']
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('legend', suites);

});
