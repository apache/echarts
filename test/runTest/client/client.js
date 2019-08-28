const socket = io();
socket.on('connect', () => {
    console.log('Connected');

    const app = new Vue({
        el: '#app',
        data: {
            tests: [],
            selectedTestName: ''
        },
        computed: {
            selectedTest() {
                let selectedTest = this.tests.find(item => item.name === this.selectedTestName);
                if (!selectedTest) {
                    selectedTest = this.tests[0];
                }
                return selectedTest;
            }
        }
    });
    app.$el.style.display = 'block';

    socket.on('broadcast', msg => {
        app.tests = msg.tests;
    });

    function updateTestHash() {
        let testName = window.location.hash.slice(1);
        app.selectedTestName = testName;
    }

    updateTestHash();
    window.addEventListener('hashchange', updateTestHash);
});

