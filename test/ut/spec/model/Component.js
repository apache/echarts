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

        testCase('topologicalTavel_base', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var result = [];
            ComponentModel.topologicalTavel(['m1', 'a1', 'a2'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTavel_a1IsAbsent', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a2'});
            var result = [];
            ComponentModel.topologicalTavel(['m1', 'a2'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTavel_empty', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var result = [];
            ComponentModel.topologicalTavel([], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([]);
        });

        testCase('topologicalTavel_isolate', function (ComponentModel) {
            ComponentModel.extend({type: 'a2'});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'm1', dependencies: ['a2']});
            var result = [];
            ComponentModel.topologicalTavel(['a1', 'a2', 'm1'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['m1', ['a2']], ['a1', []]]);
        });

        testCase('topologicalTavel_diamond', function (ComponentModel) {
            ComponentModel.extend({type: 'a1', dependencies: []});
            ComponentModel.extend({type: 'a2', dependencies: ['a1']});
            ComponentModel.extend({type: 'a3', dependencies: ['a1']});
            ComponentModel.extend({type: 'm1', dependencies: ['a2', 'a3']});
            var result = [];
            ComponentModel.topologicalTavel(['m1', 'a1', 'a2', 'a3'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a1', []], ['a3', ['a1']], ['a2', ['a1']], ['m1', ['a2', 'a3']]]);
        });

        testCase('topologicalTavel_loop', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'm2', dependencies: ['m1', 'a2']});
            ComponentModel.extend({type: 'a1', dependencies: ['m2', 'a2']});
            ComponentModel.extend({type: 'a2'});
            expect(function () {
                ComponentModel.topologicalTavel(['m1', 'm2', 'a1']);
            }).toThrowError(/Circl/);
        });

        testCase('topologicalTavel_multipleEchartsInstance', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var result = [];
            ComponentModel.topologicalTavel(['m1', 'a1', 'a2'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']]]);

            result = [];
            ComponentModel.extend({type: 'm2', dependencies: ['a1', 'm1']});
            ComponentModel.topologicalTavel(['m2', 'm1', 'a1', 'a2'], function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']], ['m2', ['a1', 'm1']]]);
        });
    });

});