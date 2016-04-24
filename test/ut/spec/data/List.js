describe('List', function () {

    var utHelper = window.utHelper;

    var testCase = utHelper.prepare(['echarts/data/List']);

    describe('Data Manipulation', function () {

        testCase('initData 1d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([10, 20, 30]);
            expect(list.get('x', 0)).toEqual(10);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('x', 2)).toEqual(30);
            expect(list.get('y', 1)).toEqual(20);
        });

        testCase('initData 2d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(20);
            expect(list.get('y', 1)).toEqual(25);
        });

        testCase('initData 2d yx', function (List) {
            var list = new List(['y', 'x']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.get('x', 1)).toEqual(25);
            expect(list.get('y', 1)).toEqual(20);
        });

        testCase('Data with option 1d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, {
                value: 2,
                somProp: 'foo'
            }]);
            expect(list.getItemModel(1).get('somProp')).toEqual('foo');
            expect(list.getItemModel(0).get('somProp')).toBeNull();
        });

        testCase('Empty data', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, '-']);
            expect(list.get('y', 1)).toBeNaN();
        });

        testCase('Stacked data', function (List) {
            var list1 = new List(['x', {
                name: 'y',
                stackable: true
            }]);
            var list2 = new List(['x', {
                name: 'y',
                stackable: true
            }]);
            list1.initData([1, '-', 2, -2]);
            list2.initData([1, 2,   3, 2]);

            list2.stackedOn = list1;

            expect(list2.get('y', 1, true)).toEqual(2);
            expect(list2.get('y', 2, true)).toEqual(5);
            expect(list2.get('y', 3, true)).toEqual(2);
        });

        testCase('getRawValue', function (List) {
            var list = new List(['x', 'y']);

            list.initData([1, 2, 3]);
            expect(list.getItemModel(1).option).toEqual(2);

            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.getItemModel(1).option).toEqual([20, 25]);
        });

        testCase('getDataExtent', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, 2, 3]);
            expect(list.getDataExtent('x')).toEqual([1, 3]);
            expect(list.getDataExtent('y')).toEqual([1, 3]);
        });

        testCase('Data types', function (List) {
            var list = new List([{
                name: 'x',
                type: 'int'
            }, {
                name: 'y',
                type: 'float'
            }]);
            list.initData([[1.1, 1.1]]);
            expect(list.get('x', 0)).toEqual(1);
            expect(list.get('y', 0)).toBeCloseTo(1.1, 5);
        });

        testCase('map', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.map(['x', 'y'], function (x, y) {
                return [x + 2, y + 2];
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([12, 22, 32]);
        });

        testCase('mapArray', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.mapArray(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        testCase('filterSelf', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).mapArray('x', function (x) {
                return x;
            })).toEqual([20]);
        });
    });
});