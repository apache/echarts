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

let handlingSourceChange = false;

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

function shouldShowMarkAsExpected(test, expectedSource, expectedVersion) {
    if (expectedSource === 'release' && (expectedVersion !== test.expectedVersion)
        || !test.markedAsExpected
    ) {
        return false;
    }
    if (expectedSource !== 'release' && test.markedAsExpected.length > 0) {
        return true;
    }

    for (let i = 0; i < test.markedAsExpected.length; i++) {
        if (test.markedAsExpected[i].lastVersion === expectedVersion) {
            return true;
        }
    }
    return false;
}

function processTestsData(tests, oldTestsData, expectedSource, expectedVersion) {
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
        else if (shouldShowMarkAsExpected(test, expectedSource, expectedVersion)) {
            test.summary = 'markedAsExpected';
        }
        else if (test.percentage < 50) {
            test.summary = 'exception';
        }
        else {
            test.summary = 'warning';
        }

        // To simplify the condition in sort
        test.actualErrors = test.actualErrors || [];

        // Format date for marks display
        if (test.markedAsExpected) {
            test.markedAsExpected.forEach(mark => {
                if (mark.markTime && !mark.markTimeFormatted) {
                    mark.markTimeFormatted = formatDate(mark.markTime);
                }
            });
        }

        // Keep select status not change.
        if (oldTestsData && oldTestsData[idx]) {
            test.selected = oldTestsData[idx].selected;
            // Keep source information
            test.expectedSource = oldTestsData[idx].expectedSource;
            test.actualSource = oldTestsData[idx].actualSource;

            // If old data has markedAsExpected but new data doesn't, keep the old data.
            if (oldTestsData[idx].markedAsExpected && !test.markedAsExpected) {
                test.markedAsExpected = oldTestsData[idx].markedAsExpected;
            }

            // Ensure markedAsExpected is null when it's empty
            if (test.markedAsExpected && Array.isArray(test.markedAsExpected) && test.markedAsExpected.length === 0) {
                test.markedAsExpected = null;
            }
        }
        else {
            test.selected = false;
            // Initialize source information
            test.expectedSource = app.runConfig.expectedSource;
            test.actualSource = app.runConfig.actualSource;
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

function getVersionFromSource(source, versions, nightlyVersions) {
    if (source === 'PR') {
        // Default PR version can be empty since it needs to be manually selected
        return '#';
    }
    else if (source === 'nightly') {
        return nightlyVersions.length ? nightlyVersions[0] : null;
    }
    else if (source === 'local') {
        return 'local';
    }
    else {
        return versions.length ? versions[0] : null;
    }
}

const app = new Vue({
    el: '#app',
    data: {
        fullTests: [],
        currentTestName: urlParams.test || '',
        searchString: '',
        running: false,

        allSelected: false,
        lastSelectedIndex: -1,

        loadingVersion: false,

        showIframeDialog: false,
        previewIframeSrc: '',
        previewTitle: '',

        // List of all runs.
        showRunsDialog: false,
        testsRuns: [],
        loadingTestsRuns: false,

        pageInvisible: false,

        versions: [],
        nightlyVersions: [],
        prVersions: [],
        branchVersions: [],

        runConfig: Object.assign({
            sortBy: 'name',
            actualVersion: null,
            expectedVersion: null,
            expectedSource: 'release',
            actualSource: 'local',
            renderer: 'canvas',
            useCoarsePointer: 'auto',
            threads: 4,
            theme: 'none'
        }, urlRunConfig),

        userMeta: null,

        // Mark as expected form values
        linkValue: '',
        commentValue: '',
        selectedType: 'New Feature'
    },

    async mounted() {
        socket.on('userMeta', meta => {
            this.userMeta = meta;
        });
        socket.emit('getUserMeta');

        socket.on('updateTestsList', testsList => {
            this.updateTestsList(testsList);
        });

        // Add call to fetch branches
        await this.fetchBranchVersions();

        // Sync config from server when first time open
        // or switching back
        socket.emit('syncRunConfig', {
            runConfig: this.runConfig,
            // Override server config from URL.
            forceSet: Object.keys(urlRunConfig).length > 0
        });
        socket.on('syncRunConfig_return', res => {
            this.versions = res.versions || [];
            this.nightlyVersions = res.nightlyVersions || [];
            this.prVersions = res.prVersions || [];

            // Only set versions if they haven't been manually set
            handlingSourceChange = true;
            this.$nextTick(() => {
                if (!this.runConfig.expectedVersion) {
                    this.runConfig.expectedVersion = getVersionFromSource(
                        this.runConfig.expectedSource,
                        this.versions,
                        this.nightlyVersions
                    );
                }

                if (!this.runConfig.actualVersion) {
                    this.runConfig.actualVersion = getVersionFromSource(
                        this.runConfig.actualSource,
                        this.versions,
                        this.nightlyVersions
                    );
                }

                // Only apply other config changes from server
                const configWithoutVersions = { ...res.runConfig };
                delete configWithoutVersions.expectedVersion;
                delete configWithoutVersions.actualVersion;
                Object.assign(this.runConfig, getChangedObject(this.runConfig, configWithoutVersions));

                handlingSourceChange = false;
                updateUrl();
            });
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

        socket.on('run_error', err => {
            app.$notify({
                title: 'Error',
                message: err.message,
                type: 'error',
                duration: 5000
            });
            app.running = false;
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
                    if (a.summary === 'markedAsExpected' && b.summary !== 'markedAsExpected') {
                        return -1;
                    }
                    if (a.summary !== 'markedAsExpected' && b.summary === 'markedAsExpected') {
                        return 1;
                    }
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
        },

        expectedVersionsList() {
            switch (this.runConfig.expectedSource) {
                case 'release':
                    return this.versions;
                case 'nightly':
                    return this.nightlyVersions;
                case 'PR':
                    return this.prVersions;
                case 'local':
                    return ['local'];
                default:
                    return [];
            }
        },

        actualVersionsList() {
            switch (this.runConfig.actualSource) {
                case 'release':
                    return this.versions;
                case 'nightly':
                    return this.nightlyVersions;
                case 'PR':
                    return this.prVersions;
                case 'local':
                    return ['local'];
                default:
                    return [];
            }
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
        },

        'runConfig.expectedSource': {
            handler(newVal, oldVal) {
                if (newVal === oldVal) {
                    return;
                }

                handlingSourceChange = true;
                this.$nextTick(() => {
                    this.runConfig.expectedVersion = getVersionFromSource(
                        newVal,
                        this.versions,
                        this.nightlyVersions
                    );
                    handlingSourceChange = false;
                });
            },
            deep: false
        },

        'runConfig.actualSource': {
            handler(newVal, oldVal) {
                if (newVal === oldVal) {
                    return;
                }

                handlingSourceChange = true;
                this.$nextTick(() => {
                    this.runConfig.actualVersion = getVersionFromSource(
                        newVal,
                        this.versions,
                        this.nightlyVersions
                    );
                    handlingSourceChange = false;
                });
            },
            deep: false
        }
    },

    methods: {
        validateMarkExpected(lastVersion) {
            if (this.runConfig.expectedSource !== 'release') {
                return {
                    valid: true,
                    reason: 'Valid'
                }
            }
            if (lastVersion !== this.runConfig.expectedVersion) {
                return {
                    valid: false,
                    reason: 'Only valid when the expected version is ' + lastVersion
                };
            }
            return {
                valid: true,
                reason: 'Valid'
            };
        },

        getMarkRowClass(data) {
            if (this.validateMarkExpected(data.row.lastVersion).valid) {
                return '';
            }
            return 'faded-row';
        },

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
        markAsExpected() {
            if (!this.currentTest) {
                return;
            }
            this.showMarkAsExpectedDialog();
        },
        deleteMark(mark) {
            this.$confirm('Are you sure you want to delete this mark? This action cannot be undone.', 'Warning', {
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                type: 'warning'
            }).then(() => {
                socket.emit('deleteMark', {
                    testName: this.currentTest.name,
                    markTime: mark.markTime
                }, (err) => {
                    if (err) {
                        this.$message.error('Failed to delete: ' + err);
                        return;
                    }

                    if (this.currentTest && this.currentTest.markedAsExpected) {
                        if (Array.isArray(this.currentTest.markedAsExpected)) {
                            this.currentTest.markedAsExpected = this.currentTest.markedAsExpected.filter(
                                item => item.markTime !== mark.markTime
                            );

                            if (this.currentTest.markedAsExpected.length === 0) {
                                this.currentTest.markedAsExpected = null;
                            }
                        } else if (this.currentTest.markedAsExpected.markTime === mark.markTime) {
                            this.currentTest.markedAsExpected = null;
                        }
                    }

                    this.$message.success('Mark deleted successfully');
                });
            }).catch(() => {
                // User canceled
            });
        },
        showMarkAsExpectedDialog() {
            // Only initialize identity fields from user meta
            let markedBy = this.userMeta?.myGitHubId || '';
            let lastVersion = this.userMeta?.lastEChartsVersion || '';

            // Create our own custom dialog without using $prompt
            const h = this.$createElement;

            this.$msgbox({
                title: 'Mark Difference as Expected',
                message: h('div', { class: 'mark-expected-form' }, [
                    h('div', { class: 'form-item' }, [
                        h('div', { class: 'form-label' }, [
                            'Your GitHub ID: ',
                            h('span', { style: { color: '#F56C6C' } }, '*')
                        ]),
                        h('input', {
                            class: 'el-input__inner',
                            attrs: {
                                type: 'text',
                                placeholder: ''
                            },
                            domProps: {
                                value: markedBy
                            },
                            on: {
                                input: (e) => {
                                    markedBy = e.target.value;
                                    if (!this.userMeta) {
                                        this.userMeta = {
                                            myGitHubId: markedBy
                                        };
                                    }
                                    else {
                                        this.userMeta.myGitHubId = markedBy;
                                    }
                                }
                            }
                        })
                    ]),
                    h('div', { class: 'form-item' }, [
                        h('div', { class: 'form-label' }, [
                            'Last Version: ',
                            h('span', { style: { color: '#F56C6C' } }, '*')
                        ]),
                        h('input', {
                            class: 'el-input__inner',
                            attrs: {
                                type: 'text',
                                placeholder: '5.6.0'
                            },
                            domProps: {
                                value: lastVersion
                            },
                            on: {
                                input: (e) => {
                                        lastVersion = e.target.value;
                                    if (!this.userMeta) {
                                        this.userMeta = {
                                            lastEChartsVersion: lastVersion
                                        };
                                    }
                                    else {
                                        this.userMeta.lastEChartsVersion = lastVersion;
                                    }
                                }
                            }
                        })
                    ]),
                    h('div', { class: 'form-item type-selection' }, [
                        h('div', { class: 'form-label' }, [
                            'Type: ',
                            h('span', { style: { color: '#F56C6C' } }, '*')
                        ]),
                        h('div', { class: 'radio-group' }, [
                            h('label', { class: 'radio-label' }, [
                                h('input', {
                                    attrs: {
                                        type: 'radio',
                                        name: 'mark-type',
                                        value: 'New Feature',
                                        checked: this.selectedType === 'New Feature'
                                    },
                                    on: {
                                        change: (e) => {
                                            this.selectedType = e.target.value;
                                        }
                                    }
                                }),
                                ' New Feature'
                            ]),
                            h('label', { class: 'radio-label' }, [
                                h('input', {
                                    attrs: {
                                        type: 'radio',
                                        name: 'mark-type',
                                        value: 'Bug Fixing',
                                        checked: this.selectedType === 'Bug Fixing'
                                    },
                                    on: {
                                        change: (e) => {
                                            this.selectedType = e.target.value;
                                        }
                                    }
                                }),
                                ' Bug Fixing'
                            ]),
                            h('label', { class: 'radio-label' }, [
                                h('input', {
                                    attrs: {
                                        type: 'radio',
                                        name: 'mark-type',
                                        value: 'Others',
                                        checked: this.selectedType === 'Others'
                                    },
                                    on: {
                                        change: (e) => {
                                            this.selectedType = e.target.value;
                                        }
                                    }
                                }),
                                ' Others'
                            ])
                        ])
                    ]),
                    h('div', { class: 'form-item' }, [
                        h('div', { class: 'form-label' }, 'PR or commit link (optional but recommended):'),
                        h('input', {
                            class: 'el-input__inner link-input',
                            attrs: {
                                type: 'text',
                                placeholder: 'https://github.com/apache/echarts/pull/xxx'
                            },
                            domProps: {
                                value: this.linkValue
                            },
                            on: {
                                input: (e) => {
                                    this.linkValue = e.target.value;
                                }
                            }
                        })
                    ]),
                    h('div', { class: 'form-item' }, [
                        h('div', { class: 'form-label' }, 'Comment (optional):'),
                        h('textarea', {
                            class: 'el-textarea__inner comment-input',
                            style: { minHeight: '60px' },
                            domProps: {
                                value: this.commentValue
                            },
                            on: {
                                input: (e) => {
                                    this.commentValue = e.target.value;
                                }
                            }
                        })
                    ])
                ]),
                showCancelButton: true,
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
                customClass: 'mark-as-expected-dialog',
                beforeClose: (action, instance, done) => {
                    if (action === 'confirm') {
                        if (!this.selectedType) {
                            this.$message({
                                message: 'Please select a type',
                                type: 'error'
                            });
                            // Don't close the dialog
                            done(false);
                            return;
                        }

                        if (!markedBy) {
                            this.$message({
                                message: 'Please enter your GitHub ID',
                                type: 'error'
                            });
                            done(false);
                            return;
                        }

                        if (!lastVersion) {
                            this.$message({
                                message: 'Please enter the last version',
                                type: 'error'
                            });
                            done(false);
                            return;
                        }

                        if (this.linkValue && !(this.linkValue.startsWith('http://') || this.linkValue.startsWith('https://'))) {
                            this.$message({
                                message: 'Link must start with http:// or https://',
                                type: 'error'
                            });
                            done(false);
                            return;
                        }

                        // Use a variable to track if the callback has been called
                        let callbackCalled = false;

                        // Create a callback function with proper error handling
                        const handleMarkAsExpectedResponse = function(err) {
                            callbackCalled = true;

                            if (err) {
                                app.$notify({
                                    title: 'Error',
                                    message: err,
                                    type: 'error',
                                    duration: 5000
                                });
                                done(false);
                                return;
                            }

                            app.$notify({
                                title: 'Success',
                                message: 'Marked as expected',
                                type: 'success',
                                duration: 3000
                            });
                            done();
                        };

                        // Save user meta info for future use
                        socket.emit('saveUserMeta', {
                            myGitHubId: markedBy,
                            lastEChartsVersion: lastVersion
                        });

                        socket.emit('markAsExpected', {
                            testName: this.currentTest.name,
                            link: this.linkValue,
                            comment: this.commentValue,
                            type: this.selectedType,
                            markedBy: markedBy,
                            lastVersion: lastVersion,
                            markTime: new Date().getTime()
                        }, handleMarkAsExpectedResponse);

                        // Add a timeout to ensure the dialog closes even if callback is not called
                        setTimeout(() => {
                            if (!callbackCalled) {
                                console.error('Socket callback was not called after 5 seconds');
                                app.$notify({
                                    title: 'Warning',
                                    message: 'Operation may not have completed properly',
                                    type: 'warning',
                                    duration: 5000
                                });
                                done();
                            }
                        }, 5000);
                    } else {
                        done();
                    }
                }
            });
        },
        stopTests() {
            this.running = false;
            socket.emit('stop');
        },

        preview(test, version) {
            let searches = [];

            let ecVersion = test[version + 'Version'];
            let ecSource = test[version + 'Source'];
            if (ecVersion !== 'local') {
                let distPath = ecSource === 'PR'
                    ? 'pr-' + ecVersion.replace(/^#/, '')
                    : ecVersion;
                searches.push('__ECDIST__=' + distPath);
            }
            if (test.useSVG) {
                searches.push('__RENDERER__=svg');
            }
            if (test.useCoarsePointer) {
                searches.push('__COARSE__POINTER__=true');
            }
            if (test.theme && test.theme !== 'none' && ecVersion === 'local') {
                searches.push('__THEME__=' + test.theme);
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
            this.runConfig.renderer = runResult.renderer;
            this.runConfig.useCoarsePointer = runResult.useCoarsePointer;
            this.runConfig.theme = runResult.theme || 'none';

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
        },

        async fetchBranchVersions() {
            try {
                const response = await fetch('https://api.github.com/repos/apache/echarts/branches?per_page=100');
                const branches = await response.json();
                if (branches.length > 0) {
                    this.branchVersions = branches.map(branch => branch.name);
                }
                else {
                    this.branchVersions = [];
                }
            } catch (error) {
                console.error('Failed to fetch branches:', error);
                this.branchVersions = [];
            }
        },

        updateTestsList(testsList) {
            this.fullTests = processTestsData(testsList, this.fullTests, this.runConfig.expectedSource, this.runConfig.expectedVersion);

            if (!this.currentTestName && this.fullTests.length > 0) {
                this.currentTestName = this.fullTests[0].name;
            }

            if (this.currentTestName) {
                const currentTest = this.fullTests.find(test => test.name === this.currentTestName);
                if (!currentTest && this.fullTests.length > 0) {
                    this.currentTestName = this.fullTests[0].name;
                }
            }
        },
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
        expectedSource: app.runConfig.expectedSource,
        expectedVersion: app.runConfig.expectedVersion,
        actualSource: app.runConfig.actualSource,
        actualVersion: app.runConfig.actualVersion,
        threads: app.runConfig.threads,
        renderer: app.runConfig.renderer,
        useCoarsePointer: app.runConfig.useCoarsePointer,
        theme: app.runConfig.theme,
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
    app.fullTests = processTestsData(
        msg.tests,
        app.fullTests,
        app.runConfig.expectedSource,
        app.runConfig.expectedVersion
    );

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
    if (!app.pageInvisible && !handlingSourceChange) {
        socket.emit('syncRunConfig', {
            runConfig: app.runConfig,
            forceSet: true
        }, err => {
            if (err) {
                app.$notify({
                    title: 'Error',
                    message: err,
                    type: 'error',
                    duration: 5000
                });
            }
        });
    }
}, { deep: true });

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const pad = num => (num < 10 ? '0' + num : num);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}