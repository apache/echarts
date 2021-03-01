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

// These APIs are for more advanced usages
// For example extend charts and components, creating graphic elements, formatting.
import ComponentModel, { ComponentModelConstructor } from '../model/Component';
import ComponentView, { ComponentViewConstructor } from '../view/Component';
import SeriesModel, { SeriesModelConstructor } from '../model/Series';
import ChartView, { ChartViewConstructor } from '../view/Chart';


// Provide utilities API in echarts. It will be in echarts namespace.
// Like echarts.util, echarts.graphic
export * as zrender from 'zrender/src/zrender';

export * as matrix from 'zrender/src/core/matrix';
export * as vector from 'zrender/src/core/vector';
export * as zrUtil from 'zrender/src/core/util';
export * as color from 'zrender/src/tool/color';
export {throttle} from '../util/throttle';
export * as helper from './api/helper';

export {use} from '../extension';

//////////////// Helper Methods /////////////////////
export {default as parseGeoJSON} from '../coord/geo/parseGeoJson';
export {default as parseGeoJson} from '../coord/geo/parseGeoJson';

export * as number from './api/number';
export * as time from './api/time';
export * as graphic from './api/graphic';

export * as format from './api/format';

export * as util from './api/util';

export {default as env} from 'zrender/src/core/env';

//////////////// Export for Exension Usage ////////////////
export {default as List} from '../data/List';
export {default as Model} from '../model/Model';
export {default as Axis} from '../coord/Axis';

export {
    ComponentModel,
    ComponentView,
    SeriesModel,
    ChartView
};

// Only for GL
export {brushSingle as innerDrawElementOnCanvas} from 'zrender/src/canvas/graphic';


//////////////// Deprecated Extension Methods ////////////////

// Should use `ComponentModel.extend` or `class XXXX extend ComponentModel` to create class.
// Then use `registerComponentModel` in `install` parameter when `use` this extension. For example:
// class Bar3DModel extends ComponentModel {}
// export function install(registers) { regsiters.registerComponentModel(Bar3DModel); }
// echarts.use(install);
export function extendComponentModel(proto: object): ComponentModel {
    const Model = (ComponentModel as ComponentModelConstructor).extend(proto) as any;
    ComponentModel.registerClass(Model);
    return Model;
}

export function extendComponentView(proto: object): ChartView {
    const View = (ComponentView as ComponentViewConstructor).extend(proto) as any;
    ComponentView.registerClass(View);
    return View;
}

export function extendSeriesModel(proto: object): SeriesModel {
    const Model = (SeriesModel as SeriesModelConstructor).extend(proto) as any;
    SeriesModel.registerClass(Model);
    return Model;
}

export function extendChartView(proto: object): ChartView {
    const View = (ChartView as ChartViewConstructor).extend(proto) as any;
    ChartView.registerClass(View);
    return View;
}
