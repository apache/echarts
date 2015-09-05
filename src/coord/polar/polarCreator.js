// TODO Axis scale
define(function (require) {

    var Polar = require('./Polar');
    var IntervalScale = require('../../scale/Interval');
    var OrdinalScale = require('../../scale/Ordinal');
    var numberUtil = require('../../util/number');

    // 依赖 PolarModel, AxisModel 做预处理
    require('./PolarModel');
    require('./AxisModel');

    /**
     * Retrieve angle axis or radius axis belongs to the given polar
     * @param {string} axisType
     * @param {number} polarIndex
     * @param {module:echarts/model/Global} ecModel
     * @param {module:echarts/ExtensionAPI} api
     * @return {module:echarts/coord/polar/AxisModel}
     * @inner
     */
    function retrieveAxisModelForPolar(axisType, polarIndex, ecModel, api) {
        var axisModel;
        ecModel.eachComponent(axisType, function (model) {
            if (model.get('polarIndex') === polarIndex) {
                if (axisModel) {
                    api.log('Polar ' + polarIndex + ' has more than one ' + axisType);
                    return;
                }
                axisModel = model;
            }
        });
        return axisModel;
    }

    /**
     * Resize methods bound to the polar
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
        var size = Math.min(width, height);
        radiusAxis.setExtent(
            parsePercent(radius[0], size),
            parsePercent(radius[1], size)
        );
    }

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @return {module:echarts/scale/*}
     * @inner
     */
    function createScaleByModel(axisModel) {
        var axisType = axisModel.get('type');
        if (axisType) {
            return axisType === 'value'
                ? new IntervalScale()
                : new OrdinalScale(axisModel.get('data'));
        }
    };

    /**
     * Set common axis properties
     * @param {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
     * @param {module:echarts/coord/polar/AxisModel}
     * @inner
     */
    function setAxis(axis, axisModel) {
        axis.type = axisModel.get('type');
        axis.scale = createScaleByModel(axisModel);
        axis.onBand = axisModel.get('boundaryGap');
        axis.inverse = axisModel.get('inverse');

        // Inject axis instance
        axisModel.axis = axis;
    }

    /**
     * Set polar axis scale from series data
     */
    function setPolarAxisFromSeries(polarList, ecModel, api) {
        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'polar') {
                var polarIndex = seriesModel.get('polarIndex') || 0;

                var polar = polarList[polarIndex];
                if (! polar) {
                    api.log('Polar configuration not exist for series ' + seriesModel.name + '.');
                    return;
                }
                // Inject polar instance
                seriesModel.coordinateSystem = polar;

                var radiusAxis = polar.getRadiusAxis();
                var angleAxis = polar.getAngleAxis();
                var isRadiusCategory = radiusAxis.type === 'category';
                var isAngleCategory = angleAxis.type === 'category';

                var data = seriesModel.getData();
                if (! isRadiusCategory) {
                    radiusAxis.scale.setExtentFromData(data.map(function (dataItem) { return dataItem.getRadius(); }), true);
                }
                if (! isAngleCategory) {
                    angleAxis.scale.setExtentFromData(data.map(function (dataItem) { return dataItem.getAngle(); }), true);
                }
            }
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

                var radiusAxisModel = retrieveAxisModelForPolar('radiusAxis', idx, ecModel, api);
                var angleAxisModel = retrieveAxisModelForPolar('angleAxis', idx, ecModel, api);

                setAxis(radiusAxis, radiusAxisModel);
                setAxis(angleAxis, angleAxisModel);

                polar.resize(polarModel, api);
                polarList.push(polar);

                polarModel.coordinateSystem = polar;
            });

            setPolarAxisFromSeries(polarList, ecModel, api);

            return polarList;
        }
    };

    require('../../CoordinateSystem').register('polar', polarCreator);
});