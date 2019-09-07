const socket = io('/recorder');

const app = new Vue({
    el: '#app',
    data: {
        tests: [],

        currentTestName: '',
        actions: [],
        currentAction: null,
        recordingAction: null,


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

        run() {
            socket.emit('runSingle', {
                testName: app.currentTestName
            });
        }
    }
});

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
            app.recordingAction = app.currentAction;
            if (app.recordingAction) {
                let $iframe = document.body.querySelector('iframe');
                app.recordingAction.ops = [];
                app.recordingAction.scrollY = $iframe.contentWindow.scrollY;
                app.recordingAction.scrollX = $iframe.contentWindow.scrollX;
                app.recordingAction.timestamp = Date.now();
            }
        }
        else {
            app.recordingAction = null;
            saveData();
        }
        // Get scroll
    }
}

function recordIframeEvents(iframe, app) {
    let innerDocument = iframe.contentWindow.document;

    function addMouseOp(type, e) {
        if (app.recordingAction) {
            app.recordingAction.ops.push({
                type,
                time: Date.now() - app.recordingAction.timestamp,
                x: e.clientX,
                y: e.clientY
            });
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

    let $iframe = document.body.querySelector('iframe');
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