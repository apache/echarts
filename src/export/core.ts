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

import { ComponentOption, ECBasicOption as EChartsCoreOption, SeriesOption } from '../util/types';

export * from '../echarts';
export * from './api';

export {EChartsCoreOption};

type ComposeUnitOption<ComponentsOptionUnion extends ComponentOption, SeriesOptionUnion extends SeriesOption> =
    EChartsCoreOption & {
        [key in ComponentsOptionUnion['mainType']]: ComponentsOptionUnion | ComponentsOptionUnion[];
    } & {
        series?: SeriesOptionUnion | SeriesOptionUnion[]
    };

export type ComposeOption<ComponentsOptionUnion extends ComponentOption, SeriesOptionUnion extends SeriesOption> =
    ComposeUnitOption<ComponentsOptionUnion, SeriesOptionUnion> & {
        baseOption?: ComposeUnitOption<ComponentsOptionUnion, SeriesOptionUnion>
        options?: ComposeUnitOption<ComponentsOptionUnion, SeriesOptionUnion>[]
    };