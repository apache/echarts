/**
 * @file Legend action
 */
define(function(require) {

    var echarts = require('../../echarts');

    /**
     * @event legendToggleSelect
     * @type {Object}
     * @property {string} type 'legendToggleSelect'
     * @property {string} [from]
     * @property {string} name Series name or data item
     */
    echarts.registerAction('legendToggleSelect', 'legendSelectChanged', function (action, ecModel) {
        var selectedMap = {};
        // Update all legend components
        ecModel.eachComponent('legend', function (legendModel) {
            legendModel.toggleSelected(action.name);
            var legendData = legendModel.getData();
            for (var i = 0; i < legendData.length; i++) {
                var model = legendData[i];
                var name = model.get('name');
                // Wrap element
                if (name === '\n' || name === '') {
                    continue;
                }
                var isItemSelected = legendModel.isSelected(name);
                if (name in selectedMap) {
                    // Unselected if any legend is unselected
                    selectedMap[name] = selectedMap[name] && isItemSelected;
                }
                else {
                    selectedMap[name] = isItemSelected;
                }
            }
        });
        // Return the event explicitly
        return {
            name: action.name,
            selected: selectedMap
        };
    });
});