const socket = io();

function processTestsData(tests) {
    tests.forEach(test => {
        let passed = 0;
        test.results.forEach(result => {
            // Threshold?
            if (result.diffRatio < 0.001) {
                passed++;
            }
        });
        test.percentage = passed === 0 ? 0 : Math.round(passed / test.results.length * 100);
        if (test.percentage === 100) {
            test.summary = 'success';
        }
        else if (test.percentage < 50) {
            test.summary = 'exception';
        }
        else {
            test.summary = 'warning'
        }
        test.selected = false;
    });
    return tests;
}

socket.on('connect', () => {
    console.log('Connected');
    const app = new Vue({
        el: '#app',
        data: {
            fullTests: [],
            currentTestName: '',
            sortBy: 'name',
            searchString: '',
            running: false,

            allSelected: false
        },
        computed: {
            tests() {
                let sortFunc = this.sortBy === 'name'
                    ? (a, b) => a.name.localeCompare(b.name)
                    : (a, b) => a.percentage - b.percentage;

                if (!this.searchString) {
                    return this.fullTests.sort(sortFunc);
                }

                return this.fullTests.filter(test => {
                    return test.name.match(this.searchString);
                }).sort(sortFunc);
            },

            currentTest() {
                let currentTest = this.fullTests.find(item => item.name === this.currentTestName);
                if (!currentTest) {
                    currentTest = this.fullTests[0];
                }
                return currentTest;
            },

            isSelectAllIndeterminate() {
                if (!this.tests.length) {
                    return true;
                }
                return this.tests.some(test => {
                    return test.selected !== this.tests[0].selected;
                });
            }
        },
        methods: {
            goto(url) {
                window.location.hash = '#' + url;
            },
            toggleSort() {
                this.sortBy = this.sortBy === 'name' ? 'percentage' : 'name';
            },
            handleSelectAllChange(val) {
                // Only select filtered tests.
                this.tests.forEach(test => {
                    test.selected = val;
                });
                this.isSelectAllIndeterminate = false;
            },
            runSelectedTests() {
                this.running = true;
                const tests = this.fullTests.filter(test => {
                    return test.selected;
                }).map(test => {
                    return test.name
                });
                if (tests.length > 0) {
                    socket.emit('run', tests);
                }
            },
            stopTests() {
                this.running = false;
                socket.emit('stop');
            }
        }
    });
    app.$el.style.display = 'block';

    socket.on('broadcast', msg => {
        app.fullTests = processTestsData(msg.tests);
    });

    function updateTestHash() {
        let testName = window.location.hash.slice(1);
        app.currentTestName = testName;
    }

    updateTestHash();
    window.addEventListener('hashchange', updateTestHash);
});

