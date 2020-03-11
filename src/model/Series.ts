    /*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import {__DEV__} from '../config';
import * as zrUtil from 'zrender/src/core/util';
import env from 'zrender/src/core/env';
import {
    formatTime,
    encodeHTML,
    addCommas,
    getTooltipMarker
} from '../util/format';
import * as modelUtil from '../util/model';
import {
    DataHost, DimensionName, StageHandlerProgressParams,
    SeriesOption, TooltipRenderMode, ZRColor, BoxLayoutOptionMixin, ScaleDataValue, Dictionary, ColorString
} from '../util/types';
import ComponentModel, { ComponentModelConstructor } from './Component';
import {ColorPaletteMixin} from './mixin/colorPalette';
import DataFormatMixin from '../model/mixin/dataFormat';
import Model from '../model/Model';
import {
    getLayoutParams,
    mergeLayoutParam,
    fetchLayoutMode
} from '../util/layout';
import {createTask} from '../stream/task';
import {
    prepareSource,
    getSource
} from '../data/helper/sourceHelper';
import {retrieveRawValue} from '../data/helper/dataProvider';
import GlobalModel from './Global';
import { CoordinateSystem } from '../coord/CoordinateSystem';
import { ExtendableConstructor, mountExtend, Constructor } from '../util/clazz';
import { PipelineContext, SeriesTaskContext, GeneralTask, OverallTask, SeriesTask } from '../stream/Scheduler';
import LegendVisualProvider from '../visual/LegendVisualProvider';
import List from '../data/List';
import Source from '../data/Source';
import Axis from '../coord/Axis';
import { GradientObject } from 'zrender/src/graphic/Gradient';

var inner = modelUtil.makeInner<{
    data: List
    dataBeforeProcessed: List
}>();

interface SeriesModel {
    /**
     * Convinient for override in extended class.
     * Implement it if needed.
     */
    preventIncremental(): boolean;
    /**
     * See tooltip.
     * Implement it if needed.
     * @return Point of tooltip. null/undefined can be returned.
     */
    getTooltipPosition(dataIndex: number): number[];

    /**
     * Get data indices for show tooltip content. See tooltip.
     * Implement it if needed.
     */
    getAxisTooltipData(
        dim: DimensionName[],
        value: ScaleDataValue,
        baseAxis: Axis
    ): {
        dataIndices: number[],
        nestestValue: any
    };
}

class SeriesModel<Opt extends SeriesOption = SeriesOption> extends ComponentModel<Opt> {

    // [Caution]: for compat the previous "class extend"
    // publich and protected fields must be initialized on
    // prototype rather than in constructor. Otherwise the
    // subclass overrided filed will be overwritten by this
    // class. That is, they should not be initialized here.

    // @readonly
    type: string;

    // Should be implenented in subclass.
    defaultOption: SeriesOption;

    // @readonly
    seriesIndex: number;

    // coodinateSystem will be injected in the echarts/CoordinateSystem
    coordinateSystem: CoordinateSystem;

    // Injected outside
    dataTask: SeriesTask;
    // Injected outside
    pipelineContext: PipelineContext;

    // legend visual provider to the legend component
    legendVisualProvider: LegendVisualProvider;

    // Access path of color for visual
    visualColorAccessPath: string[];

    // Access path of borderColor for visual
    visualBorderColorAccessPath: string[];

    readonly preventUsingHoverLayer: boolean;

    static protoInitialize = (function () {
        var proto = SeriesModel.prototype;
        proto.type = 'series.__base__';
        proto.seriesIndex = 0;
        proto.visualColorAccessPath = ['itemStyle', 'color'];
        proto.visualBorderColorAccessPath = ['itemStyle', 'borderColor'];
    })();


    init(option: Opt, parentModel: Model, ecModel: GlobalModel) {

        this.seriesIndex = this.componentIndex;

        this.dataTask = createTask<SeriesTaskContext>({
            count: dataTaskCount,
            reset: dataTaskReset
        });
        this.dataTask.context = {model: this};

        this.mergeDefaultAndTheme(option, ecModel);

        prepareSource(this);

        var data = this.getInitialData(option, ecModel);
        wrapData(data, this);
        this.dataTask.context.data = data;

        if (__DEV__) {
            zrUtil.assert(data, 'getInitialData returned invalid data.');
        }

        inner(this).dataBeforeProcessed = data;

        // If we reverse the order (make data firstly, and then make
        // dataBeforeProcessed by cloneShallow), cloneShallow will
        // cause data.graph.data !== data when using
        // module:echarts/data/Graph or module:echarts/data/Tree.
        // See module:echarts/data/helper/linkList

        // Theoretically, it is unreasonable to call `seriesModel.getData()` in the model
        // init or merge stage, because the data can be restored. So we do not `restoreData`
        // and `setData` here, which forbids calling `seriesModel.getData()` in this stage.
        // Call `seriesModel.getRawData()` instead.
        // this.restoreData();

        autoSeriesName(this);
    }

    /**
     * Util for merge default and theme to option
     */
    mergeDefaultAndTheme(option: Opt, ecModel: GlobalModel): void {
        var layoutMode = fetchLayoutMode(this);
        var inputPositionParams = layoutMode
            ? getLayoutParams(option as BoxLayoutOptionMixin) : {};

        // Backward compat: using subType on theme.
        // But if name duplicate between series subType
        // (for example: parallel) add component mainType,
        // add suffix 'Series'.
        var themeSubType = this.subType;
        if ((ComponentModel as ComponentModelConstructor).hasClass(themeSubType)) {
            themeSubType += 'Series';
        }
        zrUtil.merge(
            option,
            ecModel.getTheme().get(this.subType)
        );
        zrUtil.merge(option, this.getDefaultOption());

        // Default label emphasis `show`
        modelUtil.defaultEmphasis(option, 'label', ['show']);

        this.fillDataTextStyle(option.data as ArrayLike<any>);

        if (layoutMode) {
            mergeLayoutParam(option as BoxLayoutOptionMixin, inputPositionParams, layoutMode);
        }
    }

    mergeOption(newSeriesOption: Opt, ecModel: GlobalModel) {
        // this.settingTask.dirty();

        newSeriesOption = zrUtil.merge(this.option, newSeriesOption, true);
        this.fillDataTextStyle(newSeriesOption.data as ArrayLike<any>);

        var layoutMode = fetchLayoutMode(this);
        if (layoutMode) {
            mergeLayoutParam(
                this.option as BoxLayoutOptionMixin,
                newSeriesOption as BoxLayoutOptionMixin,
                layoutMode
            );
        }

        prepareSource(this);

        var data = this.getInitialData(newSeriesOption, ecModel);
        wrapData(data, this);
        this.dataTask.dirty();
        this.dataTask.context.data = data;

        inner(this).dataBeforeProcessed = data;

        autoSeriesName(this);
    }

    fillDataTextStyle(data: ArrayLike<any>): void {
        // Default data label emphasis `show`
        // FIXME Tree structure data ?
        // FIXME Performance ?
        if (data && !zrUtil.isTypedArray(data)) {
            var props = ['show'];
            for (var i = 0; i < data.length; i++) {
                if (data[i] && data[i].label) {
                    modelUtil.defaultEmphasis(data[i], 'label', props);
                }
            }
        }
    }

    /**
     * Init a data structure from data related option in series
     * Must be overriden.
     */
    getInitialData(option: Opt, ecModel: GlobalModel): List {
        return;
    }

    /**
     * Append data to list
     */
    appendData(params: {data: ArrayLike<any>}): void {
        // FIXME ???
        // (1) If data from dataset, forbidden append.
        // (2) support append data of dataset.
        var data = this.getRawData();
        data.appendData(params.data);
    }

    /**
     * Consider some method like `filter`, `map` need make new data,
     * We should make sure that `seriesModel.getData()` get correct
     * data in the stream procedure. So we fetch data from upstream
     * each time `task.perform` called.
     */
    getData(dataType?: string): List<this> {
        var task = getCurrentTask(this);
        if (task) {
            var data = task.context.data;
            return dataType == null ? data : data.getLinkedData(dataType);
        }
        else {
            // When series is not alive (that may happen when click toolbox
            // restore or setOption with not merge mode), series data may
            // be still need to judge animation or something when graphic
            // elements want to know whether fade out.
            return inner(this).data as List<this>;
        }
    }

    setData(data: List): void {
        var task = getCurrentTask(this);
        if (task) {
            var context = task.context;
            // Consider case: filter, data sample.
            // FIXME:TS never used, so comment it
            // if (context.data !== data && task.modifyOutputEnd) {
            //     task.setOutputEnd(data.count());
            // }
            context.outputData = data;
            // Caution: setData should update context.data,
            // Because getData may be called multiply in a
            // single stage and expect to get the data just
            // set. (For example, AxisProxy, x y both call
            // getData and setDate sequentially).
            // So the context.data should be fetched from
            // upstream each time when a stage starts to be
            // performed.
            if (task !== this.dataTask) {
                context.data = data;
            }
        }
        inner(this).data = data;
    }

    getSource(): Source {
        return getSource(this);
    }

    /**
     * Get data before processed
     */
    getRawData(): List {
        return inner(this).dataBeforeProcessed;
    }

    /**
     * Get base axis if has coordinate system and has axis.
     * By default use coordSys.getBaseAxis();
     * Can be overrided for some chart.
     * @return {type} description
     */
    getBaseAxis(): Axis {
        var coordSys = this.coordinateSystem;
        // @ts-ignore
        return coordSys && coordSys.getBaseAxis && coordSys.getBaseAxis();
    }

    // FIXME
    /**
     * Default tooltip formatter
     *
     * @param dataIndex
     * @param multipleSeries
     * @param dataType
     * @param renderMode valid values: 'html'(by default) and 'richText'.
     *        'html' is used for rendering tooltip in extra DOM form, and the result
     *        string is used as DOM HTML content.
     *        'richText' is used for rendering tooltip in rich text form, for those where
     *        DOM operation is not supported.
     * @return formatted tooltip with `html` and `markers`
     */
    formatTooltip(
        dataIndex: number,
        multipleSeries?: boolean,
        dataType?: string,
        renderMode?: TooltipRenderMode
    ): {
        html: string,
        markers: Dictionary<ColorString>
    } | string { // The override method can also return string

        var series = this;
        renderMode = renderMode || 'html';
        var newLine = renderMode === 'html' ? '<br/>' : '\n';
        var isRichText = renderMode === 'richText';
        var markers: Dictionary<ColorString> = {};
        var markerId = 0;

        function formatArrayValue(value: any[]) {
            // ??? TODO refactor these logic.
            // check: category-no-encode-has-axis-data in dataset.html
            var vertially = zrUtil.reduce(value, function (vertially, val, idx) {
                var dimItem = data.getDimensionInfo(idx);
                return vertially |= (dimItem && dimItem.tooltip !== false && dimItem.displayName != null) as any;
            }, 0);

            var result: string[] = [];

            tooltipDims.length
                ? zrUtil.each(tooltipDims, function (dim) {
                    setEachItem(retrieveRawValue(data, dataIndex, dim), dim);
                })
                // By default, all dims is used on tooltip.
                : zrUtil.each(value, setEachItem);

            function setEachItem(val: any, dim: DimensionName | number): void {
                var dimInfo = data.getDimensionInfo(dim);
                // If `dimInfo.tooltip` is not set, show tooltip.
                if (!dimInfo || dimInfo.otherDims.tooltip === false) {
                    return;
                }
                var dimType = dimInfo.type;
                var markName = 'sub' + series.seriesIndex + 'at' + markerId;
                var dimHead = getTooltipMarker({
                    color: colorStr,
                    type: 'subItem',
                    renderMode: renderMode,
                    markerId: markName
                });

                var dimHeadStr = typeof dimHead === 'string' ? dimHead : dimHead.content;
                var valStr = (vertially
                        ? dimHeadStr + encodeHTML(dimInfo.displayName || '-') + ': '
                        : ''
                    )
                    // FIXME should not format time for raw data?
                    + encodeHTML(dimType === 'ordinal'
                        ? val + ''
                        : dimType === 'time'
                        ? (multipleSeries ? '' : formatTime('yyyy/MM/dd hh:mm:ss', val))
                        : addCommas(val)
                    );
                valStr && result.push(valStr);

                if (isRichText) {
                    markers[markName] = colorStr;
                    ++markerId;
                }
            }

            var newLine = vertially ? (isRichText ? '\n' : '<br/>') : '';
            var content = newLine + result.join(newLine || ', ');
            return {
                renderMode: renderMode,
                content: content,
                style: markers
            };
        }

        function formatSingleValue(val: any) {
            // return encodeHTML(addCommas(val));
            return {
                renderMode: renderMode,
                content: encodeHTML(addCommas(val)),
                style: markers
            };
        }

        var data = this.getData();
        var tooltipDims = data.mapDimension('defaultedTooltip', true);
        var tooltipDimLen = tooltipDims.length;
        var value = this.getRawValue(dataIndex) as any;
        var isValueArr = zrUtil.isArray(value);

        var color = data.getItemVisual(dataIndex, 'color') as ZRColor;
        var colorStr: ColorString;
        if (zrUtil.isString(color)) {
            colorStr = color;
        }
        else if (color && (color as GradientObject).colorStops) {
            colorStr = ((color as GradientObject).colorStops[0] || {}).color;
        }
        colorStr = colorStr || 'transparent';

        // Complicated rule for pretty tooltip.
        var formattedValue = (tooltipDimLen > 1 || (isValueArr && !tooltipDimLen))
            ? formatArrayValue(value)
            : tooltipDimLen
            ? formatSingleValue(retrieveRawValue(data, dataIndex, tooltipDims[0]))
            : formatSingleValue(isValueArr ? value[0] : value);
        var content = formattedValue.content;

        var markName = series.seriesIndex + 'at' + markerId;
        var colorEl = getTooltipMarker({
            color: colorStr,
            type: 'item',
            renderMode: renderMode,
            markerId: markName
        });
        markers[markName] = colorStr;
        ++markerId;

        var name = data.getName(dataIndex);

        var seriesName = this.name;
        if (!modelUtil.isNameSpecified(this)) {
            seriesName = '';
        }
        seriesName = seriesName
            ? encodeHTML(seriesName) + (!multipleSeries ? newLine : ': ')
            : '';

        var colorStr = typeof colorEl === 'string' ? colorEl : colorEl.content;
        var html = !multipleSeries
            ? seriesName + colorStr
                + (name
                    ? encodeHTML(name) + ': ' + content
                    : content
                )
            : colorStr + seriesName + content;

        return {
            html: html,
            markers: markers
        };
    }

    /**
     * @return {boolean}
     */
    isAnimationEnabled() {
        if (env.node) {
            return false;
        }
        var animationEnabled = this.getShallow('animation');
        if (animationEnabled) {
            if (this.getData().count() > this.getShallow('animationThreshold')) {
                animationEnabled = false;
            }
        }
        return animationEnabled;
    }

    restoreData() {
        this.dataTask.dirty();
    }

    getColorFromPalette(name: string, scope: any, requestColorNum?: number): ZRColor {
        var ecModel = this.ecModel;
        // PENDING
        var color = ColorPaletteMixin.prototype.getColorFromPalette.call(this, name, scope, requestColorNum);
        if (!color) {
            color = ecModel.getColorFromPalette(name, scope, requestColorNum);
        }
        return color;
    }

    /**
     * Use `data.mapDimension(coordDim, true)` instead.
     * @deprecated
     */
    coordDimToDataDim(coordDim: DimensionName): DimensionName[] {
        return this.getRawData().mapDimension(coordDim, true);
    }

    /**
     * Get progressive rendering count each step
     */
    getProgressive(): number | false {
        return this.get('progressive');
    }

    /**
     * Get progressive rendering count each step
     */
    getProgressiveThreshold(): number {
        return this.get('progressiveThreshold');
    }


    // /**
    //  * @see {module:echarts/stream/Scheduler}
    //  */
    // abstract pipeTask: null

    static registerClass(clz: Constructor): Constructor {
        return ComponentModel.registerClass(clz);
    }
}

interface SeriesModel<Opt extends SeriesOption = SeriesOption>
    extends DataFormatMixin, ColorPaletteMixin<Opt>, DataHost {

    // methods that can be implemented optionally to provide to components
    /**
     * Get dimension to render shadow in dataZoom component
     */
    getShadowDim?(): string
}
zrUtil.mixin(SeriesModel, DataFormatMixin);
zrUtil.mixin(SeriesModel, ColorPaletteMixin);

export type SeriesModelConstructor = typeof SeriesModel & ExtendableConstructor;
mountExtend(SeriesModel, ComponentModel as SeriesModelConstructor);


/**
 * MUST be called after `prepareSource` called
 * Here we need to make auto series, especially for auto legend. But we
 * do not modify series.name in option to avoid side effects.
 */
function autoSeriesName(seriesModel: SeriesModel): void {
    // User specified name has higher priority, otherwise it may cause
    // series can not be queried unexpectedly.
    var name = seriesModel.name;
    if (!modelUtil.isNameSpecified(seriesModel)) {
        seriesModel.name = getSeriesAutoName(seriesModel) || name;
    }
}

function getSeriesAutoName(seriesModel: SeriesModel): string {
    var data = seriesModel.getRawData();
    var dataDims = data.mapDimension('seriesName', true);
    var nameArr: string[] = [];
    zrUtil.each(dataDims, function (dataDim) {
        var dimInfo = data.getDimensionInfo(dataDim);
        dimInfo.displayName && nameArr.push(dimInfo.displayName);
    });
    return nameArr.join(' ');
}

function dataTaskCount(context: SeriesTaskContext): number {
    return context.model.getRawData().count();
}

function dataTaskReset(context: SeriesTaskContext) {
    var seriesModel = context.model;
    seriesModel.setData(seriesModel.getRawData().cloneShallow());
    return dataTaskProgress;
}

function dataTaskProgress(param: StageHandlerProgressParams, context: SeriesTaskContext): void {
    // Avoid repead cloneShallow when data just created in reset.
    if (param.end > context.outputData.count()) {
        context.model.getRawData().cloneShallow(context.outputData);
    }
}

// TODO refactor
function wrapData(data: List, seriesModel: SeriesModel): void {
    zrUtil.each(data.CHANGABLE_METHODS, function (methodName) {
        data.wrapMethod(methodName as any, zrUtil.curry(onDataSelfChange, seriesModel));
    });
}

function onDataSelfChange(this: List, seriesModel: SeriesModel): void {
    var task = getCurrentTask(seriesModel);
    if (task) {
        // Consider case: filter, selectRange
        task.setOutputEnd(this.count());
    }
}

function getCurrentTask(seriesModel: SeriesModel): GeneralTask {
    var scheduler = (seriesModel.ecModel || {}).scheduler;
    var pipeline = scheduler && scheduler.getPipeline(seriesModel.uid);

    if (pipeline) {
        // When pipline finished, the currrentTask keep the last
        // task (renderTask).
        var task = pipeline.currentTask;
        if (task) {
            var agentStubMap = (task as OverallTask).agentStubMap;
            if (agentStubMap) {
                task = agentStubMap.get(seriesModel.uid);
            }
        }
        return task;
    }
}

export default SeriesModel;
