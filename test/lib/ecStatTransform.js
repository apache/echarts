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

(function (root) {

    root.ecStatTransform = function (ecStat) {

        var regression = {

            type: 'ecStat:regression',

            transform: function transform(params) {
                var source = params.source;
                var config = params.config || {};
                var method = config.method || 'linear';
                var result = ecStat.regression(method, source.data);

                return [{
                    data: result.points
                }, {
                    data: [[result.expression]]
                }];
            }
        };


        return {
            regression: regression
        }
    };

})(window);
