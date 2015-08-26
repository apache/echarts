describe('Component', function() {

    var utHelper = window.utHelper;

    beforeEach(function (done) {
        utHelper.resetPackageLoader(done);
    });

    describe('topologicalTavel', function () {

        function testCase(name, doTest) {
            it(name, function (done) {
                window.require(['echarts/model/Component'], function () {
                    doTest.apply(null, arguments);
                    done();
                });
            });
        }
        function xtestCase() {} // jshint ignore:line

        testCase('topologicalTavel1', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', depends: ['a1', 'a2']});
            var result = [];
            ComponentModel.topologicalTavel(['m1'], function (componentType, depends) {
                result.push([componentType, depends]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTavel2', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', depends: ['a1', 'a2']});
            var result = [];
            ComponentModel.topologicalTavel([], function (componentType, depends) {
                result.push([componentType, depends]);
            });
            expect(result).toEqual([]);
        });

        xtestCase('topologicalTavel3_loop', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', depends: ['a1', 'a2']});
            ComponentModel.extend({type: 'm2', depends: ['m1', 'a2']});
            ComponentModel.extend({type: 'a1', depends: ['m2', 'a2']});
            var result = [];
            ComponentModel.topologicalTavel(['m1', 'm2', 'a1'], function (componentType, depends) {
                result.push([componentType, depends]);
            });
            expect(result).toEqual([]);
        });
    });

});