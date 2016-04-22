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
        name: 'textStyle.color',
        cases: [{
            name: 'should display expected color name',
            option: {
                series: [],
                title: {
                    text: 'a red title',
                    textStyle: {
                        color: 'red'
                    }
                }
            }
        }, {
            name: 'should display expected color 6-digit hex',
            option: {
                series: [],
                title: {
                    text: 'an orange title',
                    textStyle: {
                        color: '#ff6600'
                    }
                }
            }
        }, {
            name: 'should display expected color 3-digit hex',
            option: {
                series: [],
                title: {
                    text: 'an orange title',
                    textStyle: {
                        color: '#f60'
                    }
                }
            }
        }, {
            name: 'should display expected color rgb',
            option: {
                series: [],
                title: {
                    text: 'an orange title',
                    textStyle: {
                        color: 'rgb(255, 127, 0)'
                    }
                }
            }
        }, {
            name: 'should display expected color rgba',
            option: {
                series: [],
                title: {
                    text: 'an orange title with alpha',
                    textStyle: {
                        color: 'rgba(255, 127, 0, 0.5)'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontStyle',
        cases: [{
            name: 'should display normal font style',
            option: {
                series: [],
                title: {
                    text: 'normal font',
                    textStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display italic font style',
            option: {
                series: [],
                title: {
                    text: 'italic font',
                    textStyle: {
                        fontStyle: 'italic'
                    }
                }
            }
        }, {
            name: 'should display oblique font style',
            option: {
                series: [],
                title: {
                    text: 'oblique font',
                    textStyle: {
                        fontStyle: 'oblique'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontWeight',
        cases: [{
            name: 'should display default normal font weight',
            option: {
                series: [],
                title: {
                    text: 'normal font',
                    textStyle: {
                        fontWeight: undefined
                    }
                }
            }
        }, {
            name: 'should display normal font weight',
            option: {
                series: [],
                title: {
                    text: 'normal font',
                    textStyle: {
                        fontWeight: 'normal'
                    }
                }
            }
        }, {
            name: 'should display bold font weight',
            option: {
                series: [],
                title: {
                    text: 'bold font',
                    textStyle: {
                        fontStyle: 'bold'
                    }
                }
            }
        }, {
            name: 'should display bolder font weight',
            option: {
                series: [],
                title: {
                    text: 'bolder font',
                    textStyle: {
                        fontStyle: 'bolder'
                    }
                }
            }
        }, {
            name: 'should display lighter font weight',
            option: {
                series: [],
                title: {
                    text: 'bolder font',
                    textStyle: {
                        fontStyle: 'lighter'
                    }
                }
            }
        }, {
            name: 'should display font weight as number',
            option: {
                series: [],
                title: {
                    text: 'font weight at 100',
                    textStyle: {
                        fontStyle: '100'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontFamily',
        cases: [{
            name: 'should display default fontFamily as sans-serif',
            option: {
                series: [],
                title: {
                    text: 'sans-serif',
                    textStyle: {
                        fontFamily: undefined
                    }
                }
            }
        }, {
            name: 'should display fontFamily as sans-serif',
            option: {
                series: [],
                title: {
                    text: 'sans-serif',
                    textStyle: {
                        fontFamily: 'sans-serif'
                    }
                }
            }
        }, {
            name: 'should display default fontFamily as Arial',
            option: {
                series: [],
                title: {
                    text: 'Arial',
                    textStyle: {
                        fontFamily: 'Arial'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontSize',
        cases: [{
            name: 'should display default fontSize at 18',
            option: {
                series: [],
                title: {
                    text: 'default font size, should be 18',
                    textStyle: {
                        fontSize: undefined
                    }
                }
            }
        }, {
            name: 'should display normal fontSize',
            option: {
                series: [],
                title: {
                    text: 'font size at 18',
                    textStyle: {
                        fontSize: 18
                    }
                }
            }
        }, {
            name: 'should display larger fontSize',
            option: {
                series: [],
                title: {
                    text: 'larger font size, 30',
                    textStyle: {
                        fontSize: 30
                    }
                }
            }
        }, {
            name: 'should display smaller fontSize',
            option: {
                series: [],
                title: {
                    text: 'smaller font size, 12',
                    textStyle: {
                        fontSize: 12
                    }
                }
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
        name: 'subtextStyle.color',
        cases: [{
            name: 'should display expected color name',
            option: {
                series: [],
                title: {
                    subtext: 'a red subtitle',
                    subtextStyle: {
                        color: 'red'
                    }
                }
            }
        }, {
            name: 'should display expected color 6-digit hex',
            option: {
                series: [],
                title: {
                    subtext: 'an orange subtitle',
                    subtextStyle: {
                        color: '#ff6600'
                    }
                }
            }
        }, {
            name: 'should display expected color 3-digit hex',
            option: {
                series: [],
                title: {
                    subtext: 'an orange subtitle',
                    subtextStyle: {
                        color: '#f60'
                    }
                }
            }
        }, {
            name: 'should display expected color rgb',
            option: {
                series: [],
                title: {
                    subtext: 'an orange subtitle',
                    subtextStyle: {
                        color: 'rgb(255, 127, 0)'
                    }
                }
            }
        }, {
            name: 'should display expected color rgba',
            option: {
                series: [],
                title: {
                    subtext: 'an orange subtitle with alpha',
                    subtextStyle: {
                        color: 'rgba(255, 127, 0, 0.5)'
                    }
                }
            }
        }]
    }, {
        name: 'subtextStyle.fontStyle',
        cases: [{
            name: 'should display normal font style',
            option: {
                series: [],
                title: {
                    subtext: 'normal font',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display italic font style',
            option: {
                series: [],
                title: {
                    subtext: 'italic font',
                    subtextStyle: {
                        fontStyle: 'italic'
                    }
                }
            }
        }, {
            name: 'should display oblique font style',
            option: {
                series: [],
                title: {
                    subtext: 'oblique font',
                    subtextStyle: {
                        fontStyle: 'oblique'
                    }
                }
            }
        }]
    }, {
        name: 'subtextStyle.fontWeight',
        cases: [{
            name: 'should display default normal font weight',
            option: {
                series: [],
                title: {
                    subtext: 'normal font',
                    subtextStyle: {
                        fontWeight: undefined
                    }
                }
            }
        }, {
            name: 'should display normal font weight',
            option: {
                series: [],
                title: {
                    subtext: 'normal font',
                    subtextStyle: {
                        fontWeight: 'normal'
                    }
                }
            }
        }, {
            name: 'should display bold font weight',
            option: {
                series: [],
                title: {
                    subtext: 'bold font',
                    subtextStyle: {
                        fontStyle: 'bold'
                    }
                }
            }
        }, {
            name: 'should display bolder font weight',
            option: {
                series: [],
                title: {
                    subtext: 'bolder font',
                    subtextStyle: {
                        fontStyle: 'bolder'
                    }
                }
            }
        }, {
            name: 'should display lighter font weight',
            option: {
                series: [],
                title: {
                    subtext: 'lighter font',
                    subtextStyle: {
                        fontStyle: 'lighter'
                    }
                }
            }
        }, {
            name: 'should display font weight as number',
            option: {
                series: [],
                title: {
                    subtext: 'font weight at 100',
                    subtextStyle: {
                        fontStyle: '100'
                    }
                }
            }
        }]
    }, {
        name: 'subtextStyle.fontFamily',
        cases: [{
            name: 'should display default fontSize at 12',
            option: {
                series: [],
                title: {
                    subtext: 'default font size, should be 12',
                    subtextStyle: {
                        fontSize: undefined
                    }
                }
            }
        }, {
            name: 'should display normal fontSize',
            option: {
                series: [],
                title: {
                    subtext: 'font size at 12',
                    subtextStyle: {
                        fontSize: 12
                    }
                }
            }
        }, {
            name: 'should display larger fontSize',
            option: {
                series: [],
                title: {
                    subtext: 'larger font size, 30',
                    subtextStyle: {
                        fontSize: 30
                    }
                }
            }
        }, {
            name: 'should display smaller fontSize',
            option: {
                series: [],
                title: {
                    subtext: 'smaller font size, 10',
                    subtextStyle: {
                        fontSize: 10
                    }
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('title', suites);

});
