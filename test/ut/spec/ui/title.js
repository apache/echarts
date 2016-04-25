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
            name: 'should have default itemGap as 5px',
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
                    itemGap: 5
                }
            }
        }]
    }];

    uiHelper.testOptionSpec('title', suites);

});
