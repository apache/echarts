define(function (require) {

    var modelUtil = require('../../util/model');
    var zrUtil = require('zrender/core/util');
    var env = require('zrender/core/env');

    var formatUtil = require('../../util/format');
    var addCommas = formatUtil.addCommas;
    var encodeHTML = formatUtil.encodeHTML;

    function fillLabel(opt) {
        modelUtil.defaultEmphasis(
            opt.label,
            modelUtil.LABEL_OPTIONS
        );
    }
    var MarkerModel = require('../../echarts').extendComponentModel({

        type: 'marker',

        dependencies: ['series', 'grid', 'polar', 'geo'],
        /**
         * @overrite
         */
        init: function (option, parentModel, ecModel, extraOpt) {

            if (__DEV__) {
                if (this.type === 'marker') {
                    throw new Error('Marker component is abstract component. Use markLine, markPoint, markArea instead.');
                }
            }
            this.mergeDefaultAndTheme(option, ecModel);
            this.mergeOption(option, ecModel, extraOpt.createdBySelf, true);
        },

        /**
         * @return {boolean}
         */
        ifEnableAnimation: function () {
            if (env.node) {
                return false;
            }

            var hostSeries = this.__hostSeries;
            return this.getShallow('animation') && hostSeries && hostSeries.ifEnableAnimation();
        },

        mergeOption: function (newOpt, ecModel, createdBySelf, isInit) {
            var MarkerModel = this.constructor;
            var modelPropName = this.mainType + 'Model';
            if (!createdBySelf) {
                ecModel.eachSeries(function (seriesModel) {

                    var markerOpt = seriesModel.get(this.mainType);

                    var markerModel = seriesModel[modelPropName];
                    if (!markerOpt || !markerOpt.data) {
                        seriesModel[modelPropName] = null;
                        return;
                    }
                    if (!markerModel) {
                        if (isInit) {
                            // Default label emphasis `position` and `show`
                            fillLabel(markerOpt);
                        }
                        zrUtil.each(markerOpt.data, function (item) {
                            // FIXME Overwrite fillLabel method ?
                            if (item instanceof Array) {
                                fillLabel(item[0]);
                                fillLabel(item[1]);
                            }
                            else {
                                fillLabel(item);
                            }
                        });

                        markerModel = new MarkerModel(
                            markerOpt, this, ecModel
                        );

                        zrUtil.extend(markerModel, {
                            mainType: this.mainType,
                            // Use the same series index and name
                            seriesIndex: seriesModel.seriesIndex,
                            name: seriesModel.name,
                            createdBySelf: true
                        });

                        markerModel.__hostSeries = seriesModel;
                    }
                    else {
                        markerModel.mergeOption(markerOpt, ecModel, true);
                    }
                    seriesModel[modelPropName] = markerModel;
                }, this);
            }
        },

        formatTooltip: function (dataIndex) {
            var data = this.getData();
            var value = this.getRawValue(dataIndex);
            var formattedValue = zrUtil.isArray(value)
                ? zrUtil.map(value, addCommas).join(', ') : addCommas(value);
            var name = data.getName(dataIndex);
            var html = this.name;
            if (value != null || name) {
                html += '<br />';
            }
            if (name) {
                html += encodeHTML(name);
                if (value != null) {
                    html += ' : ';
                }
            }
            if (value != null) {
                html += formattedValue;
            }
            return html;
        },

        getData: function () {
            return this._data;
        },

        setData: function (data) {
            this._data = data;
        }
    });

    zrUtil.mixin(MarkerModel, modelUtil.dataFormatMixin);

    return MarkerModel;
});