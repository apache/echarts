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
            amounts: (function() {
                var arr = [];
                for (var i = 200; i < 1000; i += 200) {
                    arr.push(i);
                }
                // for (i = 1000; i <= 10000; i += 2000) {
                //     arr.push(i);
                // }
                // for (i = 10000; i <= 100000; i += 20000) {
                //     arr.push(i);
                // }
                // arr.push(100000);
                return arr;
            })(),
            times: {},

            hasRun: false,
            isRunning: false,
            elapsedTime: 0
        },

        methods: {
            run: run
        }
    });

    var manager = new TestManager(vm.amounts, vm.caseNames);

    function run() {
        vm.$set('hasRun', false);
        vm.$set('isRunning', true);
        // var timerHandler = setInterval(function() {
        //     if (vm.isRunning) {
        //         vm.$set('elapsedTime', vm.elapsedTime + 1);
        //     } else {
        //         clearInterval(timerHandler);
        //     }
        // }, 1000);

        manager.init();

        var start = new Date();
        while (manager.hasNext) {
            var test = manager.next(); // ECharts test case
            Vue.nextTick(function () {
                if (!vm.times[test.amountId]) {
                    vm.$set('times[' + test.amountId + ']', []);
                }
                vm.$set('times[' + test.amountId + '][' + test.caseId + ']', test.time);
            });

        }
        var end = new Date();
        vm.$set('elapsedTime', end - start);
        // console.log(end - start);

        vm.$set('isRunning', false);
        vm.$set('hasRun', true);

        // Use setTimeout to make sure it is called after report element is
        // rendered by Vue.
        setTimeout(function () {
            manager.drawReport(document.getElementById('report'));
        }, 0);
    }

});
