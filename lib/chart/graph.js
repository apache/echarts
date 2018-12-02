
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

var echarts = require("../echarts");

require("./graph/GraphSeries");

require("./graph/GraphView");

require("./graph/graphAction");

var categoryFilter = require("./graph/categoryFilter");

var visualSymbol = require("../visual/symbol");

var categoryVisual = require("./graph/categoryVisual");

var edgeVisual = require("./graph/edgeVisual");

var simpleLayout = require("./graph/simpleLayout");

var circularLayout = require("./graph/circularLayout");

var forceLayout = require("./graph/forceLayout");

var createView = require("./graph/createView");

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
echarts.registerProcessor(categoryFilter);
echarts.registerVisual(visualSymbol('graph', 'circle', null));
echarts.registerVisual(categoryVisual);
echarts.registerVisual(edgeVisual);
echarts.registerLayout(simpleLayout);
echarts.registerLayout(circularLayout);
echarts.registerLayout(forceLayout); // Graph view coordinate system

echarts.registerCoordinateSystem('graphView', {
  create: createView
});