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

export * from './echarts';
export * from './export/api';

import './component/dataset';

import './chart/line';
import './chart/bar';
import './chart/pie';
import './chart/scatter';
import './component/graphic';
import './component/tooltip';
import './component/axisPointer';
import './component/legendScroll';

import './component/grid';
import './component/title';

import './component/markPoint';
import './component/markLine';
import './component/markArea';
import './component/dataZoom';
import './component/toolbox';
import './component/aria';

// import 'zrender/vml/vml';
import 'zrender/src/svg/svg';
