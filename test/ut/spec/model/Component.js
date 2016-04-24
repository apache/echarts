describe('Component', function() {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/model/Component']);

    describe('topologicalTravel', function () {

        testCase('topologicalTravel_base', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var result = [];
            var allList = ComponentModel.getAllClassMainTypes();
            ComponentModel.topologicalTravel(['m1', 'a1', 'a2'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTravel_a1IsAbsent', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a2'});
            var allList = ComponentModel.getAllClassMainTypes();
            var result = [];
            ComponentModel.topologicalTravel(['m1', 'a2'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTravel_empty', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var allList = ComponentModel.getAllClassMainTypes();
            var result = [];
            ComponentModel.topologicalTravel([], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([]);
        });

        testCase('topologicalTravel_isolate', function (ComponentModel) {
            ComponentModel.extend({type: 'a2'});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'm1', dependencies: ['a2']});
            var allList = ComponentModel.getAllClassMainTypes();
            var result = [];
            ComponentModel.topologicalTravel(['a1', 'a2', 'm1'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a1', []], ['a2', []], ['m1', ['a2']]]);
        });

        testCase('topologicalTravel_diamond', function (ComponentModel) {
            ComponentModel.extend({type: 'a1', dependencies: []});
            ComponentModel.extend({type: 'a2', dependencies: ['a1']});
            ComponentModel.extend({type: 'a3', dependencies: ['a1']});
            ComponentModel.extend({type: 'm1', dependencies: ['a2', 'a3']});
            var allList = ComponentModel.getAllClassMainTypes();
            var result = [];
            ComponentModel.topologicalTravel(['m1', 'a1', 'a2', 'a3'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a1', []], ['a3', ['a1']], ['a2', ['a1']], ['m1', ['a2', 'a3']]]);
        });

        testCase('topologicalTravel_loop', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'm2', dependencies: ['m1', 'a2']});
            ComponentModel.extend({type: 'a1', dependencies: ['m2', 'a2', 'a3']});
            ComponentModel.extend({type: 'a2'});
            ComponentModel.extend({type: 'a3'});
            var allList = ComponentModel.getAllClassMainTypes();
            expect(function () {
                ComponentModel.topologicalTravel(['m1', 'm2', 'a1'], allList);
            }).toThrowError(/Circl/);
        });

        testCase('topologicalTravel_multipleEchartsInstance', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1'});
            ComponentModel.extend({type: 'a2'});
            var allList = ComponentModel.getAllClassMainTypes();
            var result = [];
            ComponentModel.topologicalTravel(['m1', 'a1', 'a2'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']]]);

            result = [];
            ComponentModel.extend({type: 'm2', dependencies: ['a1', 'm1']});
            var allList = ComponentModel.getAllClassMainTypes();
            ComponentModel.topologicalTravel(['m2', 'm1', 'a1', 'a2'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a2', []], ['a1', []], ['m1', ['a1', 'a2']], ['m2', ['a1', 'm1']]]);
        });

        testCase('topologicalTravel_missingSomeNodeButHasDependencies', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a2', dependencies: ['a3']});
            ComponentModel.extend({type: 'a3'});
            ComponentModel.extend({type: 'a4'});
            var result = [];
            var allList = ComponentModel.getAllClassMainTypes();
            ComponentModel.topologicalTravel(['a3', 'm1'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a3', []], ['a2', ['a3']], ['m1', ['a1', 'a2']]]);
            var result = [];
            var allList = ComponentModel.getAllClassMainTypes();
            ComponentModel.topologicalTravel(['m1', 'a3'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a3', []], ['a2', ['a3']], ['m1', ['a1', 'a2']]]);
        });

        testCase('topologicalTravel_subType', function (ComponentModel) {
            ComponentModel.extend({type: 'm1', dependencies: ['a1', 'a2']});
            ComponentModel.extend({type: 'a1.aaa', dependencies: ['a2']});
            ComponentModel.extend({type: 'a1.bbb', dependencies: ['a3', 'a4']});
            ComponentModel.extend({type: 'a2'});
            ComponentModel.extend({type: 'a3'});
            ComponentModel.extend({type: 'a4'});
            var result = [];
            var allList = ComponentModel.getAllClassMainTypes();
            ComponentModel.topologicalTravel(['m1', 'a1', 'a2', 'a4'], allList, function (componentType, dependencies) {
                result.push([componentType, dependencies]);
            });
            expect(result).toEqual([['a4', []], ['a2',[]], ['a1', ['a2','a3','a4']], ['m1', ['a1', 'a2']]]);
        });
    });

});