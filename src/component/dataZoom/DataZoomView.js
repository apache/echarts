import ComponentView from '../../view/Component';

export default ComponentView.extend({

    type: 'dataZoom',

    render: function (dataZoomModel, ecModel, api, payload) {
        this.dataZoomModel = dataZoomModel;
        this.ecModel = ecModel;
        this.api = api;
    },

    /**
     * Find the first target coordinate system.
     *
     * @protected
     * @return {Object} {
     *                   grid: [
     *                       {model: coord0, axisModels: [axis1, axis3], coordIndex: 1},
     *                       {model: coord1, axisModels: [axis0, axis2], coordIndex: 0},
     *                       ...
     *                   ],  // cartesians must not be null/undefined.
     *                   polar: [
     *                       {model: coord0, axisModels: [axis4], coordIndex: 0},
     *                       ...
     *                   ],  // polars must not be null/undefined.
     *                   singleAxis: [
     *                       {model: coord0, axisModels: [], coordIndex: 0}
     *                   ]
     */
    getTargetCoordInfo: function () {
        var dataZoomModel = this.dataZoomModel;
        var ecModel = this.ecModel;
        var coordSysLists = {};

        dataZoomModel.eachTargetAxis(function (dimNames, axisIndex) {
            var axisModel = ecModel.getComponent(dimNames.axis, axisIndex);
            if (axisModel) {
                var coordModel = axisModel.getCoordSysModel();
                coordModel && save(
                    coordModel,
                    axisModel,
                    coordSysLists[coordModel.mainType] || (coordSysLists[coordModel.mainType] = []),
                    coordModel.componentIndex
                );
            }
        }, this);

        function save(coordModel, axisModel, store, coordIndex) {
            var item;
            for (var i = 0; i < store.length; i++) {
                if (store[i].model === coordModel) {
                    item = store[i];
                    break;
                }
            }
            if (!item) {
                store.push(item = {
                    model: coordModel, axisModels: [], coordIndex: coordIndex
                });
            }
            item.axisModels.push(axisModel);
        }

        return coordSysLists;
    }

});
