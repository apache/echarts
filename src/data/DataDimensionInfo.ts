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

import * as zrUtil from 'zrender/src/core/util';

/**
 * @class
 * @param {Object|DataDimensionInfo} [opt] All of the fields will be shallow copied.
 */
function DataDimensionInfo(opt) {
    if (opt != null) {
        zrUtil.extend(this, opt);
    }

    /**
     * Dimension name.
     * Mandatory.
     * @type {string}
     */
    // this.name;

    /**
     * The origin name in dimsDef, see source helper.
     * If displayName given, the tooltip will displayed vertically.
     * Optional.
     * @type {string}
     */
    // this.displayName;

    /**
     * Which coordSys dimension this dimension mapped to.
     * A `coordDim` can be a "coordSysDim" that the coordSys required
     * (for example, an item in `coordSysDims` of `model/referHelper#CoordSysInfo`),
     * or an generated "extra coord name" if does not mapped to any "coordSysDim"
     * (That is determined by whether `isExtraCoord` is `true`).
     * Mandatory.
     * @type {string}
     */
    // this.coordDim;

    /**
     * The index of this dimension in `series.encode[coordDim]`.
     * Mandatory.
     * @type {number}
     */
    // this.coordDimIndex;

    /**
     * Dimension type. The enumerable values are the key of
     * `dataCtors` of `data/List`.
     * Optional.
     * @type {string}
     */
    // this.type;

    /**
     * This index of this dimension info in `data/List#_dimensionInfos`.
     * Mandatory after added to `data/List`.
     * @type {number}
     */
    // this.index;

    /**
     * The format of `otherDims` is:
     * ```js
     * {
     *     tooltip: number optional,
     *     label: number optional,
     *     itemName: number optional,
     *     seriesName: number optional,
     * }
     * ```
     *
     * A `series.encode` can specified these fields:
     * ```js
     * encode: {
     *     // "3, 1, 5" is the index of data dimension.
     *     tooltip: [3, 1, 5],
     *     label: [0, 3],
     *     ...
     * }
     * ```
     * `otherDims` is the parse result of the `series.encode` above, like:
     * ```js
     * // Suppose the index of this data dimension is `3`.
     * this.otherDims = {
     *     // `3` is at the index `0` of the `encode.tooltip`
     *     tooltip: 0,
     *     // `3` is at the index `1` of the `encode.tooltip`
     *     label: 1
     * };
     * ```
     *
     * This prop should never be `null`/`undefined` after initialized.
     * @type {Object}
     */
    this.otherDims = {};

    /**
     * Be `true` if this dimension is not mapped to any "coordSysDim" that the
     * "coordSys" required.
     * Mandatory.
     * @type {boolean}
     */
    // this.isExtraCoord;

    /**
     * @type {module:data/OrdinalMeta}
     */
    // this.ordinalMeta;

    /**
     * Whether to create inverted indices.
     * @type {boolean}
     */
    // this.createInvertedIndices;
};

export default DataDimensionInfo;
