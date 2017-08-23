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
        }, {
            name: 'should display italic not as normal',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'italic vs. normal',
                    textStyle: {
                        fontStyle: 'italic'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'italic vs. normal',
                    textStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontWeight',
        cases: [{
            name: 'should display default bolder font weight by default',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'bolder font'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'bolder font',
                    textStyle: {
                        fontWeight: 'bolder'
                    }
                }
            }
        }, {
            name: 'should display bold font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'bold font vs. normal font',
                    textStyle: {
                        fontStyle: 'bold'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'bold font vs. normal font',
                    textStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }, {
            name: 'should display normal font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'bolder font vs. normal font',
                    textStyle: {
                        fontStyle: 'normal'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'bolder font vs. normal font',
                    textStyle: {
                        fontStyle: 'bold'
                    }
                }
            }
        }, {
            name: 'should display light font weight',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'light font vs. normal font',
                    textStyle: {
                        fontStyle: 'light'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'light font vs. normal font',
                    textStyle: {
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
                    text: '100 font vs. normal font',
                    textStyle: {
                        fontStyle: '100'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: '100 font vs. normal font',
                    textStyle: {
                        fontStyle: 'normal'
                    }
                }
            }
        }]
    }, {
        name: 'textStyle.fontFamily',
        cases: [{
            name: 'should display default fontFamily as sans-serif',
            test: 'equalOption',
            option1: {
                series: [],
                title: {
                    text: 'sans-serif'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'sans-serif',
                    fontFamily: 'sans-serif'
                }
            }
        }, {
            name: 'should display default fontFamily as Arial',
            test: 'notEqualOption',
            option1: {
                series: [],
                title: {
                    text: 'Arial vs. sans-serif',
                    textStyle: {
                        fontFamily: 'Arial'
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'Arial vs. sans-serif',
                    fontFamily: 'sans-serif'
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
                    text: 'default font size, should be 18'
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'default font size, should be 18',
                    textStyle: {
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
                    text: 'larger font size, 30',
                    textStyle: {
                        fontSize: 30
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'larger font size, 30',
                    textStyle: {
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
                    text: 'smaller font size, 12',
                    textStyle: {
                        fontSize: 12
                    }
                }
            },
            option2: {
                series: [],
                title: {
                    text: 'smaller font size, 12',
                    textStyle: {
                        fontSize: 18
                    }
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('title.textStyle', suites);

});
