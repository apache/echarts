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
    }];

    uiHelper.testOptionSpec('title', suites);

});
