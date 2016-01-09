/**
 * @file Legend action
 */
define(function(require) {

    var echarts = require('../../echarts');
    var zrUtil = require('zrender/core/util');

    function legendSelectActionHandler(methodName, action, ecModel) {
        var selectedMap = {};
        // Update all legend components
        ecModel.eachComponent('legend', function (legendModel) {
            legendModel[methodName](action.name);
            var legendData = legendModel.getData();
            zrUtil.each(legendData, function (model) {
                var name = model.get('name');
                // Wrap element
                if (name === '\n' || name === '') {
                    return;
                }
                var isItemSelected = legendModel.isSelected(name);
                if (name in selectedMap) {
                    // Unselected if any legend is unselected
                    selectedMap[name] = selectedMap[name] && isItemSelected;
                }
                else {
                    selectedMap[name] = isItemSelected;
                }
            });
        });
        // Return the event explicitly
        return {
            name: action.name,
            selected: selectedMap
        };
    }
    /**
     * @event legendToggleSelect
     * @type {Object}
     * @property {string} type 'legendToggleSelect'
     * @property {string} [from]
     * @property {string} name Series name or data item name
     */
    echarts.registerAction(
        'legendToggleSelect', 'legendselectchanged',
        zrUtil.curry(legendSelectActionHandler, 'toggleSelected')
    );

    /**
     * @event legendSelect
     * @type {Object}
     * @property {string} type 'legendSelect'
     * @property {string} name Series name or data item name
     */
    echarts.registerAction(
        'legendSelect', 'legendselected',
        zrUtil.curry(legendSelectActionHandler, 'select')
    );

    /**
     * @event legendUnSelect
     * @type {Object}
     * @property {string} type 'legendUnSelect'
     * @property {string} name Series name or data item name
     */
    echarts.registerAction(
        'legendUnSelect', 'legendunselected',
        zrUtil.curry(legendSelectActionHandler, 'unSelect')
    );
});