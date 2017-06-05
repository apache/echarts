/**
 * @file  The layout algorithm of node-link tree diagrams. Here we using Reingold-Tilford algorithm to drawing
 *        the tree.
 * @author Deqing Li(annong035@sina.com)
 */


define(function (require) {

    var layout = require('../../util/layout');

    return function (ecModel, api, payload) {

        ecModel.eachSeriesByType('tree', function (seriesModel) {

            var layoutInfo = getViewRect(seriesModel, api);

            seriesModel.layoutInfo = layoutInfo;

            var width = layoutInfo.width;
            var height = layoutInfo.height;



            var treeRoot = seriesModel.getData().tree.root;







        });

    };

    /**
     * Get the layout position of the whole view
     *
     * @param {module:echarts/model/Series} seriesModel  the model object of sankey series
     * @param {module:echarts/ExtensionAPI} api  provide the API list that the developer can call
     * @return {module:zrender/core/BoundingRect}  size of rect to draw the sankey view
     */
    function getViewRect(seriesModel, api) {
        return layout.getLayoutRect(
            seriesModel.getBoxLayoutParams(), {
                width: api.getWidth(),
                height: api.getHeight()
            }
        );
    }



});