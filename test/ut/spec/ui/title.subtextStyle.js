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
        }, {
            name: 'should display italic not as normal',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'italic vs. normal',
                    subtextStyle: {
                        fontStyle: 'italic'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'italic vs. normal',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display oblique not as normal',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'oblique vs. normal',
                    subtextStyle: {
                        fontStyle: 'oblique'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'oblique vs. normal',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }]
    }, {
        name: 'subtextStyle.fontWeight',
        cases: [{
            name: 'should display default normal font weight',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    subtext: 'normal font'
                }
            },
            option2: {
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
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'bold font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'bold'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'bold font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display bolder font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'bolder font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'bolder'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'bolder font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display light font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'light font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'light'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'light font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display numbering font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: '100 font vs. normal font',
                    subtextStyle: {
                        fontStyle: '100'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: '100 font vs. normal font',
                    subtextStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }]
    }, {
        name: 'subtextStyle.fontFamily',
        cases: [{
            name: 'should display default fontFamily as sans-serif',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    subtext: 'sans-serif'
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'sans-serif',
                    fontFamily: 'sans-serif'
                }
            }
        }, {
            name: 'should display default fontFamily as Arial',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'Arial vs. sans-serif',
                    subtextStyle: {
                        fontFamily: 'Arial'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'Arial vs. sans-serif',
                    subtextStyle: {
                        fontFamily: 'sans-serif'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontSize',
        cases: [{
            name: 'should display default fontSize at 18',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    subtext: 'default font size, should be 18'
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'default font size, should be 18',
                    subtextStyle: {
                        fontSize: 18
                    }
                }
            }
        }, {
            name: 'should display larger fontSize',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'larger font size, 30',
                    subtextStyle: {
                        fontSize: 30
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'larger font size, 30',
                    subtextStyle: {
                        fontSize: 18
                    }
                }
            }
        }, {
            name: 'should display smaller fontSize',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    subtext: 'smaller font size, 12',
                    subtextStyle: {
                        fontSize: 12
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    subtext: 'smaller font size, 12',
                    subtextStyle: {
                        fontSize: 18
                    }
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('title.subtextStyle', suites);

});
