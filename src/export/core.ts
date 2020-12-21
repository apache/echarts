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

import { ComponentOption, ECBasicOption as EChartsCoreOption } from '../util/types';

export * from '../echarts';
export * from './api';

export {EChartsType as ECharts} from '../echarts';

export {EChartsCoreOption};

type ComposeUnitOption<OptionUnion extends ComponentOption = never> =
    EChartsCoreOption & {
        [key in OptionUnion['mainType']]?: OptionUnion | OptionUnion[];
    };

export type ComposeOption<OptionUnion extends ComponentOption> =
    ComposeUnitOption<OptionUnion> & {
        baseOption?: ComposeUnitOption<OptionUnion>
        options?: ComposeUnitOption<OptionUnion>[]
    };