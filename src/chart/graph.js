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

import * as echarts from '../echarts';

import './graph/GraphSeries';
import './graph/GraphView';
import './graph/graphAction';

import categoryFilter from './graph/categoryFilter';
import visualSymbol from '../visual/symbol';
import categoryVisual from './graph/categoryVisual';
import edgeVisual from './graph/edgeVisual';
import simpleLayout from './graph/simpleLayout';
import circularLayout from './graph/circularLayout';
import forceLayout from './graph/forceLayout';
import createView from './graph/createView';

echarts.registerProcessor(categoryFilter);

echarts.registerVisual(visualSymbol('graph', 'circle', null));
echarts.registerVisual(categoryVisual);
echarts.registerVisual(edgeVisual);

echarts.registerLayout(simpleLayout);
echarts.registerLayout(circularLayout);
echarts.registerLayout(forceLayout);

// Graph view coordinate system
echarts.registerCoordinateSystem('graphView', {
    create: createView
});