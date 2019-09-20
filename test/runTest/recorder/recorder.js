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

const socket = io('/recorder');

function getNthChild(el) {
    let i = 1;
    let elTagName = el.tagName;
    let elClassName = el.className;
    while (el.previousSibling) {
        el = el.previousSibling;
        if (el.tagName === elTagName && el.className === elClassName) { // TODO extra space in class name?
            i++;
        }
    }
    return i;
}
function getUniqueSelector(el) {
    if (el.tagName.toLowerCase() === 'body') {
        return '';
    }
    let selector = '';
    if (el.id) {
        // id has highest priority.
        return el.id;
    }
    else {
        selector = el.tagName.toLowerCase();
        for (let className of el.classList) {
            selector += '.' + className;
        }
        let idx = getNthChild(el);
        if (idx > 1) {
            selector += `:nth-child(${idx})`;
        }
    }
    let parentSelector = el.parentNode && getUniqueSelector(el.parentNode);
    if (parentSelector) {
        selector = parentSelector + '>' + selector;
    }
    return selector;
}

const app = new Vue({
    el: '#app',
    data: {
        tests: [],

        currentTestName: '',
        actions: [],
        currentAction: null,
        recordingAction: null,

        recordingTimeElapsed: 0,

        config: {
            screenshotAfterMouseUp: true,
            screenshotDelay: 400
        },

        drawerVisible: true
    },
    computed: {
        url() {
            if (!this.currentTestName) {
                return '';
            }
            return window.location.origin + '/test/' + this.currentTestName + '.html';
        }
    },
    methods: {
        refreshPage() {
            const $iframe = getIframe();
            if ($iframe.contentWindow) {
                $iframe.contentWindow.location.reload();
            }
        },
        newAction() {
            this.currentAction = {
                name: 'Action ' + (this.actions.length + 1),
                ops: []
            };
            this.actions.push(this.currentAction);
        },
        select(actionName) {
            this.currentAction = this.actions.find(action => {
                return action.name === actionName;
            });
            if (this.currentAction) {
                const $iframe = getIframe();
                if ($iframe.contentWindow) {
                    $iframe.contentWindow.scrollTo({
                        left: this.currentAction.scrollX,
                        top: this.currentAction.scrollY,
                        behavior: 'smooth'
                    });
                }
            }
        },

        doDelete(actionName) {
            app.$confirm('Aure you sure?', 'Delete this action', {
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                type: 'warning'
            }).then(() => {
                this.deletePopoverVisible = false;
                let idx = _.findIndex(this.actions, action => action.name === actionName);
                if (idx >= 0) {
                    if (this.currentAction === this.actions[idx]) {
                        this.currentAction = this.actions[idx + 1] || this.actions[idx - 1];
                    }
                    this.actions.splice(idx, 1);
                    saveData();
                }
            }).catch(e => {});
        },

        clearOps(actionName) {
            app.$confirm('Aure you sure?', 'Clear this action', {
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                type: 'warning'
            }).then(() => {
                this.deletePopoverVisible = false;
                let action = this.actions.find(action => action.name === actionName);
                if (action) {
                    action.ops = [];
                }
                saveData();
            }).catch(e => {});
        },

        run() {
            socket.emit('runSingle', {
                testName: app.currentTestName
            });
        }
    }
});

let time = Date.now();
function updateTime() {
    let dTime = Date.now() - time;
    time += dTime;
    if (app.recordingAction) {
        app.recordingTimeElapsed += dTime;
    }
    requestAnimationFrame(updateTime);
}
requestAnimationFrame(updateTime);

function getIframe() {
    return document.body.querySelector('#test-view');
}

function saveData() {
    // Save
    if (app.currentTestName) {
        socket.emit('saveActions', {
            testName: app.currentTestName,
            actions: app.actions
        });

        let test = app.tests.find(testOpt => testOpt.name === app.currentTestName);
        test.actions = app.actions.length;
    }
}

function getEventTime() {
    return Date.now() - app.recordingAction.timestamp;
}
function notify(title, message) {
    app.$notify.info({
        title,
        message,
        position: 'top-left',
        customClass: 'op-notice'
    });
}

function keyboardRecordingHandler(e) {
    if (e.key.toLowerCase() === 'r' && e.shiftKey) {
        let $iframe = getIframe();
        if (!app.recordingAction) {
            // Create a new action if currentAction has ops.
            if (!app.currentAction || app.currentAction.ops.length > 0) {
                app.newAction();
            }

            app.recordingAction = app.currentAction;
            if (app.recordingAction) {
                app.recordingAction.scrollY = $iframe.contentWindow.scrollY;
                app.recordingAction.scrollX = $iframe.contentWindow.scrollX;
                app.recordingAction.timestamp = Date.now();

                app.recordingTimeElapsed = 0;
            }
        }
        else {
            if (app.recordingAction &&
                (app.recordingAction.scrollY !== $iframe.contentWindow.scrollY
             || app.recordingAction.scrollX !== $iframe.contentWindow.scrollX)) {
                app.recordingAction.ops = [];
                app.$alert('You can\'t scroll the page during the action recording. Please create another action after scrolled to the next demo.', 'Recording Fail', {
                    confirmButtonText: 'Get!'
                });

            }
            else {
                saveData();
            }
            app.recordingAction = null;
        }
        // Get scroll
    }
    else if (e.key.toLowerCase() === 's' && e.shiftKey) {
        if (app.recordingAction) {
            app.recordingAction.ops.push({
                type: 'screenshot',
                time: getEventTime()
            });
            notify('screenshot', '');
        }
    }
}

function sign(value) {
    return value > 0 ? 1 : -1;
}

function recordIframeEvents(iframe, app) {
    let innerDocument = iframe.contentWindow.document;


    function addMouseOp(type, e) {
        if (app.recordingAction) {
            let time = getEventTime();
            let op = {
                type,
                time: time,
                x: e.clientX,
                y: e.clientY
            };
            app.recordingAction.ops.push(op);
            if (type === 'mousewheel') {
                // TODO Sreenshot after mousewheel?
                op.deltaY = e.deltaY;

                // In a reversed direction.
                // When creating WheelEvent, the sign of wheelData and deltaY are same
                if (sign(e.wheelDelta) !== sign(e.deltaY)) {
                    op.deltaY = -op.deltaY;
                }
            }
            if (type === 'mouseup' && app.config.screenshotAfterMouseUp) {
                // Add a auto screenshot after mouseup
                app.recordingAction.ops.push({
                    time: time + 1,
                    delay: app.config.screenshotDelay,
                    type: 'screenshot-auto'
                });
            }
            notify(type, `(x: ${e.clientX}, y: ${e.clientY})`);
        }
    }

    innerDocument.addEventListener('keyup', keyboardRecordingHandler);

    let preventRecordingFollowingMouseEvents = false;
    innerDocument.body.addEventListener('mousemove', _.throttle(e => {
        if (!preventRecordingFollowingMouseEvents) {
            addMouseOp('mousemove', e);
        }
    }, 200), true);
    innerDocument.body.addEventListener('mousedown', e => {
        // Can't recording mouse event on select.
        // So just prevent it and add a specific 'select' change event.
        if (e.target.tagName.toLowerCase() === 'select') {
            preventRecordingFollowingMouseEvents = true;
            return;
        }
        addMouseOp('mousedown', e);
    }, true);
    innerDocument.body.addEventListener('mouseup', e => {
        if (!preventRecordingFollowingMouseEvents) {
            addMouseOp('mouseup', e);
        }
        preventRecordingFollowingMouseEvents = false;
    }, true);
    iframe.contentWindow.addEventListener('mousewheel', e => {
        addMouseOp('mousewheel', e);
    }, true);


    innerDocument.body.addEventListener('change', e => {
        if (app.recordingAction) {
            let selector = getUniqueSelector(e.target);
            let time = getEventTime();
            let commonData = {
                type: 'valuechange',
                selector,
                value: e.target.value,
                time: time
            };
            if (e.target.tagName.toLowerCase() === 'select') {
                commonData.target = 'select';
                notify('valuechange', `select(${commonData.value})`);
            }
            if (commonData.target) {
                app.recordingAction.ops.push(commonData);

                if (app.config.screenshotAfterMouseUp) {
                    // Add a auto screenshot after mouseup
                    app.recordingAction.ops.push({
                        time: time + 1,
                        delay: app.config.screenshotDelay,
                        type: 'screenshot-auto'
                    });
                }
            }
        }
    });
}


function init() {
    app.$el.style.display = 'block';

    document.addEventListener('keyup', keyboardRecordingHandler);

    socket.on('updateActions', data => {
        if (data.testName === app.currentTestName) {
            app.actions = data.actions;
            if (!app.currentAction) {
                app.currentAction = app.actions[0];
            }
        }
    });
    socket.on('getTests', ({tests}) => {
        app.tests = tests;
    });

    let $iframe = getIframe();
    $iframe.onload = () => {
        recordIframeEvents($iframe, app);
    };

    function updateTestHash() {
        app.currentTestName = window.location.hash.slice(1);
        // Reset
        app.actions = [];
        app.currentAction = null;
        app.recordingAction = null;

        socket.emit('changeTest', {testName: app.currentTestName});

    }
    updateTestHash();
    window.addEventListener('hashchange', updateTestHash);
}

socket.on('connect', () => {
    console.log('Connected');
    init();
});