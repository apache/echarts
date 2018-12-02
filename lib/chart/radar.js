
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

require("../component/radar");

require("./radar/RadarSeries");

require("./radar/RadarView");

var dataColor = require("../visual/dataColor");

var visualSymbol = require("../visual/symbol");

var radarLayout = require("./radar/radarLayout");

var dataFilter = require("../processor/dataFilter");

var backwardCompat = require("./radar/backwardCompat");

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
// Must use radar component
echarts.registerVisual(dataColor('radar'));
echarts.registerVisual(visualSymbol('radar', 'circle'));
echarts.registerLayout(radarLayout);
echarts.registerProcessor(dataFilter('radar'));
echarts.registerPreprocessor(backwardCompat);