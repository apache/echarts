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

import ComponentModel from '../../model/Component';
import { BoxLayoutOptionMixin, ComponentOption } from '../../util/types';
import Matrix from './Matrix';
import { MatrixNodeOption } from './MatrixDim';

export interface MatrixOption extends ComponentOption, BoxLayoutOptionMixin {
    mainType?: 'matrix';

    containLabel?: boolean;

    x?: {
        data?: MatrixNodeOption[];
    }
    y?: {
        data?: MatrixNodeOption[];
    }
}

class MatrixModel extends ComponentModel<MatrixOption> {
    static type = 'matrix';
    type = MatrixModel.type;

    coordinateSystem: Matrix;

    static defaultOption: MatrixOption = {
        z: 2,
        left: '10%',
        top: '10%',
        right: '10%',
        bottom: '10%',
        containLabel: false,
        x: {
            data: []
        },
        y: {
            data: []
        }
    }
}

export default MatrixModel;
