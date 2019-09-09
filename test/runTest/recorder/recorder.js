const socket = io('/recorder');

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
    }
}

function keyboardRecordingHandler(e) {
    if (e.key.toLowerCase() === 'r' && e.shiftKey) {
        if (!app.recordingAction) {
            // Create a new action if currentAction has ops.
            if (!app.currentAction || app.currentAction.ops.length > 0) {
                app.newAction();
            }

            app.recordingAction = app.currentAction;
            if (app.recordingAction) {
                let $iframe = getIframe();
                app.recordingAction.scrollY = $iframe.contentWindow.scrollY;
                app.recordingAction.scrollX = $iframe.contentWindow.scrollX;
                app.recordingAction.timestamp = Date.now();

                app.recordingTimeElapsed = 0;
            }
        }
        else {
            app.recordingAction = null;
            saveData();
        }
        // Get scroll
    }
    else if (e.key.toLowerCase() === 's' && e.shiftKey) {
        if (app.recordingAction) {
            app.recordingAction.ops.push({
                type: 'screenshot',
                time: Date.now() - app.recordingAction.timestamp
            });
            app.$notify.info({
                title: 'screenshot',
                position: 'top-left',
                customClass: 'op-notice'
            });
        }
    }
}

function recordIframeEvents(iframe, app) {
    let innerDocument = iframe.contentWindow.document;

    function addMouseOp(type, e) {
        if (app.recordingAction) {
            let time = Date.now() - app.recordingAction.timestamp;
            app.recordingAction.ops.push({
                type,
                time: time,
                x: e.clientX,
                y: e.clientY
            });
            if (type === 'mouseup' && app.config.screenshotAfterMouseUp) {
                app.recordingAction.ops.push({
                    time: time + 1, // TODO, Add delay time?
                    delay: app.config.screenshotDelay,
                    type: 'screenshot-auto'
                });
            }
            app.$notify.info({
                title: type,
                message: `(x: ${e.clientX}, y: ${e.clientY})`,
                position: 'top-left',
                customClass: 'op-notice'
            });
        }
    }

    innerDocument.addEventListener('keyup', keyboardRecordingHandler);

    innerDocument.body.addEventListener('mousemove', _.throttle(e => {
        addMouseOp('mousemove', e);
    }, 200), true);

    ['mouseup', 'mousedown'].forEach(eventType => {
        innerDocument.body.addEventListener(eventType, e => {
            addMouseOp(eventType, e);
        }, true);
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
        console.log('loaded:' + app.currentTestName);
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