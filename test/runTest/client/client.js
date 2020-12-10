/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

const socket = io('/client');
const LOCAL_SAVE_KEY = 'visual-regression-testing-config';

function processTestsData(tests, oldTestsData) {
    tests.forEach((test, idx) => {
        let passed = 0;
        test.index = idx;
        test.results.forEach(result => {
            // Threshold?
            if (result.diffRatio < 0.0001) {
                passed++;
            }
            let timestamp = test.lastRun || 0;
            result.diff = result.diff + '?' + timestamp;
            result.actual = result.actual + '?' + timestamp;
            result.expected = result.expected + '?' + timestamp;
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

        versions: [],

        showIframeDialog: false,
        previewIframeSrc: '',
        previewTitle: '',

        runConfig: {
            noHeadless: false,
            replaySpeed: 5,
            actualVersion: 'local',
            expectedVersion: null,
            renderer: 'canvas',
            threads: 1
        }
    },
    computed: {
        tests() {
            let sortFunc = this.sortBy === 'name'
                ? (a, b) => a.name.localeCompare(b.name)
                : (a, b) => {
                    if (a.percentage === b.percentage) {
                        if (a.actualErrors && b.actualErrors) {
                            if (a.actualErrors.length === b.actualErrors.length) {
                                return a.name.localeCompare(b.name);
                            }
                            else {
                                return b.actualErrors.length - a.actualErrors.length;
                            }
                        }
                        else {
                            return a.name.localeCompare(b.name);
                        }
                    }
                    return a.percentage - b.percentage;
                };

            if (!this.searchString) {
                // Not modify the original tests data.
                return this.fullTests.slice().sort(sortFunc);
            }

            let searchString = this.searchString.toLowerCase();
            return this.fullTests.filter(test => {
                return test.name.toLowerCase().match(searchString);
            }).sort(sortFunc);
        },

        selectedTests() {
            return this.fullTests.filter(test => {
                return test.selected;
            });
        },
        unfinishedTests() {
            return this.fullTests.filter(test => {
                return test.status !== 'finished';
            });
        },
        failedTests() {
            return this.fullTests.filter(test => {
                return test.status === 'finished' && test.summary !== 'success';
            });
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
        runSingleTest(testName) {
            runTests([testName]);
        },
        run(runTarget) {
            let tests;
            if (runTarget === 'selected') {
                tests = this.selectedTests;
            }
            else if (runTarget === 'unfinished') {
                tests = this.unfinishedTests;
            }
            else if (runTarget === 'failed') {
                tests = this.failedTests;
            }
            else {
                tests = this.fullTests;
            }
            runTests(tests.map(test => test.name));
        },
        stopTests() {
            this.running = false;
            socket.emit('stop');
        },

        preview(test, version) {
            let searches = [];

            let ecVersion = test[version + 'Version'];
            if (ecVersion !== 'local') {
                searches.push('__ECDIST__=' + ecVersion);
            }
            if (test.useSVG) {
                searches.push('__RENDERER__=svg');
            }
            let src = test.fileUrl;
            if (searches.length) {
                src = src + '?' + searches.join('&');
            }
            this.previewIframeSrc = `../../${src}`;
            this.previewTitle = src;
            this.showIframeDialog = true;
        }
    }
});

// Save and restore
try {
    Object.assign(app.runConfig, JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)));
}
catch (e) {}
app.$watch('runConfig', () => {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(app.runConfig));
}, {deep: true});

function runTests(tests) {
    if (!tests.length) {
        app.$notify({
            title: 'No test selected.',
            position: 'top-right'
        });
        return;
    }
    if (!app.runConfig.expectedVersion || !app.runConfig.actualVersion) {
        app.$notify({
            title: 'No echarts version selected.',
            position: 'top-right'
        });
        return;
    }
    app.running = true;
    socket.emit('run', {
        tests,
        expectedVersion: app.runConfig.expectedVersion,
        actualVersion: app.runConfig.actualVersion,
        threads: app.runConfig.threads,
        renderer: app.runConfig.renderer,
        noHeadless: app.runConfig.noHeadless,
        replaySpeed: app.runConfig.noHeadless
            ? app.runConfig.replaySpeed
            : 5 // Force run at 5x speed
    });
}


socket.on('connect', () => {
    console.log('Connected');

    app.$el.style.display = 'block';
});

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
    app.running = !!msg.running;
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
socket.on('abort', res => {
    app.$notify({
        type: 'info',
        title: `Aborted`,
        duration: 4000
    });
    app.running = false;
});
socket.on('versions', versions => {
    app.versions = versions.filter(version => {
        return !version.startsWith('2.');
    }).reverse();
    if (!app.runConfig.expectedVersion) {
        app.runConfig.expectedVersion = app.versions[0];
    }
    app.versions.unshift('local');
});

function updateTestHash() {
    app.currentTestName = window.location.hash.slice(1);
}
updateTestHash();
window.addEventListener('hashchange', updateTestHash);