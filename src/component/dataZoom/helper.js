/**
 * @file Data zoom helper
 */
define(function(require) {

    var zrUtil = require('zrender/core/util');

    var helper = {};

    var AXIS_DIMS = ['x', 'y', 'z', 'radius', 'angle'];

    // FIXME
    // 公用？
    helper.eachAxisDim = function (callback, context) {
        zrUtil.each(AXIS_DIMS, function (axisDim) {
            var capital = axisDim[0].toUpperCase() + axisDim.substr(1);
            var names = {
                axisIndex: axisDim + 'AxisIndex',
                axis: axisDim + 'Axis',
                dim: axisDim,
                capital: capital,
                index: axisDim + 'Index'
            };
            callback.call(context, names);
        });
    };

    // FIXME
    // 公用？
    /**
     * If value1 is not null, then return value1, otherwise judget rest of values.
     * @param  {*...} values
     * @return {*} Final value
     */
    helper.retrieveValue = function (values) {
        for (var i = 0, len = arguments.length; i < len; i++) {
            if (arguments[i] != null) {
                return arguments[i];
            }
        }
    };

    // FIXME
    // 公用？
    /**
     * If value is not array, then translate it to array.
     * @param  {*} value
     * @return {Array} [value] or value
     */
    helper.toArray = function (value) {
        return zrUtil.isArray(value) ? value : (value == null ? [] : [value]);
    };

    /**
     * @public
     */
    helper.findLinkSet = function (forEachModel, axisIndicesGetter, sourceModel) {
        var result = {models: [], dims: {}};
        var dimRecords = {};
        helper.eachAxisDim(function (dimNames) {
            result.dims[dimNames.dim] = [];
            dimRecords[dimNames.dim] = [];
        });

        if (!sourceModel) {
            return result;
        }

        absorb(sourceModel);

        var existsLink;
        do {
            existsLink = false;
            forEachModel(processSingleModel);
        }
        while (existsLink);

        wrapUpResult();

        return result;

        function processSingleModel(model) {
            if (!isModelAbsorded(model) && isLink(model)) {
                absorb(model);
                existsLink = true;
            }
        }

        function isModelAbsorded(model) {
            return zrUtil.indexOf(result.models, model) >= 0;
        }

        function isLink(model) {
            var hasLink = false;
            helper.eachAxisDim(function (dimNames) {
                var axisIndices = axisIndicesGetter(model, dimNames);
                var singleDimSet = dimRecords[dimNames.dim];
                for (var i = 0, len = axisIndices.length; i < len; i++) {
                    if (singleDimSet[axisIndices[i]]) {
                        hasLink = true;
                        return;
                    }
                }
            });
            return hasLink;
        }

        function absorb(model) {
            result.models.push(model);
            helper.eachAxisDim(function (dimNames) {
                var axisIndices = axisIndicesGetter(model, dimNames);
                var singleDimSet = dimRecords[dimNames.dim];
                for (var i = 0, len = axisIndices.length; i < len; i++) {
                    singleDimSet[axisIndices[i]] = true;
                }
            });
        }

        function wrapUpResult() {
            helper.eachAxisDim(function (dimNames) {
                var dimRecord = dimRecords[dimNames.dim];
                for (var i = 0; i < dimRecord.length; i++) {
                    if (dimRecord[i]) {
                        result.dims[dimNames.dim].push(i);
                    }
                }
            });
        }
    };

    return helper;
});