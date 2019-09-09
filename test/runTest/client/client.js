const socket = io('/client');

function processTestsData(tests, oldTestsData) {
    tests.forEach((test, idx) => {
        let passed = 0;
        test.index = idx;
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
            test.summary = 'warning';
        }

        // Keep select status not change.
        if (oldTestsData && oldTestsData[idx]) {
            test.selected = oldTestsData[idx].selected;
        }
        else {
            test.selected = false;
        }
    });
    return tests;
}

const app = new Vue({
    el: '#app',
    data: {
        fullTests: [],
        currentTestName: '',
        sortBy: 'name',
        searchString: '',
        running: false,

        allSelected: false,
        lastSelectedIndex: -1,

        runConfig: {
            noHeadless: false,
            replaySpeed: 5,
            threads: 1
        }
    },
    computed: {
        tests() {
            let sortFunc = this.sortBy === 'name'
                ? (a, b) => a.name.localeCompare(b.name)
                : (a, b) => {
                    if (a.percentage === b.percentage) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.percentage - b.percentage;
                };

            if (!this.searchString) {
                // Not modify the original tests data.
                return this.fullTests.slice().sort(sortFunc);
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

        currentTestUrl() {
            return window.location.origin + '/test/' + this.currentTestName + '.html';
        },

        currentTestRecordUrl() {
            return window.location.origin + '/test/runTest/recorder/index.html#' + this.currentTestName;
        },

        isSelectAllIndeterminate: {
            get() {
                if (!this.tests.length) {
                    return true;
                }
                return this.tests.some(test => {
                    return test.selected !== this.tests[0].selected;
                });
            },
            set() {}
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
        handleSelect(idx) {
            Vue.nextTick(() => {
                this.lastSelectedIndex = idx;
            });
        },
        handleShiftSelect(idx) {
            if (this.lastSelectedIndex < 0) {
                return;
            }
            let start = Math.min(this.lastSelectedIndex, idx);
            let end = Math.max(this.lastSelectedIndex, idx);
            let selected = !this.tests[idx].selected;   // Will change
            for (let i = start; i < end; i++) {
                this.tests[i].selected = selected;
            }
        },
        refreshList() {

        },
        runTest(testName) {
            runTests([testName]);
        },
        runSelectedTests() {
            const tests = this.fullTests.filter(test => {
                return test.selected;
            }).map(test => {
                return test.name;
            });
            runTests(tests);
        },
        stopTests() {
            this.running = false;
            socket.emit('stop');
        }
    }
});

function runTests(tests) {
    if (tests.length > 0) {
        app.running = true;
        socket.emit('run', {
            tests,
            threads: app.runConfig.threads,
            noHeadless: app.runConfig.noHeadless,
            replaySpeed: app.runConfig.noHeadless
                ? app.runConfig.replaySpeed
                : 5 // Force run at 5x speed
        });
    }
    else {
        app.$notify({
            title: 'No test selected.',
            position: 'top-right'
        });
    }
}


socket.on('connect', () => {
    console.log('Connected');

    app.$el.style.display = 'block';

    let firstUpdate = true;
    socket.on('update', msg => {
        let hasFinishedTest = !!msg.tests.find(test => test.status === 'finished');
        if (!hasFinishedTest && firstUpdate) {
            app.$confirm('It seems you haven\'t run any test yet!<br />Do you want to start now?', 'Tip', {
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                dangerouslyUseHTMLString: true,
                center: true
            }).then(value => {
                runTests(msg.tests.map(test => test.name));
            }).catch(() => {});
        }
        // TODO
        // app.running = !!msg.running;
        app.fullTests = processTestsData(msg.tests, app.fullTests);

        firstUpdate = false;
    });
    socket.on('finish', res => {
        app.$notify({
            type: 'success',
            title: `${res.count} test complete`,
            message: `Cost: ${(res.time / 1000).toFixed(1)} s. Threads: ${res.threads}`,
            position: 'top-right',
            duration: 8000
        });
        console.log(`${res.count} test complete, Cost: ${(res.time / 1000).toFixed(1)} s. Threads: ${res.threads}`);
        app.running = false;
    });

    function updateTestHash() {
        app.currentTestName = window.location.hash.slice(1);
    }

    updateTestHash();
    window.addEventListener('hashchange', updateTestHash);
});

