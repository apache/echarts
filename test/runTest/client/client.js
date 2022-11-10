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

// const LOCAL_SAVE_KEY = 'visual-regression-testing-config';

function getChangedObject(target, source) {
    let changedObject = {};
    Object.keys(source).forEach(key => {
        if (target[key] !== source[key]) {
            changedObject[key] = source[key];
        }
    });
    return changedObject;
}

function parseParams(str) {
    if (!str) {
        return {};
    }
    const parts = str.split('&');
    const params = {};
    parts.forEach((part) => {
        const kv = part.split('=');
        params[kv[0]] = decodeURIComponent(kv[1]);
    });
    return params;
}

function assembleParams(paramsObj) {
    const paramsArr = [];
    Object.keys(paramsObj).forEach((key) => {
        let val = paramsObj[key];
        paramsArr.push(key + '=' + encodeURIComponent(val));
    });
    return paramsArr.join('&');
}

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

        // To simplify the condition in sort
        test.actualErrors = test.actualErrors || [];
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

const urlRunConfig = {};
const urlParams = parseParams(window.location.search.substr(1))

// Save and restore
try {
    const runConfig = JSON.parse(urlParams.runConfig);
    Object.assign(urlRunConfig, runConfig);
}
catch (e) {}

const app = new Vue({
    el: '#app',
    data: {
        fullTests: [],
        currentTestName: urlParams.test || '',
        searchString: '',
        running: false,

        allSelected: false,
        lastSelectedIndex: -1,

        expectedVersionsList: [],
        actualVersionsList: [],

        loadingVersion: false,

        showIframeDialog: false,
        previewIframeSrc: '',
        previewTitle: '',

        // List of all runs.
        showRunsDialog: false,
        testsRuns: [],
        loadingTestsRuns: false,

        pageInvisible: false,

        runConfig: Object.assign({
            sortBy: 'name',

            isActualNightly: false,
            isExpectedNightly: false,
            actualVersion: 'local',
            expectedVersion: null,

            renderer: 'canvas',
            useCoarsePointer: 'auto',
            threads: 4
        }, urlRunConfig)
    },

    mounted() {
        // Sync config from server when first time open
        // or switching back
        socket.emit('syncRunConfig', {
            runConfig: this.runConfig,
            // Override server config from URL.
            forceSet: Object.keys(urlRunConfig).length > 0
        });
        socket.on('syncRunConfig_return', res => {
            this.expectedVersionsList = res.expectedVersionsList;
            this.actualVersionsList = res.actualVersionsList;
            // Only assign on changed object to avoid unnecessary vue change.
            Object.assign(this.runConfig, getChangedObject(this.runConfig, res.runConfig));

            updateUrl();
        });

        setTimeout(() => {
            this.scrollToCurrent();
        }, 500);

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === 'visible') {
                this.pageInvisible = false;
                socket.emit('syncRunConfig', {});
            }
            else {
                this.pageInvisible = true;
            }
        });
    },

    computed: {
        finishedPercentage() {
            let finishedCount = 0;
            this.fullTests.forEach(test => {
                if (test.status === 'finished') {
                    finishedCount++;
                }
            });
            return +(finishedCount / this.fullTests.length * 100).toFixed(1) || 0;
        },

        tests() {
            let sortFunc = this.runConfig.sortBy === 'name'
                ? (a, b) => a.name.localeCompare(b.name)
                : (a, b) => {
                    if (a.actualErrors.length === b.actualErrors.length) {
                        if (a.percentage === b.percentage) {
                            return a.name.localeCompare(b.name);
                        }
                        else {
                            return a.percentage - b.percentage;
                        }
                    }
                    return b.actualErrors.length - a.actualErrors.length;
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
            // Only run visible tests.
            return this.tests.filter(test => {
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

    watch: {
        'runConfig.sortBy'() {
            setTimeout(() => {
                this.scrollToCurrent();
            }, 100);
        },

        'currentTestName'(newVal, oldVal) {
            updateUrl();
        }
    },

    methods: {
        scrollToCurrent() {
            const el = document.querySelector(`.test-list>li[title="${this.currentTestName}"]`);
            if (el) {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        },

        changeTest(target, testName) {
            if (!target.matches('input[type="checkbox"]') && !target.matches('.el-checkbox__inner')) {
                app.currentTestName = testName;
            }
        },
        toggleSort() {
            this.runConfig.sortBy = this.runConfig.sortBy === 'name' ? 'percentage' : 'name';
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
        runSingleTest(testName, noHeadless) {
            runTests([testName], noHeadless);
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
            runTests(tests.map(test => test.name), false);
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
            if (test.useCoarsePointer) {
                searches.push('__COARSE__POINTER__=true');
            }
            let src = test.fileUrl;
            if (searches.length) {
                src = src + '?' + searches.join('&');
            }
            this.previewIframeSrc = `../../${src}`;
            this.previewTitle = src;
            this.showIframeDialog = true;
        },

        showAllTestsRuns() {
            this.showRunsDialog = true;
            this.loadingTestsRuns = true;
            socket.emit('getAllTestsRuns');
        },

        switchTestsRun(runResult) {
            this.runConfig.expectedVersion = runResult.expectedVersion;
            this.runConfig.actualVersion = runResult.actualVersion;
            // TODO
            this.runConfig.isExpectedNightly = runResult.expectedVersion.includes('-dev.');
            this.runConfig.isActualNightly = runResult.actualVersion.includes('-dev.');
            this.runConfig.renderer = runResult.renderer;
            this.runConfig.useCoarsePointer = runResult.useCoarsePointer;

            this.showRunsDialog = false;
        },

        genTestsRunReport(runResult) {
            socket.emit('genTestsRunReport', runResult);
        },

        delTestsRun(runResult) {
            app.$confirm('Are you sure to delete this run?', 'Warn', {
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                center: true
            }).then(value => {
                const idx = this.testsRuns.indexOf(runResult);
                if (idx >= 0) {
                    this.testsRuns.splice(idx, 1);
                }
                socket.emit('delTestsRun', {
                    id: runResult.id
                });
            }).catch(() => {});
        },

        open(url, target) {
            window.open(url, target);
        }
    }
});

function runTests(tests, noHeadless) {
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
        useCoarsePointer: app.runConfig.useCoarsePointer,
        noHeadless,
        replaySpeed: noHeadless ? 5 : 5
    });
}


socket.on('connect', () => {
    console.log('Connected');
});

let firstUpdate = true;
socket.on('update', msg => {
    app.$el.style.display = 'block';

    // let hasFinishedTest = !!msg.tests.find(test => test.status === 'finished');
    // if (!hasFinishedTest && firstUpdate) {
    //     app.$confirm('You haven\'t run any test on these two versions yet!<br />Do you want to start now?', 'Tip', {
    //         confirmButtonText: 'Yes',
    //         cancelButtonText: 'No',
    //         dangerouslyUseHTMLString: true,
    //         center: true
    //     }).then(value => {
    //         runTests(msg.tests.map(test => test.name));
    //     }).catch(() => {});
    // }

    // TODO
    app.running = !!msg.running;
    app.fullTests = processTestsData(msg.tests, app.fullTests);

    if (!app.currentTestName) {
        app.currentTestName = app.fullTests[0].name;
    }

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

socket.on('getAllTestsRuns_return', res => {
    app.testsRuns = res.runs;
    app.loadingTestsRuns = false;
});
socket.on('genTestsRunReport_return', res => {
    window.open(res.reportUrl, '_blank');
});

function updateUrl() {
    const searchUrl = assembleParams({
        test: app.currentTestName,
        runConfig: JSON.stringify(app.runConfig)
    });
    history.pushState({}, '', location.pathname + '?' + searchUrl);
}

// Only update url when version is changed.
app.$watch('runConfig', (newVal, oldVal) => {
    if (!app.pageInvisible) {
        socket.emit('syncRunConfig', {
            runConfig: app.runConfig,
            // Override server config from URL.
            forceSet: true
        });
    }
}, { deep: true });