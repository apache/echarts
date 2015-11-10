// TODO Axis scale
define(function (require) {

    var Polar = require('./Polar');
    var numberUtil = require('../../util/number');
    var zrUtil = require('zrender/core/util');

    var axisHelper = require('../../coord/axisHelper');
    var niceScaleExtent = axisHelper.niceScaleExtent;

    // 依赖 PolarModel 做预处理
    require('./PolarModel');

    /**
     * Resize method bound to the polar
     * @param {module:echarts/coord/polar/PolarModel} polarModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function resizePolar(polarModel, api) {
        var center = polarModel.get('center');
        var radius = polarModel.get('radius');
        var width = api.getWidth();
        var height = api.getHeight();
        var parsePercent = numberUtil.parsePercent;

        this.cx = parsePercent(center[0], width);
        this.cy = parsePercent(center[1], height);

        var radiusAxis = this.getRadiusAxis();
        var size = Math.min(width, height) / 2;
        radiusAxis.setExtent(
            parsePercent(radius[0], size),
            parsePercent(radius[1], size)
        );
    }

    /**
     * Set common axis properties
     * @param {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
     * @param {module:echarts/coord/polar/AxisModel}
     * @inner
     */
    function setAxis(axis, axisModel) {
        axis.type = axisModel.get('type');
        axis.scale = axisHelper.createScaleByModel(axisModel);
        axis.onBand = axisModel.get('boundaryGap') && axis.type === 'category';
        axis.inverse = axisModel.get('inverse');

        // Inject axis instance
        axisModel.axis = axis;
        axis.model = axisModel;
    }

    /**
     * Set polar axis scale from series data
     */
    function setPolarAxisFromSeries(polarList, ecModel, api) {
        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'polar') {
                var polarIndex = seriesModel.get('polarIndex') || 0;

                var polar = polarList[polarIndex];
                if (!polar) {
                    // api.log('Polar configuration not exist for series ' + seriesModel.name + '.');
                    return;
                }
                // Inject polar instance
                seriesModel.coordinateSystem = polar;

                var radiusAxis = polar.getRadiusAxis();
                var angleAxis = polar.getAngleAxis();

                var data = seriesModel.getData();
                radiusAxis.scale.unionExtent(
                    data.getDataExtent('radius', radiusAxis.type !== 'category')
                );
                angleAxis.scale.unionExtent(
                    data.getDataExtent('angle', angleAxis.type !== 'category')
                );
            }
        });

        zrUtil.each(polarList, function (polar) {
            var angleAxis = polar.getAngleAxis();
            var radiusAxis = polar.getRadiusAxis();
            niceScaleExtent(angleAxis, angleAxis.model);
            niceScaleExtent(radiusAxis, radiusAxis.model);
        });
    }

    var polarCreator = {

        create: function (ecModel, api) {
            var polarList = [];
            ecModel.eachComponent('polar', function (polarModel, idx) {
                var polar = new Polar(idx);
                // Inject resize method
                polar.resize = resizePolar;

                var radiusAxis = polar.getRadiusAxis();
                var angleAxis = polar.getAngleAxis();

                var radiusAxisModel = polarModel.findAxisModel('radiusAxis');
                var angleAxisModel = polarModel.findAxisModel('angleAxis');

                setAxis(radiusAxis, radiusAxisModel);
                setAxis(angleAxis, angleAxisModel);

                polar.resize(polarModel, api);
                polarList.push(polar);

                polarModel.coordinateSystem = polar;
            });

            setPolarAxisFromSeries(polarList, ecModel, api);

            // Fix extent of category angle axis
            zrUtil.each(polarList, function (polar) {
                var angleAxis = polar.getAngleAxis();
                if (angleAxis.type === 'category' && !angleAxis.onBand) {
                    var angle = 360 - 360 / (angleAxis.scale.count() + 1);
                    angleAxis.setExtent(0, angle);
                }
            });

            return polarList;
        }
    };

    require('../../CoordinateSystem').register('polar', polarCreator);
});