/**
 * @file benchmark application instance
 * @author Wenli Zhang
 */

define(function (require) {

    var TestManager = require('./testManager');

    var vm = new Vue({
        el: '#app',

        data: {
            caseNames: ['line', 'pie', 'scatter', 'bar'],
            amounts: (function () {
                var arr = [];
                for (var i = 20; i < 200; i += 20) {
                    arr.push(i);
                }
                for (var i = 200; i < 1000; i += 200) {
                    arr.push(i);
                }
                for (i = 1000; i <= 10000; i += 2000) {
                    arr.push(i);
                }
                // for (i = 10000; i <= 100000; i += 20000) {
                //     arr.push(i);
                // }
                // arr.push(100000);
                return arr;
            })(),
            times: [],
            result: '',

            hasRun: false,
            isRunning: false,
            elapsedTime: 0
        },

        methods: {
            run: run,
            download: download
        }
    });

    var manager = new TestManager(vm.amounts, vm.caseNames);

    function run() {
        var results = [];
        var updateUI = function () {
            for (var i = 0; i < results.length; ++i) {
                var test = results[i];
                if (!vm.times[test.amountId]) {
                    vm.$set('times[' + test.amountId + ']', []);
                }
                vm.$set('times[' + test.amountId + '][' + test.caseId
                    + ']', test.time);
            }
            results = [];
        };

        vm.$set('hasRun', false);
        vm.$set('isRunning', true);
        manager.init();
        var start = new Date();

        for (var aid = 0; aid < vm.amounts.length; ++aid) {
            for (var cid = 0; cid < vm.caseNames.length; ++cid) {
                // run a test case in each loop
                (function (aid, cid) {
                    setTimeout(function () {
                        var test = manager.run(cid, aid);
                        results.push(test);

                        if (aid === vm.amounts.length - 1
                            && cid === vm.caseNames.length - 1) {
                            // last test case
                            var end = new Date();
                            vm.$set('hasRun', true);
                            vm.$set('elapsedTime', end - start);
                            vm.$set('isRunning', false);
                            vm.$set('result', manager.exportResult());
                            updateUI();
                        }
                    }, 0);
                })(aid, cid);

                // log results
                setTimeout(updateUI, 0);
            }
        }

        setTimeout(function () {
            manager.drawReport(document.getElementById('report'));
        }, 0);
    }

    function download() {
        // save to file
        var blob = new Blob([vm.result], {
            type: 'text/json; charset=urf-8'
        });
        saveAs(blob, 'result.json');
    }

});
