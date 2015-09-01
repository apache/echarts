describe('dataZoom#helper', function() {

    var utHelper = window.utHelper;
    var helper;

    beforeAll(function (done) { // jshint ignore:line
        utHelper.resetPackageLoader(function () {
            window.require(['echarts/component/dataZoom/helper'], function (h) {
                helper = h;
                done();
            });
        });
    });

    describe('findLinkSet', function () {

        function forEachModel(models, callback) {
            for (var i = 0; i < models.length; i++) {
                callback(models[i]);
            }
        }

        function axisIndicesGetter(model, dimNames) {
            return model[dimNames.axisIndex];
        }

        it('findLinkSet_base', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [1]},
                {xAxisIndex: [5], yAxisIndex: []},
                {xAxisIndex: [2, 5], yAxisIndex: []}
            ];
            var result = helper.findLinkSet(
                utHelper.curry(forEachModel, models),
                axisIndicesGetter,
                models[0]
            );
            expect(result).toEqual({
                models: [models[0], models[3], models[2]],
                dims: {x: [1, 2, 5], y: [0]}
            });
            done();
        });

        it('findLinkSet_crossXY', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [3, 0]},
                {xAxisIndex: [6, 3], yAxisIndex: [9]},
                {xAxisIndex: [5, 3], yAxisIndex: []},
                {xAxisIndex: [8], yAxisIndex: [4]}
            ];
            var result = helper.findLinkSet(
                utHelper.curry(forEachModel, models),
                axisIndicesGetter,
                models[0]
            );
            expect(result).toEqual({
                models: [models[0], models[1], models[2], models[3]],
                dims: {x: [1, 2, 3, 5, 6], y: [0, 3, 9]}
            });
            done();
        });

        it('findLinkSet_emptySourceModel', function (done) {
            var models = [
                {xAxisIndex: [1, 2], yAxisIndex: [0]},
                {xAxisIndex: [3], yAxisIndex: [3, 0]},
                {xAxisIndex: [6, 3], yAxisIndex: [9]},
                {xAxisIndex: [5, 3], yAxisIndex: []},
                {xAxisIndex: [8], yAxisIndex: [4]}
            ];
            var result = helper.findLinkSet(
                utHelper.curry(forEachModel, models),
                axisIndicesGetter
            );
            expect(result).toEqual({
                models: [],
                dims: {x: [], y: []}
            });
            done();
        });

    });

});