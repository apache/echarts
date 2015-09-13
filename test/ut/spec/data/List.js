describe('List', function () {

    var utHelper = window.utHelper;

    beforeEach(function (done) {
        utHelper.resetPackageLoader(done);
    });

    describe('Data Manipulation', function () {

        function testCase(name, doTest) {
            it(name, function (done) {
                window.require(['echarts/data/LargeList'], function () {
                    doTest.apply(null, arguments);
                    done();
                });
            });
        }

        testCase('initData 1d', function (List) {
            var list = new List(['x', 'y']);
            list.initData([10, 20, 30]);
            expect(list.get('x', 0)).toEqual(0);
            expect(list.get('x', 1)).toEqual(1);
            expect(list.get('x', 2)).toEqual(2);
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
            expect(list.getDataModel(1).get('somProp')).toEqual('foo');
            expect(list.getDataModel(0).get('somProp')).toBeNull();
        });

        testCase('Empty data', function (List) {
            var list = new List(['x', 'y']);
            list.initData([1, '-']);
            expect(list.get('y', 1)).toBeNaN();
        });

        testCase('Stacked data', function (List) {
            var list1 = new List(['x', 'y']);
            var list2 = new List(['x', 'y']);
            list1.initData([1, '-', 2, -2]);
            list2.initData([1, 2,   3, 2]);

            list2.stackedOn = list1;

            expect(list2.get('y', 1, true)).toEqual(2);
            expect(list2.get('y', 2, true)).toEqual(5);
            expect(list2.get('y', 3, true)).toEqual(2);
        });

        testCase('map', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.map(['x', 'y'], function (x, y) {
                return [x, y];
            })).toEqual([[10, 15], [20, 25], [30, 35]]);
        });

        testCase('filterSelf', function (List) {
            var list = new List(['x', 'y']);
            list.initData([[10, 15], [20, 25], [30, 35]]);
            expect(list.filterSelf(['x', 'y'], function (x, y) {
                return x < 30 && x > 10;
            }).map('x', function (x) {
                return x;
            })).toEqual([20]);
        });
    });
});