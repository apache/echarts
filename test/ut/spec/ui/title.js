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
    }];

    uiHelper.testOptionSpec('title', suites);

});
