define(function(require) {

    var zrUtil = require('zrender/core/util');
    var Model = require('../../model/Model');
    var each = zrUtil.each;
    var curry = zrUtil.curry;

    var helper = {};

    helper.collect = function (ecModel, api) {
        var result = {
            /**
             * key: makeKey(axis.model)
             * value: {
             *      axis,
             *      coordSys,
             *      axisPointerModel,
             *      triggerTooltip,
             *      involveSeries,
             *      snap,
             *      seriesModels
             * }
             */
            axesInfo: {},
            seriesInvolved: false,
            /**
             * key: makeKey(coordSys.model)
             * value: Object: key makeKey(axis.model), value: axisInfo
             */
            coordSysAxesInfo: {},
            coordSysMap: {},
            linkGroups: []
        };

        collectAxesInfo(result, ecModel, api);

        // Check seriesInvolved for performance, in case too many series in some chart.
        result.seriesInvolved && collectSeriesInfo(result, ecModel);

        return result;
    };

    function collectAxesInfo(result, ecModel, api) {
        var globalTooltipModel = ecModel.getComponent('tooltip');
        var globalAxisPointerModel = ecModel.getComponent('axisPointer');
        // links can only be set on global.
        var linksOption = globalAxisPointerModel.get('links', true) || [];

        // Collect axes info.
        each(api.getCoordinateSystems(), function (coordSys) {
            var coordSysKey = makeKey(coordSys.model);
            var axesInfoInCoordSys = result.coordSysAxesInfo[coordSysKey] = {};
            result.coordSysMap[coordSysKey] = coordSys;

            // Set tooltip (like 'cross') is a convienent way to show axisPointer
            // for user. So we enable seting tooltip on coordSys model.
            var coordSysModel = coordSys.model;
            var baseTooltipModel = coordSysModel.getModel('tooltip', globalTooltipModel);

            each(coordSys.getAxes(), curry(saveTooltipAxisInfo, false, null));

            // If axis tooltip used, choose tooltip axis for each coordSys.
            // Notice this case: coordSys is `grid` but not `cartesian2D` here.
            if (coordSys.getTooltipAxes
                && globalTooltipModel
                // If tooltip.showContent is set as false, tooltip will not
                // show but axisPointer will show as normal.
                && baseTooltipModel.get('show')
            ) {
                // Compatible with previous logic. But series.tooltip.trigger: 'axis'
                // or series.data[n].tooltip.trigger: 'axis' are not support any more.
                var triggerAxis = baseTooltipModel.get('trigger') === 'axis';
                var cross = baseTooltipModel.get('axisPointer.type') === 'cross';
                var tooltipAxes = coordSys.getTooltipAxes(baseTooltipModel.get('axisPointer.axis'));
                if (triggerAxis || cross) {
                    each(tooltipAxes.baseAxes, curry(
                        saveTooltipAxisInfo, cross ? 'cross' : true, triggerAxis
                    ));
                }
                if (cross) {
                    each(tooltipAxes.otherAxes, curry(saveTooltipAxisInfo, 'cross', false));
                }
            }

            // fromTooltip: true | false | 'cross'
            // triggerTooltip: true | false | null
            function saveTooltipAxisInfo(fromTooltip, triggerTooltip, axis) {
                var axisPointerModel = axis.model.getModel('axisPointer', globalAxisPointerModel);

                var axisPointerShow = axisPointerModel.get('show');
                if (!axisPointerShow || (
                    axisPointerShow === 'auto'
                    && !fromTooltip
                    && !isHandleTrigger(axisPointerModel)
                )) {
                    return;
                }

                if (triggerTooltip == null) {
                    triggerTooltip = axisPointerModel.get('triggerTooltip');
                }

                axisPointerModel = fromTooltip
                    ? makeAxisPointerModel(
                        axis, baseTooltipModel, globalAxisPointerModel, ecModel,
                        fromTooltip, triggerTooltip
                    )
                    : axisPointerModel;

                var snap = axisPointerModel.get('snap');
                var key = makeKey(axis.model);
                var involveSeries = triggerTooltip || snap;
                // If result.axesInfo[key] exist, override it (tooltip has higher priority).
                var axisInfo = result.axesInfo[key] = {
                    axis: axis,
                    coordSys: coordSys,
                    axisPointerModel: axisPointerModel,
                    triggerTooltip: triggerTooltip,
                    involveSeries: involveSeries,
                    snap: snap,
                    alwaysShow: isHandleTrigger(axisPointerModel),
                    actions: [],
                    seriesModels: []
                };
                axesInfoInCoordSys[key] = axisInfo;
                result.seriesInvolved |= involveSeries;

                var groupIndex = getLinkGroupIndex(linksOption, axis);
                if (groupIndex != null) {
                    (result.linkGroups[groupIndex] || (result.linkGroups[groupIndex] = {}))[key] = axisInfo;
                }
            }
        });
    }

    function makeAxisPointerModel(
        axis, baseTooltipModel, globalAxisPointerModel, ecModel, fromTooltip, triggerTooltip
    ) {
        var tooltipAxisPointerModel = baseTooltipModel.getModel('axisPointer');
        var volatileOption = {};

        each(['type', 'precision', 'snap', 'lineStyle', 'shadowStyle', 'label'], function (field) {
            volatileOption[field] = zrUtil.clone(tooltipAxisPointerModel.get(field));
        });

        // category axis do not auto snap, otherwise some tick that do not
        // has value can not be hovered. value/time/log axis default snap if
        // triggered from tooltip and trigger tooltip.
        volatileOption.snap = axis.type !== 'category' && !!triggerTooltip;

        // Compatibel with previous behavior, tooltip axis do not show label by default.
        // Only these properties can be overrided from tooltip to axisPointer.
        if (tooltipAxisPointerModel.get('type') === 'cross') {
            volatileOption.type = 'line';
        }
        var labelOption = volatileOption.label || (volatileOption.label = {});
        labelOption.show = false;

        if (fromTooltip === 'cross') {
            // When 'cross', both axes show labels.
            labelOption.show = true;
            // If triggerTooltip, this is a base axis, which should better not use cross style
            // (cross style is dashed by default)
            if (!triggerTooltip) {
                var crossStyle = volatileOption.lineStyle = tooltipAxisPointerModel.get('crossStyle');
                volatileOption.label.textStyle = crossStyle && crossStyle.textStyle;
            }
        }

        return axis.model.getModel(
            'axisPointer',
            new Model(volatileOption, globalAxisPointerModel, ecModel)
        );
    }

    function collectSeriesInfo(result, ecModel) {
        // Prepare data for axis trigger
        ecModel.eachSeries(function (seriesModel) {

            // Notice this case: this coordSys is `cartesian2D` but not `grid`.
            var coordSys = seriesModel.coordinateSystem;
            var seriesTooltipTrigger = seriesModel.get('tooltip.trigger', true);
            if (!coordSys
                || seriesTooltipTrigger === 'none'
                || seriesTooltipTrigger === false
                || seriesTooltipTrigger === 'item'
                || seriesModel.get('axisPointer.show', true) === false
            ) {
                return;
            }

            each(result.coordSysAxesInfo[makeKey(coordSys.model)], function (axisInfo) {
                var axis = axisInfo.axis;
                if (coordSys.getAxis(axis.dim) === axis) {
                    axisInfo.seriesModels.push(seriesModel);
                }
            });

        }, this);
    }

    /**
     * For example:
     * {
     *     axisPointer: {
     *         links: [{
     *             xAxisIndex: [2, 4],
     *             yAxisIndex: 'all'
     *         }, {
     *             xAxisId: ['a5', 'a7'],
     *             xAxisName: 'xxx'
     *         }]
     *     }
     * }
     */
    function getLinkGroupIndex(linksOption, axis) {
        var axisModel = axis.model;
        var dim = axis.dim;
        for (var i = 0; i < linksOption.length; i++) {
            var linkOption = linksOption[i] || {};
            if (checkPropInLink(linkOption[dim + 'AxisId'], axisModel.id)
                || checkPropInLink(linkOption[dim + 'AxisIndex'], axisModel.componentIndex)
                || checkPropInLink(linkOption[dim + 'AxisName'], axisModel.name)
            ) {
                return i;
            }
        }
    }

    function checkPropInLink(linkPropValue, axisPropValue) {
        return linkPropValue === 'all'
            || (zrUtil.isArray(linkPropValue) && zrUtil.indexOf(linkPropValue, axisPropValue) >= 0)
            || linkPropValue === axisPropValue;
    }

    // If handle used, axisPointer will always be displayed, so value
    // and status should be initialized.
    helper.initializeValue = function (coordSysAxesInfo) {
        each(coordSysAxesInfo.axesInfo, function (axisInfo) {
            var axisPointerModel = axisInfo.axisPointerModel;
            var status = axisPointerModel.get('status');
            var value = axisPointerModel.get('value');
            var option = axisPointerModel.option;

            if (status == null) {
                option.status = isHandleTrigger(axisPointerModel) ? 'show' : 'hide';
            }
            // Pick a value on axis.
            if (value == null) {
                value = axisInfo.axis.getExtent()[0];
            }
            // Parse init value for category and time axis.
            option.value = axisInfo.axis.scale.parse(value);
        });
    };

    helper.getAxisPointerModel = function (axisModel, ecModel) {
        var coordSysAxesInfo = ecModel.getComponent('axisPointer').coordSysAxesInfo;
        var axisInfo = coordSysAxesInfo && coordSysAxesInfo.axesInfo[makeKey(axisModel)];
        return axisInfo && axisInfo.axisPointerModel;
    };

    function isHandleTrigger(axisPointerModel) {
        return axisPointerModel.get('triggerOn') === 'handle';
    }

    function makeKey(model) {
        return model.type + '|' + model.id;
    }

    return helper;

});