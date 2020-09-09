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

// @ts-nocheck
import * as echarts from 'echarts';
import * as gexf from './gexf';
import prepareBoxplotData from './prepareBoxplotData';
// import { boxplotTransform } from './boxplotTransform';

export const version = '1.0.0';

export {gexf};

export {prepareBoxplotData};
// export {boxplotTransform};

// For backward compatibility, where the namespace `dataTool` will
// be mounted on `echarts` is the extension `dataTool` is imported.
// But the old version of echarts do not have `dataTool` namespace,
// so check it before mounting.
if (echarts.dataTool) {
    echarts.dataTool.version = version;
    echarts.dataTool.gexf = gexf;
    echarts.dataTool.prepareBoxplotData = prepareBoxplotData;
    // echarts.dataTool.boxplotTransform = boxplotTransform;
}
