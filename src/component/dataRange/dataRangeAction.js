/**
 * @file Data range action
 */
define(function(require) {

    // var zrUtil = require('zrender/core/util');
    var echarts = require('../../echarts');
    // var modelUtil = require('../../util/model');

    echarts.registerAction('dataRangeSelected', function (event, ecModel) {

        var fromDataRangeModel = ecModel.getComponentById(event.dataRangeModelId);

        fromDataRangeModel && fromDataRangeModel.setSelected(event.selected);

        // Find all dataRangeModel that has the same visualType and controls the same series.
        // var linkedNodesFinder = modelUtil.createLinkedNodesFinder(
        //     function (callback, context) {
        //         ecModel.eachComponent('dataRange', function (dataRangeModel) {
        //             var fromMappings = dataRangeModel.visualMappings;
        //             var toMappings = dataRangeModel.visualMappings;
        //             if (toMappings.selected.type === fromMappings.selected.type
        //                 || toMappings.selected.type === fromMappings.selected.type
        //             ) {
        //                 callback.call(context, dataRangeModel);
        //             }
        //         });
        //     },
        //     modelUtil.createNameEach(['series'], ['index']),
        //     function (model, nameObj) {
        //         return model.get(nameObj.index);
        //     }
        // );
        // var effectedModels = linkedNodesFinder(fromDataRangeModel).nodes;

        // zrUtil.each(effectedModels, function (dataRangeModel) {
            // fromDataRangeModel.setSelected(event.selected);
        // });
    });

});