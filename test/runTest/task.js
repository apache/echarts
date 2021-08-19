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

function runTasks(
    taskParamsLists,
    createTask,
    concurrency
) {
    concurrency = Math.min(taskParamsLists.length, concurrency);
    return new Promise((resolve, reject) => {
        let runningTaskCount = 0;
        let cursor = 0;
        let rets = [];

        function finishTask(res, idx) {
            rets[idx] = res;
            processNext();
        }

        function failTask(e) {
            console.error(e);
            processNext();
        }

        function processNext() {
            runningTaskCount--;
            addTask();

            if (runningTaskCount === 0) {
                resolve(rets);
            }
        }

        function addTask() {
            const param = taskParamsLists[cursor];
            if (param) {
                const currentTaskIdx = cursor;
                runningTaskCount++;
                createTask(param)
                    .then((res) => finishTask(res, currentTaskIdx))
                    .catch(failTask);
                cursor++;
            }
        }

        for (let i = 0; i < concurrency; i++) {
            addTask();
        }

        if (!runningTaskCount) {
            resolve(rets);
        }
    });
}

module.exports.runTasks = runTasks;