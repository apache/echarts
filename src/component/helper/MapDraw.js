/**
 * @module echarts/component/helper/MapDraw
 */
define(function (require) {

    var RoamController = require('./RoamController');
    var roamHelper = require('../../component/helper/roamHelper');
    var cursorHelper = require('../../component/helper/cursorHelper');
    var graphic = require('../../util/graphic');
    var zrUtil = require('zrender/core/util');

    function getFixedItemStyle(model, scale) {
        var itemStyle = model.getItemStyle();
        var areaColor = model.get('areaColor');

        // If user want the color not to be changed when hover,
        // they should both set areaColor and color to be null.
        if (areaColor != null) {
            itemStyle.fill = areaColor;
        }

        return itemStyle;
    }

    function updateMapSelectHandler(mapDraw, mapOrGeoModel, group, api, fromView) {
        group.off('click');
        group.off('mousedown');

        if (mapOrGeoModel.get('selectedMode')) {

            group.on('mousedown', function () {
                mapDraw._mouseDownFlag = true;
            });

            group.on('click', function (e) {
                if (!mapDraw._mouseDownFlag) {
                    return;
                }
                mapDraw._mouseDownFlag = false;

                var el = e.target;
                while (!el.__regions) {
                    el = el.parent;
                }
                if (!el) {
                    return;
                }

                var action = {
                    type: (mapOrGeoModel.mainType === 'geo' ? 'geo' : 'map') + 'ToggleSelect',
                    batch: zrUtil.map(el.__regions, function (region) {
                        return {
                            name: region.name,
                            from: fromView.uid
                        };
                    })
                };
                action[mapOrGeoModel.mainType + 'Id'] = mapOrGeoModel.id;

                api.dispatchAction(action);

                updateMapSelected(mapOrGeoModel, group);
            });
        }
    }

    function updateMapSelected(mapOrGeoModel, group) {
        // FIXME
        group.eachChild(function (otherRegionEl) {
            zrUtil.each(otherRegionEl.__regions, function (region) {
                otherRegionEl.trigger(mapOrGeoModel.isSelected(region.name) ? 'emphasis' : 'normal');
            });
        });
    }

    /**
     * @alias module:echarts/component/helper/MapDraw
     * @param {module:echarts/ExtensionAPI} api
     * @param {boolean} updateGroup
     */
    function MapDraw(api, updateGroup) {

        var group = new graphic.Group();

        /**
         * @type {module:echarts/component/helper/RoamController}
         * @private
         */
        this._controller = new RoamController(api.getZr());

        /**
         * @type {Object} {target, zoom, zoomLimit}
         * @private
         */
        this._controllerHost = {target: updateGroup ? group : null};

        /**
         * @type {module:zrender/container/Group}
         * @readOnly
         */
        this.group = group;

        /**
         * @type {boolean}
         * @private
         */
        this._updateGroup = updateGroup;

        /**
         * This flag is used to make sure that only one among
         * `pan`, `zoom`, `click` can occurs, otherwise 'selected'
         * action may be triggered when `pan`, which is unexpected.
         * @type {booelan}
         */
        this._mouseDownFlag;
    }

    MapDraw.prototype = {

        constructor: MapDraw,

        draw: function (mapOrGeoModel, ecModel, api, fromView, payload) {

            var isGeo = mapOrGeoModel.mainType === 'geo';

            // map series has data, geo model that controlled by map series
            // has no data, otherwise data exists.
            var data = mapOrGeoModel.getData && mapOrGeoModel.getData();
            isGeo && ecModel.eachComponent({mainType: 'series', subType: 'map'}, function (mapSeries) {
                if (!data && mapSeries.getHostGeoModel() === mapOrGeoModel) {
                    data = mapSeries.getData();
                }
            });

            var geo = mapOrGeoModel.coordinateSystem;

            var group = this.group;

            var scale = geo.scale;
            var groupNewProp = {
                position: geo.position,
                scale: scale
            };

            // No animation when first draw or in action
            if (!group.childAt(0) || payload) {
                group.attr(groupNewProp);
            }
            else {
                graphic.updateProps(group, groupNewProp, mapOrGeoModel);
            }

            group.removeAll();

            var itemStyleAccessPath = ['itemStyle', 'normal'];
            var hoverItemStyleAccessPath = ['itemStyle', 'emphasis'];
            var labelAccessPath = ['label', 'normal'];
            var hoverLabelAccessPath = ['label', 'emphasis'];
            var nameMap = zrUtil.createHashMap();

            zrUtil.each(geo.regions, function (region) {

                // Consider in GeoJson properties.name may be duplicated, for example,
                // there is multiple region named "United Kindom" or "France" (so many
                // colonies). And it is not appropriate to merge them in geo, which
                // will make them share the same label and bring trouble in label
                // location calculation.
                var regionGroup = nameMap.get(region.name)
                    || nameMap.set(region.name, new graphic.Group());

                var compoundPath = new graphic.CompoundPath({
                    shape: {
                        paths: []
                    }
                });
                regionGroup.add(compoundPath);

                var regionModel = mapOrGeoModel.getRegionModel(region.name) || mapOrGeoModel;

                var itemStyleModel = regionModel.getModel(itemStyleAccessPath);
                var hoverItemStyleModel = regionModel.getModel(hoverItemStyleAccessPath);
                var itemStyle = getFixedItemStyle(itemStyleModel, scale);
                var hoverItemStyle = getFixedItemStyle(hoverItemStyleModel, scale);

                var labelModel = regionModel.getModel(labelAccessPath);
                var hoverLabelModel = regionModel.getModel(hoverLabelAccessPath);

                var dataIdx;
                // Use the itemStyle in data if has data
                if (data) {
                    dataIdx = data.indexOfName(region.name);
                    // Only visual color of each item will be used. It can be encoded by dataRange
                    // But visual color of series is used in symbol drawing
                    //
                    // Visual color for each series is for the symbol draw
                    var visualColor = data.getItemVisual(dataIdx, 'color', true);
                    if (visualColor) {
                        itemStyle.fill = visualColor;
                    }
                }

                var textStyleModel = labelModel.getModel('textStyle');
                var hoverTextStyleModel = hoverLabelModel.getModel('textStyle');

                zrUtil.each(region.geometries, function (geometry) {
                    if (geometry.type !== 'polygon') {
                        return;
                    }
                    compoundPath.shape.paths.push(new graphic.Polygon({
                        shape: {
                            points: geometry.exterior
                        }
                    }));

                    for (var i = 0; i < (geometry.interiors ? geometry.interiors.length : 0); i++) {
                        compoundPath.shape.paths.push(new graphic.Polygon({
                            shape: {
                                points: geometry.interiors[i]
                            }
                        }));
                    }
                });

                compoundPath.setStyle(itemStyle);
                compoundPath.style.strokeNoScale = true;
                compoundPath.culling = true;
                // Label
                var showLabel = labelModel.get('show');
                var hoverShowLabel = hoverLabelModel.get('show');

                var isDataNaN = data && isNaN(data.get('value', dataIdx));
                var itemLayout = data && data.getItemLayout(dataIdx);
                // In the following cases label will be drawn
                // 1. In map series and data value is NaN
                // 2. In geo component
                // 4. Region has no series legendSymbol, which will be add a showLabel flag in mapSymbolLayout
                if (
                    (isGeo || isDataNaN && (showLabel || hoverShowLabel))
                 || (itemLayout && itemLayout.showLabel)
                 ) {
                    var query = data ? dataIdx : region.name;
                    var formattedStr = mapOrGeoModel.getFormattedLabel(query, 'normal');
                    var hoverFormattedStr = mapOrGeoModel.getFormattedLabel(query, 'emphasis');
                    var text = new graphic.Text({
                        style: {
                            text: showLabel ? (formattedStr || region.name) : '',
                            fill: textStyleModel.getTextColor(),
                            textFont: textStyleModel.getFont(),
                            textAlign: 'center',
                            textVerticalAlign: 'middle'
                        },
                        hoverStyle: {
                            text: hoverShowLabel ? (hoverFormattedStr || region.name) : '',
                            fill: hoverTextStyleModel.getTextColor(),
                            textFont: hoverTextStyleModel.getFont()
                        },
                        position: region.center.slice(),
                        scale: [1 / scale[0], 1 / scale[1]],
                        z2: 10,
                        silent: true
                    });

                    regionGroup.add(text);
                }

                // setItemGraphicEl, setHoverStyle after all polygons and labels
                // are added to the rigionGroup
                if (data) {
                    data.setItemGraphicEl(dataIdx, regionGroup);
                }
                else {
                    var regionModel = mapOrGeoModel.getRegionModel(region.name);
                    // Package custom mouse event for geo component
                    compoundPath.eventData = {
                        componentType: 'geo',
                        geoIndex: mapOrGeoModel.componentIndex,
                        name: region.name,
                        region: (regionModel && regionModel.option) || {}
                    };
                }

                var groupRegions = regionGroup.__regions || (regionGroup.__regions = []);
                groupRegions.push(region);

                graphic.setHoverStyle(
                    regionGroup,
                    hoverItemStyle,
                    {hoverSilentOnTouch: !!mapOrGeoModel.get('selectedMode')}
                );

                group.add(regionGroup);
            });

            this._updateController(mapOrGeoModel, ecModel, api);

            updateMapSelectHandler(this, mapOrGeoModel, group, api, fromView);

            updateMapSelected(mapOrGeoModel, group);
        },

        remove: function () {
            this.group.removeAll();
            this._controller.dispose();
            this._controllerHost = {};
        },

        _updateController: function (mapOrGeoModel, ecModel, api) {
            var geo = mapOrGeoModel.coordinateSystem;
            var controller = this._controller;
            var controllerHost = this._controllerHost;

            controllerHost.zoomLimit = mapOrGeoModel.get('scaleLimit');
            controllerHost.zoom = geo.getZoom();

            // roamType is will be set default true if it is null
            controller.enable(mapOrGeoModel.get('roam') || false);
            var mainType = mapOrGeoModel.mainType;

            function makeActionBase() {
                var action = {
                    type: 'geoRoam',
                    componentType: mainType
                };
                action[mainType + 'Id'] = mapOrGeoModel.id;
                return action;
            }

            controller.off('pan').on('pan', function (dx, dy) {
                this._mouseDownFlag = false;

                roamHelper.updateViewOnPan(controllerHost, dx, dy);

                api.dispatchAction(zrUtil.extend(makeActionBase(), {
                    dx: dx,
                    dy: dy
                }));
            }, this);

            controller.off('zoom').on('zoom', function (zoom, mouseX, mouseY) {
                this._mouseDownFlag = false;

                roamHelper.updateViewOnZoom(controllerHost, zoom, mouseX, mouseY);

                api.dispatchAction(zrUtil.extend(makeActionBase(), {
                    zoom: zoom,
                    originX: mouseX,
                    originY: mouseY
                }));

                if (this._updateGroup) {
                    var group = this.group;
                    var scale = group.scale;
                    group.traverse(function (el) {
                        if (el.type === 'text') {
                            el.attr('scale', [1 / scale[0], 1 / scale[1]]);
                        }
                    });
                }
            }, this);

            controller.setPointerChecker(function (e, x, y) {
                return geo.getViewRectAfterRoam().contain(x, y)
                    && !cursorHelper.onIrrelevantElement(e, api, mapOrGeoModel);
            });
        }
    };

    return MapDraw;
});