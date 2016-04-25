describe('title.subtextStyle', function() {

    var uiHelper = window.uiHelper;

    var suites = [{
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
                    subtext: 'normal font'
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

    uiHelper.testOptionSpec('title.subtextStyle', suites);

});
