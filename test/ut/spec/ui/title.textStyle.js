describe('title.textStyle', function() {

    var uiHelper = window.uiHelper;

    var suites = [{
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
                    text: 'normal font'
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
                    text: 'lighter font',
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
                    text: 'default font size, should be 18'
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
    }];

    uiHelper.testOptionSpec('title.textStyle', suites);

});
