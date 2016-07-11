describe('title', function() {

    var uiHelper = window.uiHelper;

    var suites = [{
        name: 'show',
        cases: [{
            name: 'should display given title by default',
            option: {
                series: [],
                title: {
                    text: 'test title'
                }
            }
        }, {
            name: 'should hide title when show is false',
            option: {
                series: [],
                title: {
                    text: 'hidden title',
                    display: false
                }
            }
        }]
    }, {
        name: 'text',
        cases: [{
            name: 'should display title',
            option: {
                series: [],
                title: {
                    text: 'here is a title'
                }
            }
        }, {
            name: 'should display long title in a line',
            option: {
                series: [],
                title: {
                    text: 'here is a very long long long long long long long '
                        + 'long long long long long long long long long long '
                        + 'long long long long long long long long long title'
                }
            }
        }, {
            name: 'should run into a new line with \\n',
            option: {
                series: [],
                title: {
                    text: 'first line\nsecond line'
                }
            }
        }, {
            name: 'should display no title by default',
            option: {
                series: []
            }
        }]
    }, {
        name: 'subtext',
        cases: [{
            name: 'should display subtext without text',
            option: {
                series: [],
                title: {
                    subtext: 'subtext without text'
                }
            }
        }, {
            name: 'should display subtext with text',
            option: {
                series: [],
                title: {
                    text: 'this is text',
                    subtext: 'subtext without text'
                }
            }
        }]
    }, {
        name: 'padding',
        cases: [{
            name: 'should display padding 5px as default',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'this is title with 5px padding'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'this is title with 5px padding',
                    padding: 5
                }
            }
        }, {
            name: 'should display one-value padding',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'should display one-value padding'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'should display one-value padding',
                    padding: 50
                }
            }
        }, {
            name: 'should display two-value padding',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'display two-value padding'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'display two-value padding',
                    padding: [20, 50]
                }
            }
        }, {
            name: 'should display four-value padding',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'compare padding with 10, 30, 50, 70'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'compare padding with 10, 30, 50, 70',
                    padding: [10, 30, 50, 70]
                }
            }
        }, {
            name: 'should display four-value and two-value padding accordingly',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'compare padding with 20, 50 and 20, 50, 20, 50',
                    padding: [20, 50]
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'compare padding with 20, 50 and 20, 50, 20, 50',
                    padding: [20, 50, 20, 50]
                }
            }
        }]
    }, {
        name: 'itemGap',
        cases: [{
            name: 'should have default itemGap as 10px',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'title',
                    subtext: 'subtext'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'title',
                    subtext: 'subtext',
                    itemGap: 10
                }
            }
        }]
    }, {
        name: 'left',
        cases: [{
            name: 'should display left position',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    left: 50
                }
            }
        }, {
            name: 'should display at 20%',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    left: '20%'
                }
            }
        }, {
            name: 'should display at center',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    left: 'center'
                }
            }
        }, {
            name: 'should display at right',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    left: 'right'
                }
            }
        }]
    }, {
        name: 'top',
        cases: [{
            name: 'should display top position',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    top: 50
                }
            }
        }, {
            name: 'should display at 20%',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    top: '20%'
                }
            }
        }, {
            name: 'should display at middle',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    top: 'middle'
                }
            }
        }, {
            name: 'should display at bottom',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    top: 'bottom'
                }
            }
        }]
    }, {
        name: 'right',
        cases: [{
            name: 'should display right position',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    right: 50
                }
            }
        }]
    }, {
        name: 'bottom',
        cases: [{
            name: 'should display bottom position',
            option: {
                series: [],
                title: {
                    text: 'this is title',
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
                series: [],
                title: {
                    text: 'this is title',
                    left: 50,
                    right: 50
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'this is title',
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
                series: [],
                title: {
                    text: 'this is title',
                    top: 50,
                    bottom: 50
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'this is title',
                    top: 50
                }
            }
        }]
    }, {
        name: 'backgroundColor',
        cases: [{
            name: 'should show specific background color',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    backgroundColor: 'rgba(255, 100, 0, 0.2)'
                }
            }
        }]
    }, {
        name: 'borderColor',
        cases: [{
            name: 'should show specific border color at default border width',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'this is title'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'this is title',
                    borderColor: '#ccc',
                    borderWidth: 0
                }
            }
        }, {
            name: 'should display larger border width',
            option: {
                series: [],
                title: {
                    text: 'this is title',
                    borderWidth: 15
                }
            }
        }]
    }, {
        name: 'shadowBlur and shadowColor',
        cases: [{
            name: 'should display shadow blur',
            option: {
                series: [],
                title: {
                    backgroundColor: 'green',
                    text: 'this is title',
                    shadowColor: 'red',
                    shadowBlur: 5
                }
            }
        }]
    }, {
        name: 'shadowOffsetX',
        cases: [{
            name: 'should display shadow blur',
            option: {
                series: [],
                title: {
                    backgroundColor: 'green',
                    text: 'this is title',
                    shadowColor: 'red',
                    shadowBlur: 5,
                    shadowOffsetX: 10
                }
            }
        }]
    }, {
        name: 'shadowOffsetY',
        cases: [{
            name: 'should display shadow blur',
            option: {
                series: [],
                title: {
                    backgroundColor: 'green',
                    text: 'this is title',
                    shadowColor: 'red',
                    shadowBlur: 5,
                    shadowOffsetY: 10
                }
            }
        }]
    }, {
        name: 'shadowOffsetX and shadowOffsetY',
        cases: [{
            name: 'should display shadow blur',
            option: {
                series: [],
                title: {
                    backgroundColor: 'green',
                    text: 'this is title',
                    shadowColor: 'red',
                    shadowBlur: 5,
                    shadowOffsetX: 10,
                    shadowOffsetY: 10
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('title', suites);

});
