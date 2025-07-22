
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

(function (context) {

    var DEFAULT_DATA_TABLE_LIMIT = 8;

    var objToString = Object.prototype.toString;
    var TYPED_ARRAY = {
        '[object Int8Array]': 1,
        '[object Uint8Array]': 1,
        '[object Uint8ClampedArray]': 1,
        '[object Int16Array]': 1,
        '[object Uint16Array]': 1,
        '[object Int32Array]': 1,
        '[object Uint32Array]': 1,
        '[object Float32Array]': 1,
        '[object Float64Array]': 1
    };

    var params = {};
    var parts = location.search.slice(1).split('&');
    for (var i = 0; i < parts.length; ++i) {
        var kv = parts[i].split('=');
        params[kv[0]] = kv[1];
    }

    if ('__SEED_RANDOM__' in params) {
        require(['../node_modules/seedrandom/seedrandom.js'], function (seedrandom) {
            var myRandom = new seedrandom('echarts-random');
            // Fixed random generator
            Math.random = function () {
                return myRandom();
            };
        });
    }

    var testHelper = {};


    /**
     * @param {Object} opt
     * @param {string|string[]} [opt.title] If array, each item is on a single line.
     *        Can use '**abc**', means <strong>abc</strong>.
     * @param {Option} opt.option The chart option.
     *
     * @param {number} [opt.width] Optional. Specify a different chart width.
     * @param {number} [opt.height] Optional. Specify a different chart height.
     * @param {boolean} [opt.notMerge] Optional. `chart.setOption(option, {norMerge});`
     * @param {boolean} [opt.lazyUpdate] Optional. `chart.setOption(option, {lazyUpdate});`
     * @param {boolean} [opt.autoResize=true] Optional. Enable chart auto response to window resize.
     * @param {Function} [opt.onResize] Optional. Available when `opt.autoResize` or `opt.draggable` is true.
     * @param {string} [opt.renderer] Optional. 'canvas' or 'svg'. DO NOT set it in formmal test cases;
     *  leave it controlled by __ECHARTS__DEFAULT__RENDERER__ for visual testing.
     *
     * @param {boolean} [opt.draggable] Optional. Add a draggable button to mutify the chart size.
     *  This feature require "test/lib/draggable.js"
     *
     * @param {string} [opt.inputsStyle='normal'] Optional, can be 'normal', 'compact'.
     *  Can be either `inputsStyle` or `buttonsStyle`.
     * @param {number} [opt.inputsHeight] Optional. By default not fix height. If specified, a scroll
     *  bar will be displayed if overflow the height. In visual test, once a height changed
     *  by adding something, the subsequent position will be changed, leading to test failures.
     *  Fixing the height helps avoid this.
     *  Can be either `inputsHeight` or `buttonsHeight`.
     * @param {boolean} [opt.saveInputsInitialState] Optional.
     *  Required by `chart.__testHelper.restoreInputsToInitialState`
     * @param {InputDefine[]|InputDefine|()=>InputDefine[]} [opt.inputs] Optional.
     *  definitions of button/range/select/br/hr.
     *  They are the same: `opt.buttons` `opt.button`, `opt.inputs`, `opt.input`.
     *  It can be a function that return inputs definitions, like:
     *      inputs: chart => { return [{text: 'xxx', onclick: fn}, ...]; }
     *  Inputs can be these types:
     *  [
     *      {
     *          // A button (default).
     *          text: 'xxx',
     *          // They are the same: `onclick`, `click` (capital insensitive)
     *          onclick: fn,
     *          disabled: false, // Optional.
     *          prevent: {       // Optional.
     *              recordInputs: false, // Optional.
     *              inputsState: false,  // Optional.
     *          },
     *      },
     *      {
     *          // A range slider (HTML <input type="range">).
     *          type: 'range',   // They are the same: 'range' 'slider'
     *          id: 'some_id',   // Optional. Can be used in `switchGroup`.
     *          text: 'xxx',     // Optional
     *          min: 0,          // Optional
     *          max: 100,        // Optional
     *          value: 30,       // Optional. Must be a number.
     *          step: 1,         // Optional
     *          suffix: '%',     // Optional. e.g., '%' means the number is displayed as '33%'
     *          disabled: false, // Optional.
     *          prevent: {       // Optional.
     *              recordInputs: false, // Optional.
     *              inputsState: false,  // Optional.
     *          },
     *          // They are the same: `oninput` `input`
     *          //                    `onchange` `change` `onchanged` `changed`
     *          //                    `onselect` `select` (capital insensitive)
     *          onchange: function () { console.log(this.value); }
     *      },
     *      {
     *          // A select (HTML <select>...</select>).
     *          type: 'select', // They are the same: 'select' 'selection'
     *          id: 'some_id',  // Optional. Can be used in `getState` and `setState`.
     *          // Either `values` or `options` can be used.
     *          // Items in `values` or `options[i].value` can be any type, like `true`, `123`, etc.
     *          values: ['a', 'b', 'c'],
     *          options: [
     *              {text: 'a', value: 123},
     *              {value: {some: {some: 456}}}, // `text` can be omitted and auto generated by `value`.
     *              {text: 'c', input: ...},      // `input` can be used as shown below.
     *              ...
     *          ],
     *          // `options[i]` can nest other input type, currently only support `type: range`:
     *          options: [
     *              {value: undefined},
     *              {text: 'c', input: {
     *                  type: 'range',
     *                  // ... Other properties of `range` input except `onchange` and `text`.
     *                  // When this option is not selected, the range input will be disabled.
     *              }},
     *              // If more than one options have internal `input`, `id` (option id) must be specified.
     *              // It can be visited by `onchange() { if (this.optionId) {...} }`.
     *              {text: 'd', id: 'some_option_id', input: {...}}
     *          ],
     *          optionIndex: 0,          // Optional. Or `valueIndex`. The initial value index.
     *                                   // By default, the first option.
     *          value: 'cval',           // Optional. The initial value. By default, the first option.
     *                                   // Can be any type, like `true`, `123`, etc.
     *                                   // But can only be JS primitive type, as `===` is used internally.
     *          text: 'xxx',             // Optional.
     *          disabled: false,         // Optional.
     *          prevent: {               // Optional.
     *              recordInputs: false, // Optional.
     *              inputsState: false,  // Optional.
     *          },
     *          // They are the same: `oninput` `input`
     *          //                    `onchange` `change` `onchanged` `changed`
     *          //                    `onselect` `select` (capital insensitive)
     *          onchange: function () { console.log(this.value, this.optionId); }
     *      },
     *      {
     *          // Group inputs. Only one group can be displayed at a time with in a group set.
     *          type: 'groups',      // They are the same: 'groups' 'group' 'groupset'
     *          // `inputsHeight` is mandatory in group set to avoid height change to affects visual testing
     *          // when switching groups. It will be applied to all groups.
     *          inputsHeight,
     *          // `inputsHeight` will be applied to all groups.
     *          inputsStyle,
     *          disabled: false,         // Optional. Controlls all groups inside,
     *                                   // unless `group.disabled` or `input.disbles` specified.
     *          prevent: {               // Optional.
     *              recordInputs: false, // Optional.
     *              inputsState: false,  // Optional.
     *          },
     *          groups: [{
     *              id: 'group_A',
     *              text: 'xxx',     // Optional. Or `title`. Displayed in the header line of the group content.
     *              disabled: false, // Optional. Controlls all inputs inside, unless `input.disabled` specified.
     *              inputs: [{...}, {...}, ...],
     *          }, {
     *              id: 'group_B',
     *              inputs: [{...}, {...}, ...],
     *          }, ...]
     *          // Group switching API: @see chart.__testHelper.switchGroup(groupId);
     *      },
     *      {
     *          // A line break.
     *          // They are the same: `br` `lineBreak` `break` `wrap` `newLine` `endOfLine` `carriageReturn`
     *          //                    `lineFeed` `lineSeparator` `nextLine` (capital insensitive)
     *          type: 'br',
     *      },
     *      {
     *          // A separate line.
     *          type: 'hr',
     *          text: 'xxx', // Optional. Display text on the split line.
     *      },
     *      // ...
     *  ]
     * ----------------------------- Inputs related API -----------------------------------
     * @function chart.__testHelper.switchGroup Switch group.
     *      chart.__testHelper.switchGroup(
     *          groupId: string,
     *          opt?: {
     *              recordInputs: boolean, // Optional. @see `chart.__testHelper.recordInputs`.
     *          }
     *      );
     *
     * @function chart.__testHelper.disableInputs Disable the specified inputs.
     *      chart.__testHelper.disableInputs(opt: {
     *          disabled: boolean,     // disables/enables
     *          inputId: string,       // Optional. id or id array. disables/enables the id-specified inputs.
     *          groupId: string,       // Optional. id or id array. disables/enables the inputs within the group.
     *          recordInputs: boolean, // Optional. @see `chart.__testHelper.recordInputs`.
     *      })
     *
     * @function chart.__testHelper.recordInputs
     *      @see `prevent` in `inputs` to prevent record.
     *      chart.__testHelper.recordInputs(opt: {    // start record inputs operations for replay.
     *          action: 'start'
     *      })
     *      chart.__testHelper.recordInputs(opt: {    // stop record inputs operations and output.
     *          action: 'stop',
     *          outputType?: 'clipboard' | 'console', // Optional. 'clipboard' by default.
     *          printObjectOpt?: {}                   // Optional. the opt of `testHelper.printObject`.
     *      })
     *      Note: if some API `chart.__testHelper.xxx` has parameter `recordInputs`, it indicates that wether
     *          record this call. It is `false` by default, and:
     *          - When this API is called in a callback function of an input where no `prevent.recordInputs` is
     *            declared, this option should be kept `false`. (This is the most cases.)
     *          - Otherwise it should be `true`.
     * @function chart.__testHelper.replayInputs
     *      chart.__testHelper.replayInputs(inputsRecord)
     *
     * (TL;DR) NOTE: Currently, echarts can not be restored to the initial state by
     * `setOption({..., xxx: undefined})` or `setOption({..., xxx: 'auto'})` in most options.
     * That is, the initial state can only be obtained by:
     *  - either "not specified in echarts option" from the beginning;
     *  - or "sepecify the exact default value to match the internal default value in echarts option".
     *
     * @function chart.__testHelper.getInputsState Get the current state of `inputs`.
     *      chart.__testHelper.getInputsState()
     *      e.g., result: {some_id_1: 'value1', some_id_2: 'value2'}
     *      @see `prevent` in `inputs` to prevent.
     * @function chart.__testHelper.setInputsState Set the current state of `inputs`.
     *      chart.__testHelper.setInputsState(state)
     * @function chart.__testHelper.restoreInputsToInitialState
     *      chart.__testHelper.restoreInputsToInitialState()
     *      @see opt.saveInputsInitialState which must be specified as true for this API.
     * ------------------------------------------------------------------------------------
     *
     * @param {BoundingRectOpt} [opt.boundingRect] Optional.
     *  @typedef {boolean | {color?: string, slient: boolean}} BoundingRectOpt
     *  Enable display bounding rect for zrender elements.
     *  - `true`: Simply display the bounding rects.
     *  - `opt.boundingRect.color`: a string to indicate the color, like 'red', 'rgba(0,0,0,0.2)', '#fff'.
     *  - `opt.boundingRect.silent`: by default `false`;
     *      if `false`, click on the bounding rect, window.$0 will be assigned the original zrender element.
     *  - Can be switched dynamically by:
     *      // Update BoundingRectOpt, typically used to show/hide bounding rects.
     *      @function chart.__testHelper.boundingRect
     *          chart.__testHelper.boundingRect(opt: BoundingRectOpt);
     *          chart.__testHelper.boundingRect(); // Use the last BoundingRectOpt.
     *
     * @param {boolean} [opt.recordCanvas] Optional. 'test/lib/canteen.js' is required.
     * @param {boolean} [opt.recordVideo] Optional.
     *
     * @param {Object} [opt.info] Optional. info object to display.
     *        @api info can be updated by `chart.__testHelper.updateInfo(someInfoObj, 'some_info_key');`
     * @param {string} [opt.infoKey='option'] Optional.
     * @param {Object|Array} [opt.dataTable] Optional.
     * @param {Array.<Object|Array>} [opt.dataTables] Optional. Multiple dataTables.
     * @param {number} [opt.dataTableLimit=DEFAULT_DATA_TABLE_LIMIT] Optional.
     */
    testHelper.create = function (echarts, domOrId, opt) {
        var dom = getDom(domOrId);

        if (!dom) {
            return;
        }

        var errMsgPrefix = '[testHelper dom: ' + domOrId + ']';

        var titleContainer = document.createElement('div');
        var left = document.createElement('div');
        var chartContainerWrapper = document.createElement('div');
        var chartContainer = document.createElement('div');
        var inputsContainer = document.createElement('div');
        var dataTableContainer = document.createElement('div');
        var infoContainer = document.createElement('div');
        var recordCanvasContainer = document.createElement('div');
        var recordVideoContainer = document.createElement('div');
        var boundingRectsContainer = document.createElement('div');

        titleContainer.setAttribute('title', dom.getAttribute('id'));

        titleContainer.className = 'test-title';
        dom.className = 'test-chart-block';
        left.className = 'test-chart-block-left';
        chartContainerWrapper.className = 'test-chart-wrapper';
        chartContainer.className = 'test-chart';
        dataTableContainer.className = 'test-data-table';
        infoContainer.className = 'test-info';
        boundingRectsContainer.className = 'test-bounding-rects';
        boundingRectsContainer.style.display = 'none';
        recordCanvasContainer.className = 'record-canvas';
        recordVideoContainer.className = 'record-video';

        if (opt.info) {
            dom.className += ' test-chart-block-has-right';
            infoContainer.className += ' test-chart-block-right';
        }

        left.appendChild(recordCanvasContainer);
        left.appendChild(recordVideoContainer);
        left.appendChild(inputsContainer);
        left.appendChild(dataTableContainer);
        left.appendChild(chartContainerWrapper);
        chartContainerWrapper.appendChild(chartContainer);
        chartContainerWrapper.appendChild(boundingRectsContainer);
        dom.appendChild(infoContainer);
        dom.appendChild(left);
        dom.parentNode.insertBefore(titleContainer, dom);

        initTestTitle(opt, titleContainer);

        var chart = testHelper.createChart(echarts, chartContainer, opt.option, opt, opt.setOptionOpts, errMsgPrefix);
        chart.__testHelper = {};

        initDataTables(opt, dataTableContainer);

        if (chart) {
            initInputs(chart, opt, inputsContainer, errMsgPrefix);
            initUpdateInfo(opt, chart, infoContainer);
            initRecordCanvas(opt, chart, recordCanvasContainer);
            if (opt.recordVideo) {
                testHelper.createRecordVideo(chart, recordVideoContainer);
            }
            initShowBoundingRects(chart, echarts, opt, boundingRectsContainer);
        }

        return chart;
    };

    function initTestTitle(opt, titleContainer) {
        var optTitle = opt.title;
        if (optTitle) {
            if (optTitle instanceof Array) {
                optTitle = optTitle.join('\n');
            }
            titleContainer.innerHTML = '<div class="test-title-inner">'
                + encodeHTML(optTitle)
                    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>')
                + '</div>';
        }
    }

    function initUpdateInfo(opt, chart, infoContainer) {
        assert(chart.__testHelper);

        if (opt.info) {
            updateInfo(opt.info, opt.infoKey);
        }

        function updateInfo(info, infoKey) {
            infoContainer.innerHTML = createObjectHTML(info, infoKey || 'option');
        }

        chart.__testHelper.updateInfo = updateInfo;
    }

    function initInputs(chart, opt, inputsContainer, errMsgPrefix) {
        assert(chart.__testHelper);

        var NAMES_ON_INPUT_CHANGE = makeFlexibleNames([
            'input', 'on-input', 'change', 'on-change', 'changed', 'on-changed', 'select', 'on-select'
        ]);
        var NAMES_ON_CLICK = makeFlexibleNames([
             'click', 'on-click'
        ]);
        var NAMES_TYPE_BUTTON = makeFlexibleNames(['button', 'btn']);
        var NAMES_TYPE_RANGE = makeFlexibleNames(['range', 'slider']);
        var NAMES_TYPE_SELECT = makeFlexibleNames(['select', 'selection']);
        var NAMES_TYPE_BR = makeFlexibleNames([
            'br', 'line-break', 'break', 'wrap', 'new-line', 'end-of-line',
            'carriage-return', 'line-feed', 'line-separator', 'next-line'
        ]);
        var NAMES_TYPE_HR = makeFlexibleNames([
            'hr', 'horizontal-line', 'divider', 'separate-line'
        ]);
        var NAMES_TYPE_GROUP_SET = makeFlexibleNames(['group', 'groups', 'group-set']);
        /**
         * key: inputId,
         * value: {
         *     id: inputId,
         *     disable?,
         *     switchGroup?,
         *     setState?,
         *     getState?,
         * }
         */
        var _inputsDict = {};
        var NAMES_RECORD_INPUTS_ACTION_START = makeFlexibleNames(['start', 'begin']);
        var NAMES_RECORD_INPUTS_ACTION_STOP = makeFlexibleNames(['stop', 'end', 'finish']);
        var _inputsRecord = null;
        /**
         * key: inputId
         * value: @see makeInputRecorder
         */
        var _inputRecorderWrapperMap = {};
        var _INPUTS_RECORD_VERSION = '1.0.0';
        var NANES_PREVENT_INPUTS_STATE = makeFlexibleNames([
            'inputs-state', 'input-state', 'inputs-states', 'input-states'
        ]);
        var NANES_PREVENT_RECORD_INPUTS = makeFlexibleNames([
            'record-inputs', 'record-input',
            'input-record', 'inputs-record',
        ]);
        var _initStateBackup = null;

        initInputsContainer(inputsContainer, opt);
        var inputsDefineList = retrieveInputDefineList(opt);
        dealInitEachInput(inputsDefineList, inputsContainer);

        // --- Input operation related API ---
        chart.__testHelper.switchGroup
            = makeSwitchGroup();
        chart.__testHelper.disableInputs
            = chart.__testHelper.disableInput
            = makeDisableInputs();

        // --- Input meta related API ---
        chart.__testHelper.recordInputs
            = recordInputs;
        chart.__testHelper.replayInputs
            = chart.__testHelper.replayInput
            = replayInputs;
        chart.__testHelper.getInputsState
            = chart.__testHelper.getInputState
            = getInputsState;
        chart.__testHelper.setInputsState
            = chart.__testHelper.setInputState
            = setInputsState;
        chart.__testHelper.restoreInputsToInitialState
            = restoreInputsToInitialState;

        if (opt.saveInputsInitialState) {
            _initStateBackup = chart.__testHelper.getInputsState();
        }

        return;

        function makeDisableInputs() {
            var inputRecorderWrapper = makeInputRecorder();
            inputRecorderWrapper.setupInputId('__\0testHelper_disableInputs');
            var disableInputsWithRecordInputs = inputRecorderWrapper.inputRecorder.wrapUserInputListener({
                listener: disableInputs,
                op: 'disableInputs'
            });

            /**
             * @param {string|Array.<string>?} opt.groupId
             * @param {string|Array.<string>?} opt.inputId
             * @param {boolean} opt.recordInputs
             */
            return function (opt) {
                opt.recordInputs
                    ? disableInputsWithRecordInputs(opt)
                    : disableInputs(opt);
            }

            function disableInputs(opt) {
                assert(opt, '[disableInputs] requires parameters.');
                var groupId = opt.groupId;
                var inputId = opt.inputId;
                assert(
                    groupId != null || inputId != null,
                    '[disableInputs] requires `groupId` or/and `inputId`.'
                );
                var inputIdList = [];
                if (inputId != null) {
                    if (getType(inputId) !== 'array') {
                        inputId = [inputId];
                    }
                    for (var idx = 0; idx < inputId.length; idx++) {
                        var id = inputId[idx];
                        findInputCreatedAndCheck(id, {throw: true});
                        inputIdList.push(id);
                    }
                }
                if (groupId != null) {
                    if (getType(groupId) !== 'array') {
                        groupId = [groupId];
                    }
                    for (var idx = 0; idx < groupId.length; idx++) {
                        inputIdList = inputIdList.concat(retrieveAndVerifyGroup(groupId[idx]).idList);
                    }
                }
                var disabled = opt.disabled;
                for (var idx = 0; idx < inputIdList.length; idx++) {
                    var id = inputIdList[idx];
                    if (_inputsDict[id].disable) {
                        _inputsDict[id].disable({disabled: disabled});
                    }
                }
            }
        }

        /**
         * @param {string} opt.action 'start' or 'stop'.
         * @param {string} opt.outputType Optional. 'clipboard' or 'console'.
         * @param {Object} opt.printObjectOpt Optional. The opt of `testHelper.printObject`.
         */
        function recordInputs(opt) {
            var action = opt.action;
            assert(
                NAMES_RECORD_INPUTS_ACTION_START.indexOf(action) >= 0
                    || NAMES_RECORD_INPUTS_ACTION_STOP.indexOf(action) >= 0,
                'Invalide recordInputs action: ' + action + '. Should be '
                    + NAMES_RECORD_INPUTS_ACTION_START + ' ' + NAMES_RECORD_INPUTS_ACTION_STOP
            );
            if (NAMES_RECORD_INPUTS_ACTION_START.indexOf(action) >= 0) {
                _inputsRecord = {
                    version: _INPUTS_RECORD_VERSION,
                    startTime: +(new Date()),
                    operations: [],
                };
            }
            else if (NAMES_RECORD_INPUTS_ACTION_STOP.indexOf(action) >= 0) {
                if (_inputsRecord == null) {
                    console.error(
                        'Inputs record is not started. Please call'
                        + ' `chart.__testHelper.recordInputs({action: "start"})` first.'
                    );
                    return;
                }
                _inputsRecord.endTime = +(new Date());
                var inputsRecord = _inputsRecord;
                _inputsRecord = null;
                outputInputsRecord(inputsRecord);
                return inputsRecord;
            }

            function outputInputsRecord(record) {
                if (opt.outputType === 'console') {
                    console.log(testHelper.printObject(record, opt.printObjectOpt));
                }
                else {
                    testHelper.clipboard(record, opt.printObjectOpt);
                }
            }
        }

        function replayInputs(inputsRecord) {
            assert(
                inputsRecord.version === _INPUTS_RECORD_VERSION,
                'Not supported inputs record version. expect' + _INPUTS_RECORD_VERSION + ' Need to re-record.'
            );
            for (var idx = 0; idx < inputsRecord.operations.length; idx++) {
                var opItem = inputsRecord.operations[idx];
                findInputCreatedAndCheck(opItem.id, {throw: true});
                assert(
                    !shouldPrevent(opItem.id, NANES_PREVENT_RECORD_INPUTS),
                    'Input (id:' + opItem.id + ') has prevented recording. This may caused by test case change.'
                );
                var inputRecorderWrapper = _inputRecorderWrapperMap[opItem.id];
                assert(inputRecorderWrapper);
                assert(getType(opItem.op) === 'string', 'Invalid op: ' + opItem.op);
                var listenerDefine = inputRecorderWrapper.listenerDefineMap[opItem.op];
                assert(
                    listenerDefine,
                    'Can not find listener by op: ' + opItem.op + ' This may caused by test case change.'
                );
                var prepared = {this: [], arguments: {}};
                if (listenerDefine.prepareReplay) {
                    prepared = listenerDefine.prepareReplay(opItem.args);
                    assert(
                        isObject(prepared)
                            && prepared.hasOwnProperty('this')
                            && getType(prepared.arguments) === 'array',
                        '`prepareReplay` must return an object: {this: any, arguments: []}.'
                    );
                }
                listenerDefine.listener.apply(prepared.this, prepared.arguments);
            }
        }

        function makeInputRecorder() {
            var _inputId = null;
            var inputRecorderWrapper = {
                setupInputId: function (inputId) {
                    _inputId = inputId;
                    _inputRecorderWrapperMap[inputId] = inputRecorderWrapper;
                },
                inputRecorder: {
                    wrapUserInputListener: wrapUserInputListener
                },
                /**
                 * key: op,
                 */
                listenerDefineMap: {},
            };

            return inputRecorderWrapper;

            function wrapUserInputListener(listenerDefine) {
                assert(
                    getType(listenerDefine.listener) === 'function',
                    'Must provide a function `listener`.'
                );
                assert(
                    getType(listenerDefine.op) === 'string',
                    'Must provide an `op` string to identify this listener.'
                );

                assert(
                    !inputRecorderWrapper.listenerDefineMap[listenerDefine.op],
                    '`op` ' + listenerDefine.op + ' overlapped.'
                );
                inputRecorderWrapper.listenerDefineMap[listenerDefine.op] = listenerDefine;

                return function wrappedListener() {
                    assert(_inputId != null);
                    if (_inputsRecord && !shouldPrevent(_inputId, NANES_PREVENT_RECORD_INPUTS)) {
                        var recordWrapper = {id: _inputId, op: listenerDefine.op};
                        if (listenerDefine.createRecordArgs) {
                            recordWrapper.args = listenerDefine.createRecordArgs.apply(this, arguments);
                        }
                        _inputsRecord.operations.push(recordWrapper);
                    }
                    return listenerDefine.listener.apply(this, arguments);
                };
            }
        }

        function setInputsState(state) {
            var changedCreatedList = [];
            for (var id in state) {
                if (state.hasOwnProperty(id)) {
                    var inputCreated = findInputCreatedAndCheck(id, {log: true});
                    if (!inputCreated) {
                        continue;
                    }
                    if (shouldPrevent(id, NANES_PREVENT_INPUTS_STATE) || !inputCreated.setState) {
                        continue;
                    }
                    inputCreated.setState(state[id]);
                    changedCreatedList.push(inputCreated);
                }
            }
        }

        function getInputsState() {
            var result = {};
            for (var id in _inputsDict) {
                if (_inputsDict.hasOwnProperty(id)) {
                    var inputCreated = _inputsDict[id];
                    if (shouldPrevent(id, NANES_PREVENT_INPUTS_STATE) || !inputCreated.getState) {
                        continue;
                    }
                    if (inputCreated.idCanNotPersist) {
                        throw new Error(
                            errMsgPrefix + '[getInputsState]. Please specify an id explicitly or unique text'
                            + ' for input:' + printObject(inputCreated.__inputDefine)
                        );
                    }
                    result[id] = inputCreated.getState();
                }
            }
            return result;
        }

        function restoreInputsToInitialState() {
            assert(
                _initStateBackup != null,
                'opt.saveInputsInitialState must be true to use `restoreInputsToInitialState`.'
            );
            setInputsState(_initStateBackup);
        }

        function initInputsContainer(container, define, features) {
            assert(container.tagName.toLowerCase() === 'div');
            container.innerHTML = '';

            var ignoreFixHeight = features && features.ignoreFixHeight;
            var ignoreInputsStyle = features && features.ignoreInputsStyle;

            var inputsHeight = retrieveValue(define.inputsHeight, define.buttonsHeight, null);
            if (inputsHeight != null) {
                inputsHeight = parseFloat(inputsHeight);
            }

            var classNameArr = [];
            if (features && features.className) {
                classNameArr.push(features.className);
            }
            if (!ignoreInputsStyle) {
                classNameArr.push(
                    'test-inputs',
                    'test-buttons', // deprecated but backward compat.
                    'test-inputs-style-' + (define.inputsStyle || define.buttonsStyle || 'normal')
                );
            }
            if (!ignoreFixHeight && inputsHeight != null) {
                classNameArr.push('test-inputs-fix-height');
                container.style.cssText += [
                    'height:' + inputsHeight + 'px'
                ].join(';') + ';';
            }

            container.className = classNameArr.join(' ');
        }

        function dealInitEachInput(inputsDefineList, inputsContainer) {
            var idList = [];
            for (var i = 0; i < inputsDefineList.length; i++) {
                var inputDefine = inputsDefineList[i];
                var inputRecorderWrapper = makeInputRecorder();
                var inputCreated = createInputByDefine(
                    inputDefine,
                    inputRecorderWrapper.inputRecorder
                );
                if (!inputCreated) {
                    continue;
                }
                for (var j = 0; j < inputCreated.elList.length; j++) {
                    inputsContainer.appendChild(inputCreated.elList[j]);
                }
                var id = storeToInputDict(inputDefine, inputCreated, inputRecorderWrapper.setupInputId);
                idList.push(id);
            }
            return idList;
        }

        function storeToInputDict(inputDefine, inputCreated, inputRecorderSetupInputId) {
            var id = retrieveId(inputDefine, 'id');
            if (id != null) {
                id = '' + id;
                if (_inputsDict[id]) {
                    throw new Error(errMsgPrefix + ' Duplicate input id: ' + id);
                }
            }
            if (id == null) {
                var text = retrieveValue(inputDefine.text, '') + '';
                if (text) {
                    var textBasedId = '__inputs|' + text + '|';
                    if (!_inputsDict[textBasedId]) {
                        id = textBasedId;
                    }
                }
            }
            if (id == null) {
                id = generateNonPersistentId('__inputs_non_persist');
                assert(!_inputsDict[id]);
                inputCreated.idCanNotPersist = true;
            }
            inputCreated.id = id;
            inputCreated.__inputDefine = inputDefine;
            _inputsDict[id] = inputCreated;
            if (inputRecorderSetupInputId) {
                inputRecorderSetupInputId(id);
            }
            return id;
        }

        function retrieveAndVerifyGroup(groupId) {
            var groupCreated = _inputsDict[groupId];
            assert(groupCreated, 'Can not find group by id: ' + groupId);
            assert(groupCreated.groupParent, 'This is not a group. id: ' + groupId);
            return groupCreated;
        }

        function makeSwitchGroup() {
            var inputRecorderWrapper = makeInputRecorder();
            inputRecorderWrapper.setupInputId('__\0testHelper_switchGroup');
            var switchGroupWithRecordInputs = inputRecorderWrapper.inputRecorder.wrapUserInputListener({
                listener: dealSwitchGroup,
                op: 'switchGroup'
            });

            return function (groupId, opt) {
                (opt && opt.recordInputs)
                    ? switchGroupWithRecordInputs(groupId, opt)
                    : dealSwitchGroup(groupId);
            };

            function dealSwitchGroup(groupId) {
                var groupCreatedToShow = retrieveAndVerifyGroup(groupId);
                var groupSetCreated = groupCreatedToShow.groupParent;
                groupSetCreated.switchGroup(groupId);
            }
        }

        function showHideGroupInGroupSet(groupCreated, showOrHide) {
            groupCreated.inputsContainerEl.style.display = showOrHide
                ? 'block' : 'none';
            var groupDefine = groupCreated.groupDefine;
            groupCreated.groupSetTextEl.innerHTML = showOrHide
                ? encodeHTML(retrieveValue(groupDefine.text, groupDefine.title, ''))
                : '';
        }

        function shouldPrevent(inputId, names) {
            var prevent = _inputsDict[inputId].__inputDefine.prevent || {};
            for (var idx = 0; idx < names.length; idx++) {
                if (prevent[names[idx]]) {
                    return true;
                }
            }
            return false;
        }

        function findInputCreatedAndCheck(inputId, errorHandling) {
            var inputCreated = _inputsDict[inputId];
            if (!inputCreated) {
                var errMsg = errMsgPrefix + ' No input found by id: ' + inputId + '. May caused by test case change.';
                if (errorHandling.log) {
                    console.error(errMsg);
                }
                else if (errorHandling.throw) {
                    throw new Error(errMsg);
                }
                else {
                    throw new Error('internal failure.')
                }
            }
            return inputCreated;
        }

        function retrieveInputDefineList(define) {
            var defineList = retrieveValue(define.buttons, define.button, define.input, define.inputs);
            if (typeof defineList === 'function') {
                defineList = defineList(chart);
            }
            if (!(defineList instanceof Array)) {
                defineList = defineList ? [defineList] : [];
            }
            return defineList;
        }

        function getInputsTextHTML(inputDefine, defaultText) {
            return encodeHTML(retrieveValue(inputDefine.name, inputDefine.text, defaultText));
        }

        function getBtnEventListener(inputDefine, names) {
            for (var idx = 0; idx < names.length; idx++) {
                if (inputDefine[names[idx]]) {
                    return inputDefine[names[idx]];
                }
            }
        }

        function retrieveId(inputDefine, idPropName) {
            if (inputDefine && inputDefine[idPropName] != null) {
                var type = getType(inputDefine[idPropName]);
                if (type !== 'string' && type != 'number') {
                    throw new Error(errMsgPrefix + ' id must be string or number.');
                }
                return inputDefine[idPropName] + '';
            }
        }

        function createInputByDefine(inputDefine, inputRecorder) {
            if (!inputDefine) {
                return;
            }
            var inputType = inputDefine.hasOwnProperty('type') ? inputDefine.type : 'button';

            if (arrayIndexOf(NAMES_TYPE_RANGE, inputType) >= 0) {
                return createRangeInput(inputDefine, null, inputRecorder);
            }
            else if (arrayIndexOf(NAMES_TYPE_SELECT, inputType) >= 0) {
                return createSelectInput(inputDefine, inputRecorder);
            }
            else if (arrayIndexOf(NAMES_TYPE_BR, inputType) >= 0) {
                return createBr(inputDefine, inputRecorder);
            }
            else if (arrayIndexOf(NAMES_TYPE_HR, inputType) >= 0) {
                return createHr(inputDefine, inputRecorder);
            }
            else if (arrayIndexOf(NAMES_TYPE_BUTTON, inputType) >= 0) {
                return createButtonInput(inputDefine, inputRecorder);
            }
            else if (arrayIndexOf(NAMES_TYPE_GROUP_SET, inputType) >= 0) {
                return createGroupSetInput(inputDefine, inputRecorder);
            }
            else {
                throw new Error(errMsgPrefix + ' Unsupported button type: ' + inputType);
            }
        }

        function createRangeInput(inputDefine, internallyForceDef, inputRecorder) {
            var _currVal = +retrieveValue(inputDefine.value, 0);
            var _disabled = false;
            var _step = +retrieveValue(inputDefine.step, 1);
            var _minVal = +retrieveValue(inputDefine.min, 0);
            var _maxVal = +retrieveValue(inputDefine.max, 100);
            var _precision = Math.max(
                getPrecision(_minVal),
                getPrecision(_maxVal),
                getPrecision(_currVal),
                getPrecision(_step)
            );
            var _noDeltaButtons = !!inputDefine.noDeltaButtons; // Only for backward compat.
            var _rangeInputWrapperEl;
            var _rangeInputListener;
            var _rangeInputEl;
            var _rangeInputValueEl;
            var _opSuffix = internallyForceDef && internallyForceDef.id || '';

            dealInitRangeInput();

            return {
                elList: [_rangeInputWrapperEl],
                disable: resetRangeInputDisabled,
                getState: getRangeInputState,
                setState: setRangeInputState,
            };

            function dealInitRangeInput() {
                _rangeInputWrapperEl = document.createElement('span');
                resetRangeInputWrapperCSS(_rangeInputWrapperEl, false);

                _rangeInputListener = internallyForceDef
                    ? getBtnEventListener(internallyForceDef, NAMES_ON_INPUT_CHANGE)
                    : getBtnEventListener(inputDefine, NAMES_ON_INPUT_CHANGE);
                if (!_rangeInputListener) {
                    throw new Error(
                        errMsgPrefix + ' No listener (either '
                        + NAMES_ON_INPUT_CHANGE.join(', ') + ') specified for slider.'
                    );
                }

                var sliderTextEl = document.createElement('span');
                sliderTextEl.className = 'test-inputs-slider-text';
                sliderTextEl.innerHTML = internallyForceDef
                    ? getInputsTextHTML(internallyForceDef, '')
                    : getInputsTextHTML(inputDefine, '');
                _rangeInputWrapperEl.appendChild(sliderTextEl);

                function createRangeInputDeltaBtn(btnName, delta) {
                    if (_noDeltaButtons) { return; }
                    var sliderLRBtnEl = document.createElement('div');
                    sliderLRBtnEl.className = 'test-inputs-slider-btn-incdec test-inputs-slider-btn-' + btnName;
                    _rangeInputWrapperEl.appendChild(sliderLRBtnEl);
                    sliderLRBtnEl.addEventListener('click', inputRecorder.wrapUserInputListener({
                        listener: function () {
                            if (_disabled) { return; }
                            // 0.1 + 0.2 = 0.30000000000000004
                            _currVal = round(_currVal + delta, _precision);
                            updateRangeInputViewValue(_currVal);
                            dispatchRangeInputChangedEvent();
                        },
                        op: btnName + _opSuffix
                    }));
                }
                createRangeInputDeltaBtn('decrease', -_step);
                createRangeInputDeltaBtn('increase', _step);

                _rangeInputEl = document.createElement('input');
                _rangeInputEl.className = 'test-inputs-slider-input';
                _rangeInputEl.setAttribute('type', 'range');
                _rangeInputEl.addEventListener('input', inputRecorder.wrapUserInputListener({
                    listener: function () {
                        if (_disabled) { return; }
                        _currVal = +this.value;
                        updateRangeInputViewValue(_currVal);
                        dispatchRangeInputChangedEvent();
                    },
                    op: 'slide' + _opSuffix,
                    createRecordArgs: function () {
                        return [+this.value];
                    },
                    prepareReplay: function (recordArgs) {
                        _rangeInputEl.value = recordArgs[0];
                        return {
                            this: _rangeInputEl,
                            arguments: []
                        };
                    }
                }));
                _rangeInputEl.setAttribute('min', _minVal);
                _rangeInputEl.setAttribute('max', _maxVal);
                _rangeInputEl.setAttribute('value', _currVal);
                _rangeInputEl.setAttribute('step', _step);
                _rangeInputWrapperEl.appendChild(_rangeInputEl);

                _rangeInputValueEl = document.createElement('span');
                _rangeInputValueEl.className = 'test-inputs-slider-value';
                _rangeInputWrapperEl.appendChild(_rangeInputValueEl);

                updateRangeInputViewValue(_currVal);
                resetRangeInputDisabled(inputDefine);
            }

            function updateRangeInputViewValue(newVal) {
                _rangeInputEl.value = +newVal;
                _rangeInputValueEl.innerHTML = encodeHTML(newVal + '' + (inputDefine.suffix || ''));
            }
            function resetRangeInputWrapperCSS(wrapperEl, disabled) {
                wrapperEl.className = 'test-inputs-slider'
                    + (internallyForceDef ? ' test-inputs-slider-sub' : '')
                    + (disabled ? ' test-inputs-slider-disabled' : '');
                    + (_noDeltaButtons ? ' test-inputs-slider-no-delta-buttons' : '');
            }
            function setRangeInputState(state) {
                if (!isObject(state)) {
                    console.error(
                        errMsgPrefix + ' Range input state must be object rather than ' + printObject(state)
                        + ' May caused by test case change.'
                    );
                    return;
                }
                var newVal = +state.value;
                if (!isFinite(newVal)) {
                    console.error(
                        errMsgPrefix + ' Range input state.value must be number rather than ' + printObject(state)
                        + ' May caused by test case change.'
                    );
                    return;
                }
                _currVal = newVal;
                resetRangeInputDisabled({disabled: state.disabled});
                updateRangeInputViewValue(_currVal);
            }
            function getRangeInputState() {
                return {
                    value: _currVal,
                    disabled: _disabled,
                };
            }
            function resetRangeInputDisabled(opt) {
                _disabled = !!opt.disabled;
                _rangeInputEl.disabled = _disabled;
                resetRangeInputWrapperCSS(_rangeInputWrapperEl, _disabled);
            }
            function dispatchRangeInputChangedEvent() {
                if (_disabled) { return; }
                var target = {value: _currVal};
                _rangeInputListener.call(target, {target: target});
            }
        } // End of createRangeInput

        function createSelectInput(inputDefine, inputRecorder) {
            var selectCtx = {
                _optionList: [],
                _selectWrapperEl: null,
                _selectEl: null,
                _optionIdxToSubInput: [],
                _el: null,
                _disabled: false,
            };

            var _SAMPLE_SELECT_DEFINITION = [
                '{',
                '    type: "select",',
                '    text?: "my select:",',
                '    options: [',
                '        {text?: string, value: any},',
                '        {text?: string, input: {type: "range", ...}},',
                '        {text?: string, id: "some_option_id", input: {type: "range", ...}},',
                '        ...,',
                '    ],',
                '    onchange() { ... },',
                '}'
            ].join('\n');

            createSelectInputElements();

            var _selectListener = getBtnEventListener(inputDefine, NAMES_ON_INPUT_CHANGE);
            assert(
                _selectListener,
                errMsgPrefix + ' No listener specified for select. Should have either one of '
                    + NAMES_ON_INPUT_CHANGE.join(', ') + '.'
            );

            initSelectInputOptions(inputDefine);

            selectCtx._selectEl.addEventListener('change', inputRecorder.wrapUserInputListener({
                listener: function dispatchSelectInputChangedEvent() {
                    if (selectCtx._disabled) { return; }
                    resetSelectInputSubInputsDisabled();
                    triggerUserSelectChangedEvent();
                },
                op: 'select',
                createRecordArgs: function () {
                    return [getSelectInputOptionIndex()];
                },
                prepareReplay: function (recordArgs) {
                    var optionIndex = recordArgs[0];
                    validateOptionIndex(optionIndex);
                    selectCtx._selectEl.value = optionIndex;
                    return {
                        this: selectCtx._selectEl,
                        arguments: []
                    };
                }
            }));

            setSelectInputInitValue(inputDefine);
            resetSelectInputDisabled(inputDefine);

            return {
                elList: [selectCtx._el],
                disable: resetSelectInputDisabled,
                getState: getSelectInputState,
                setState: setSelectInputState,
            };

            function createSelectInputElements() {
                var selectWrapperEl = document.createElement('span');
                selectCtx._selectWrapperEl = selectWrapperEl;
                resetSelectInputWrapperCSS(selectWrapperEl, false);

                var textEl = document.createElement('span');
                textEl.className = 'test-inputs-select-text';
                textEl.innerHTML = getInputsTextHTML(inputDefine, '');
                selectWrapperEl.appendChild(textEl);

                var selectEl = document.createElement('select');
                selectEl.className = 'test-inputs-select-select';
                selectWrapperEl.appendChild(selectEl);

                selectCtx._el = selectWrapperEl;
                selectCtx._selectEl = selectEl;
            }

            function resetSelectInputWrapperCSS(selectWrapperEl, disabled) {
                selectWrapperEl.className = 'test-inputs-select'
                    + (disabled ? ' test-inputs-select-disabled' : '');
            }

            function initSelectInputOptions(inputDefine) {
                // optionDef can be {text, value} or just value
                //  (value can be null/undefined/array/object/... everything).
                // Convinient but might cause ambiguity when a value happens to be {text, value}, but rarely happen.
                if (inputDefine.options) {
                    var innerInputCount = 0;
                    for (var optionIdx = 0; optionIdx < inputDefine.options.length; optionIdx++) {
                        var optionDef = inputDefine.options[optionIdx];
                        assert(isObject(optionDef), [
                            errMsgPrefix + ' Select option definition should be an object, such as,',
                            _SAMPLE_SELECT_DEFINITION
                        ].join('\n'));
                        assert(optionDef.hasOwnProperty('value') || isObject(optionDef.input), [
                            errMsgPrefix + ' Select option definition should contain prop'
                                + ' either `value` or `option`, such as,',
                            _SAMPLE_SELECT_DEFINITION
                        ].join('\n'));
                        var text = getType(optionDef.text) === 'string'
                            ? optionDef.text
                            : makeSelectInputTextByValue(optionDef);
                        selectCtx._optionList.push({
                            value: optionDef.value,
                            input: optionDef.input,
                            id: optionDef.id,
                            text: text
                        });
                        if (optionDef.input) {
                            innerInputCount++;
                        }
                        assert(innerInputCount < 2 || optionDef.id != null, [
                            errMsgPrefix + ' If more than one inner input in a select,'
                                + ' option id must be specified. ',
                            _SAMPLE_SELECT_DEFINITION
                        ].join('\n'));
                    }
                }
                else if (inputDefine.values) {
                    for (var optionIdx = 0; optionIdx < inputDefine.values.length; optionIdx++) {
                        var value = inputDefine.values[optionIdx];
                        selectCtx._optionList.push({
                            value: value,
                            text: makeSelectInputTextByValue({value: value})
                        });
                    }
                }
                if (!selectCtx._optionList.length) {
                    throw new Error(errMsgPrefix + ' No options specified for select.');
                }

                for (var optionIdx = 0; optionIdx < selectCtx._optionList.length; optionIdx++) {
                    var optionDef = selectCtx._optionList[optionIdx];
                    selectCtx._optionList[optionIdx] = optionDef;
                    var optionEl = document.createElement('option');
                    optionEl.innerHTML = encodeHTML(optionDef.text);
                    // HTML select.value is always string. But it would be more convenient to
                    // convert it to user's raw input value type.
                    //  (The input raw value can be null/undefined/array/object/... everything).
                    optionEl.value = optionIdx;
                    selectCtx._selectEl.appendChild(optionEl);

                    if (optionDef.input) {
                        if (arrayIndexOf(NAMES_TYPE_RANGE, optionDef.input.type) < 0) {
                            throw new Error(errMsgPrefix + ' Sub input only supported for range input.');
                        }
                        var rangeInputCreated = createRangeInput(optionDef.input, {
                            text: '',
                            id: optionDef.id,
                            onchange: function () {
                                if (selectCtx._disabled) { return; }
                                triggerUserSelectChangedEvent();
                            }
                        }, inputRecorder);
                        for (var idx = 0; idx < rangeInputCreated.elList.length; idx++) {
                            selectCtx._el.appendChild(rangeInputCreated.elList[idx]);
                        }
                        selectCtx._optionIdxToSubInput[optionIdx] = rangeInputCreated;
                    }
                }
            }

            function resetSelectInputDisabled(opt) {
                selectCtx._disabled = !!opt.disabled;
                selectCtx._selectEl.disabled = selectCtx._disabled;
                resetSelectInputWrapperCSS(selectCtx._selectWrapperEl, selectCtx._disabled);
                resetSelectInputSubInputsDisabled();
            }

            function getSelectInputState() {
                var optionIndex = getSelectInputOptionIndex();
                var state = {};
                state.optionIndex = optionIndex;
                state.disabled = selectCtx._disabled;
                if (selectCtx._optionIdxToSubInput.length) { // Make literal state short to save space.
                    state.optionStateMap = {};
                    for (var optionIdx = 0; optionIdx < selectCtx._optionIdxToSubInput.length; optionIdx++) {
                        if (selectCtx._optionIdxToSubInput[optionIdx]) {
                            state.optionStateMap[optionIdx] = selectCtx._optionIdxToSubInput[optionIdx].getState();
                        }
                    }
                }
                return state;
            }

            function setSelectInputState(state) {
                if (!isObject(state)) {
                    console.error(
                        errMsgPrefix + ' Invalid select input state: ' + printObject(state)
                        + ' May caused by test case change.'
                    );
                    return;
                }
                if (!validateOptionIndex(state.optionIndex)) {
                    return;
                }

                var optionStateMap = state.optionStateMap || {};
                for (var optionIdx in optionStateMap) {
                    if (state.optionStateMap.hasOwnProperty(optionIdx)) {
                        var subInput = selectCtx._optionIdxToSubInput[optionIdx];
                        if (!subInput) {
                            console.error(
                                errMsgPrefix + ' Invalid select input state: ' + printObject(state)
                                + ' Can not find a sub-input by optionIndex: ' + optionIdx + '.'
                                + ' May caused by test case change.'
                            );
                            return;
                        }
                    }
                }
                for (var optionIdx in optionStateMap) {
                    if (state.optionStateMap.hasOwnProperty(optionIdx)) {
                        var subInput = selectCtx._optionIdxToSubInput[optionIdx];
                        subInput.setState(state.optionStateMap[optionIdx]);
                    }
                }
                resetSelectInputDisabled({disabled: state.disabled});
                resetSelectInputOptionIndex(state.optionIndex);
            }

            function validateOptionIndex(optionIndex) {
                if (getType(optionIndex) !== 'number'
                    || optionIndex < 0
                    || optionIndex >= selectCtx._optionList.length
                ) {
                    console.error(
                        errMsgPrefix + ' Invalid select, optionIndex: ' + optionIndex + ' is out if range.'
                        + ' May caused by test case change.'
                    );
                    return false;
                }
                return true;
            }

            function setSelectInputInitValue(inputDefine) {
                var initOptionIdx = 0;
                var initOptionIdxOpt = retrieveValue(inputDefine.optionIndex, inputDefine.valueIndex, undefined);
                if (initOptionIdxOpt != null) {
                    if (initOptionIdxOpt < 0 || initOptionIdxOpt >= selectCtx._optionList.length) {
                        throw new Error(errMsgPrefix + ' Invalid optionIndex: ' + initOptionIdxOpt);
                    }
                    selectCtx._selectEl.value = selectCtx._optionList[initOptionIdxOpt].value;
                    initOptionIdx = initOptionIdxOpt;
                }
                else if (inputDefine.hasOwnProperty('value')) {
                    var found = false;
                    for (var idx = 0; idx < selectCtx._optionList.length; idx++) {
                        if (!selectCtx._optionList[idx].input
                            && selectCtx._optionList[idx].value === inputDefine.value
                        ) {
                            found = true;
                            initOptionIdx = idx;
                        }
                    }
                    if (!found) {
                        throw new Error(errMsgPrefix + ' Value not found in select options: ' + inputDefine.value);
                    }
                }
                resetSelectInputOptionIndex(initOptionIdx);
            }

            function resetSelectInputOptionIndex(optionIdx) {
                selectCtx._selectEl.value = optionIdx;
                resetSelectInputSubInputsDisabled();
            }

            function getSelectInputOptionIndex() {
                return +selectCtx._selectEl.value;
            }

            function getSelectInputValueByOptionIndex(optionIdx) {
                return selectCtx._optionList[optionIdx].input
                    ? selectCtx._optionIdxToSubInput[optionIdx].getState().value
                    : selectCtx._optionList[optionIdx].value;
            }

            function triggerUserSelectChangedEvent() {
                var optionIdx = getSelectInputOptionIndex();
                var value = getSelectInputValueByOptionIndex(optionIdx);
                var optionId = selectCtx._optionList[optionIdx].id;
                var target = {value: value, optionId: optionId};
                _selectListener.call(target, {target: target});
            }

            function resetSelectInputSubInputsDisabled() {
                var optionIdx = getSelectInputOptionIndex();
                for (var i = 0; i < selectCtx._optionIdxToSubInput.length; i++) {
                    var subInput = selectCtx._optionIdxToSubInput[i];
                    if (subInput) {
                        var disabled = selectCtx._disabled
                            ? true // Disable all options.
                            : i !== optionIdx // Disable all except current selected option.
                        subInput.disable({disabled: disabled});
                    }
                }
            }

            function makeSelectInputTextByValue(optionDef) {
                if (optionDef.hasOwnProperty('value')) {
                    return printObject(optionDef.value, {
                        arrayLineBreak: false, objectLineBreak: false, indent: 0, lineBreak: ''
                    });
                }
                else if (optionDef.input) {
                    return 'range input';
                }
            }
        } // End of createSelectInput

        function createGroupSetInput(groupSetDefine) {
            assert(
                getType(groupSetDefine.inputsHeight) === 'number',
                '`inputsHeight` is mandatory on groupSet to avoid height change'
                + ' to affects visual testing when switching groups.'
            )
            assert(
                getType(groupSetDefine.groups) === 'array',
                '.groups must be an array.'
            );
            assert(
                groupSetDefine.groups.length > 0,
                'groupset.group must have at least one group'
            );

            var groupSetEl = document.createElement('div');
            initInputsContainer(groupSetEl, groupSetDefine, {
                ignoreInputsStyle: true,
                className: 'test-inputs-groupset',
            });
            var groupSetMarginBottomEl = document.createElement('div');
            groupSetMarginBottomEl.className = 'test-inputs-groupset-margin-bottom';

            var groupSetTextEl = document.createElement('div');
            groupSetTextEl.className = 'test-inputs-groupset-text';
            groupSetEl.appendChild(groupSetTextEl);

            var groupSetCreated = {
                currentGroupIndex: 0,
                elList: [groupSetEl, groupSetMarginBottomEl],
                children: [],
                getState: getGroupSetInputState,
                setState: setGroupSetInputState,
                switchGroup: switchGroup
            };

            for (var groupIdx = 0; groupIdx < groupSetDefine.groups.length; groupIdx++) {
                var groupDefine = groupSetDefine.groups[groupIdx];
                assert(groupDefine, 'groupset.group must not be undefined/null.');

                var groupChildInputsContainer = document.createElement('div');
                initInputsContainer(groupChildInputsContainer, groupSetDefine, {
                    ignoreFixHeight: true,
                    className: 'test-inputs-groupset-group',
                });
                groupSetEl.appendChild(groupChildInputsContainer);

                var groupChildId = retrieveId(groupDefine, 'id');
                if (groupChildId == null) {
                    throw new Error('In group child input, id must be specified.');
                }

                var groupCreated = {
                    groupParent: groupSetCreated,
                    inputsContainerEl: groupChildInputsContainer,
                    groupSetTextEl: groupSetTextEl,
                    groupDefine: groupDefine,
                    idList: null,
                    groupIndex: groupSetCreated.children.length
                };
                groupSetCreated.children.push(groupCreated);

                storeToInputDict(groupDefine, groupCreated);

                var inputsDefineList = retrieveInputDefineList(groupDefine).slice();

                // Cascade `disabled`.
                for (var inputIdx = 0; inputIdx < inputsDefineList.length; inputIdx++) {
                    var inputDefine = inputsDefineList[inputIdx];
                    if (!inputDefine) {
                        continue;
                    }
                    assert(isObject(inputDefine));
                    inputsDefineList[inputIdx] = inputDefine = Object.assign({}, inputDefine);
                    inputDefine.disabled = retrieveValue(
                        inputDefine.disabled, groupDefine.disabled, groupSetDefine.disabled
                    );
                }

                groupCreated.idList = dealInitEachInput(inputsDefineList, groupChildInputsContainer);

                showHideGroupInGroupSet(groupCreated, false);
            }

            showHideGroupInGroupSet(groupSetCreated.children[groupSetCreated.currentGroupIndex], true);

            return groupSetCreated;

            function switchGroup(groupId) {
                var groupCreatedToShow = retrieveAndVerifyGroup(groupId);
                if (groupCreatedToShow.groupIndex === groupCreatedToShow.groupParent.currentGroupIndex) {
                    return;
                }
                var groupCreatedToHide = groupCreatedToShow.groupParent.children[
                    groupCreatedToShow.groupParent.currentGroupIndex
                ];
                showHideGroupInGroupSet(groupCreatedToHide, false);
                showHideGroupInGroupSet(groupCreatedToShow, true);
                groupCreatedToShow.groupParent.currentGroupIndex = groupCreatedToShow.groupIndex;
            }

            function getGroupSetInputState() {
                var state = {currentGroupIndex: groupSetCreated.currentGroupIndex};
                return state;
            }

            function setGroupSetInputState(state) {
                if (!isObject(state)) {
                    console.error(
                        errMsgPrefix + ' Invalid group set state: ' + printObject(state)
                        + ' May caused by test case change.'
                    );
                    return;
                }
                var currentGroupIndex = state.currentGroupIndex;
                if (getType(currentGroupIndex) !== 'number'
                    || currentGroupIndex < 0
                    || currentGroupIndex >= groupSetCreated.children.length
                ) {
                    console.error(
                        errMsgPrefix + ' Invalid group set currentGroupIndex: ' + currentGroupIndex
                        + ' May caused by test case change.'
                    );
                    return;
                }
                switchGroup(currentGroupIndex);
            }

        } // End of createGroupSetInput

        function createButtonInput(inputDefine, inputRecorder) {
            var _btnDisabled = false;
            var btn = document.createElement('button');
            btn.innerHTML = getInputsTextHTML(inputDefine, 'button');
            var _btnListener = getBtnEventListener(inputDefine, NAMES_ON_CLICK);
            assert(_btnListener, 'No button onclick provided.');
            btn.addEventListener('click', inputRecorder.wrapUserInputListener({
                listener: function () {
                    if (_btnDisabled) { return; }
                    return _btnListener.apply(this, arguments);
                },
                op: 'click'
            }));
            resetButtonInputDisabled(inputDefine);

            return {
                elList: [btn],
                disable: resetButtonInputDisabled,
                setState: setButtonInputState,
                getState: getButtonInputState
            };

            function resetButtonInputDisabled(opt) {
                _btnDisabled = !!opt.disabled;
                btn.disabled = _btnDisabled;
            }
            function getButtonInputState() {
                return {disabled: _btnDisabled};
            }
            function setButtonInputState(state) {
                if (!isObject(state)) {
                    console.error(
                        errMsgPrefix + ' Button input state must be object rather than ' + printObject(state)
                        + ' May caused by test case change.'
                    );
                    return;
                }
                resetButtonInputDisabled(state);
            }
        } // End of createButtonInput

        function createBr(inputDefine) {
            return {elList: [document.createElement('br')]};
        }

        function createHr(inputDefine) {
            var _hrWrapperEl = document.createElement('div');
            _hrWrapperEl.className = 'test-inputs-hr'
            var textEl = document.createElement('span');
            textEl.className = 'test-inputs-hr-text';
            _hrWrapperEl.appendChild(textEl);
            var text = textEl.innerHTML = getInputsTextHTML(inputDefine, '');
            textEl.style.display = text ? 'block' : 'none';

            return {
                elList: [_hrWrapperEl]
            };
        }

    } // End of initInputs

    function initRecordCanvas(opt, chart, recordCanvasContainer) {
        if (!opt.recordCanvas) {
            return;
        }
        recordCanvasContainer.innerHTML = ''
            + '<button>Show Canvas Record</button>'
            + '<button>Clear Canvas Record</button>'
            + '<div class="content-area"><textarea></textarea><br><button>Close</button></div>';
        var buttons = recordCanvasContainer.getElementsByTagName('button');
        var canvasRecordButton = buttons[0];
        var clearButton = buttons[1];
        var closeButton = buttons[2];
        var recordArea = recordCanvasContainer.getElementsByTagName('textarea')[0];
        var contentAraa = recordArea.parentNode;
        canvasRecordButton.addEventListener('click', function () {
            var content = [];
            eachCtx(function (zlevel, ctx) {
                content.push('\nLayer zlevel: ' + zlevel, '\n\n');
                if (typeof ctx.stack !== 'function') {
                    alert('Missing: <script src="test/lib/canteen.js"></script>');
                    return;
                }
                var stack = ctx.stack();
                for (var i = 0; i < stack.length; i++) {
                    var line = stack[i];
                    content.push(JSON.stringify(line), ',\n');
                }
            });
            contentAraa.style.display = 'block';
            recordArea.value = content.join('');
        });
        clearButton.addEventListener('click', function () {
            eachCtx(function (zlevel, ctx) {
                ctx.clear();
            });
            recordArea.value = 'Cleared.';
        });
        closeButton.addEventListener('click', function () {
            contentAraa.style.display = 'none';
        });

        function eachCtx(cb) {
            var layers = chart.getZr().painter.getLayers();
            for (var zlevel in layers) {
                if (layers.hasOwnProperty(zlevel)) {
                    var layer = layers[zlevel];
                    var canvas = layer.dom;
                    var ctx = canvas.getContext('2d');
                    cb(zlevel, ctx);
                }
            }
        }
    }

    /**
     * @param {EChartsInstance} chart
     * @param {Parameter<testHelper.create, 2>['boundingRect']} opt.boundingRect
     */
    function initShowBoundingRects(chart, echarts, opt, boundingRectsContainer) {
        assert(chart.__testHelper);

        var _bRectZr;
        var _bRectGroup;
        // @type Parameter<testHelper.create, 2>['boundingRect']
        var _currBoundingRectOpt = false;

        chart.__testHelper.updateBoundingRects
            = chart.__testHelper.updateBoundingRect
            = chart.__testHelper.boundingRect
            = chart.__testHelper.boundingRects
            = updateBoundingRects;

        updateBoundingRects(opt.boundingRect);

        return;

        function updateBoundingRects(opt) {
            if (arguments.length > 0) {
                _currBoundingRectOpt = opt;
            } // If no opt, keep the last one.

            _currBoundingRectOpt
                ? buildBoundingRects(_currBoundingRectOpt)
                : disableBoundingRects();
        }

        function ensureBoundingRectsFacilities() {
            // zr requires size non-zero.
            boundingRectsContainer.style.width = chart.getWidth() + 'px';
            boundingRectsContainer.style.height = chart.getHeight() + 'px';

            if (_bRectZr) {
                _bRectZr.resize();
                return;
            }

            _bRectGroup = new echarts.graphic.Group();
            _bRectGroup.__testHelperBoundingRectsRoot = true;
            _bRectGroup.on('click', function (event) {
                var target = event.target;
                if (!target || !target.__testHelperBoundingRectTarget) {
                    return;
                }
                var wrapper = {
                    boundingRect: target,
                    rawElement: target.__testHelperBoundingRectTarget
                };
                console.log('boundingRect:', wrapper.boundingRect);
                console.log('rawElement:', wrapper.rawElement);
                window.$0 = wrapper;
            });
            _bRectZr = echarts.zrender.init(boundingRectsContainer);
            _bRectZr.add(_bRectGroup);
        }

        function disableBoundingRects() {
            chart.off('finished', updateBoundingRects);
            boundingRectsContainer.style.display = 'none';
            if (_bRectGroup) {
                _bRectGroup.removeAll();
            }
        }

        function buildBoundingRects(boundingRectOpt) {
            ensureBoundingRectsFacilities();
            boundingRectOpt = isObject(boundingRectOpt) ? boundingRectOpt : {};

            boundingRectsContainer.style.display = 'block';
            _bRectGroup.removeAll();

            var strokeColor = boundingRectOpt.color || 'rgba(0,0,255,0.5)';
            var silent = boundingRectOpt.silent != null ? boundingRectOpt.silent : false;

            boundingRectsContainer.style.pointerEvent = silent ? 'none' : 'auto';

            var roots = chart.getZr().storage.getRoots();
            for (var rootIdx = 0; rootIdx < roots.length; rootIdx++) {
                travelGroupAndBuildRects(roots[rootIdx], _bRectGroup);
            }

            // Follow chart update and resize.
            chart.on('finished', updateBoundingRects);

            return;

            function travelGroupAndBuildRects(el, visualRectGroupParent) {
                if (el.childrenRef) { // group or text
                    var visualRectGroup = createVisualRectGroup(el, visualRectGroupParent)
                    var children = el.childrenRef();
                    for (var idx = 0; idx < children.length; idx++) {
                        var child = children[idx];
                        travelGroupAndBuildRects(child, visualRectGroup);
                    }
                }
                // Both display ZRText and TSpan bounding rect for debuging.
                if (!el.isGroup) {
                    createVisualRectForEl(el, visualRectGroupParent);
                }

                function createVisualRectForEl(el, visualRectGroup) {
                    createRectForDisplayable(el, visualRectGroup);
                    var textContent = el.getTextContent();
                    var textGuildLine = el.getTextGuideLine();
                    var textConfig = el.textConfig;
                    if (textContent || textGuildLine) {
                        var isLocal = textConfig && textConfig.local;
                        var targetVisualGroup = isLocal ? visualRectGroup : _bRectGroup;
                        textContent && createRectForDisplayable(textContent, targetVisualGroup, true);
                        textGuildLine && createRectForDisplayable(textGuildLine, targetVisualGroup, true);
                    }
                }

                function createVisualRectGroup(fromEl, visualRectGroupParent) {
                    var visualRectGroup = new echarts.graphic.Group();
                    copyTransformAttrs(visualRectGroup, fromEl);
                    visualRectGroupParent.add(visualRectGroup);
                    return visualRectGroup;
                }

                function createRectForDisplayable(el, visualRectGroup, useInnerTransformable) {
                    var elRawRect = el.getBoundingRect();
                    var visualRect = new echarts.graphic.Rect({
                        shape: {x: elRawRect.x, y: elRawRect.y, width: elRawRect.width, height: elRawRect.height},
                        style: {fill: null, stroke: strokeColor, lineWidth: 1, strokeNoScale: true},
                        silent: silent,
                        z: Number.MAX_SAFE_INTEGER
                    });
                    visualRect.__testHelperBoundingRectTarget = el;
                    var transAttrSource = el;
                    if (useInnerTransformable && el.innerTransformable) {
                        transAttrSource = el.innerTransformable;
                    }
                    copyTransformAttrs(visualRect, transAttrSource);
                    visualRectGroup.add(visualRect);
                }
            }

            function copyTransformAttrs(target, source) {
                target.x = source.x;
                target.y = source.y;
                target.rotation = source.rotation;
                target.scaleX = source.scaleX;
                target.scaleY = source.scaleY;
                target.originX = source.originX;
                target.originY = source.originY;
                target.skewX = source.skewX;
                target.skewY = source.skewY;
                target.anchorX = source.anchorX;
                target.anchorY = source.anchorY;
            }
        }
    }

    testHelper.createRecordVideo = function (chart, recordVideoContainer) {
        var button = document.createElement('button');
        button.innerHTML = 'Start Recording';
        recordVideoContainer.appendChild(button);
        var recorder = new VideoRecorder(chart);

        var isRecording = false;


        button.onclick = function () {
            isRecording ? recorder.stop() : recorder.start();
            button.innerHTML = (isRecording ? 'Start' : 'Stop') + ' Recording';

            isRecording = !isRecording;
        }
    }

    /**
     * @param {ECharts} echarts
     * @param {HTMLElement|string} domOrId
     * @param {Object} option
     * @param {boolean|number} opt If number, means height
     * @param {boolean} opt.lazyUpdate
     * @param {boolean} opt.notMerge
     * @param {boolean} opt.useCoarsePointer
     * @param {boolean} opt.pointerSize
     * @param {number} opt.width
     * @param {number} opt.height
     * @param {boolean} opt.draggable
     * @param {string} opt.renderer 'canvas' or 'svg'
     * @param {string} errMsgPrefix
     */
    testHelper.createChart = function (echarts, domOrId, option, opt, errMsgPrefix) {
        if (typeof opt === 'number') {
            opt = {height: opt};
        }
        else {
            opt = opt || {};
        }

        var dom = getDom(domOrId);

        if (dom) {
            if (opt.width != null) {
                dom.style.width = opt.width + 'px';
            }
            if (opt.height != null) {
                dom.style.height = opt.height + 'px';
            }

            var theme = opt.theme && opt.theme !== 'none' ? opt.theme : null;
            if (theme == null && window.__ECHARTS__DEFAULT__THEME__) {
                theme = window.__ECHARTS__DEFAULT__THEME__;
            }
            if (theme) {
                require(['theme/' + theme]);
            }

            var chart = echarts.init(dom, theme, {
                renderer: opt.renderer,
                useCoarsePointer: opt.useCoarsePointer,
                pointerSize: opt.pointerSize
            });

            if (opt.draggable) {
                if (!window.draggable) {
                    throw new Error(
                        errMsgPrefix + ' Pleasse add the script in HTML: \n'
                        + '<script src="lib/draggable.js"></script>'
                    );
                }
                window.draggable.init(dom, chart, {throttle: 70, onResize: opt.onResize});
            }

            option && chart.setOption(option, {
                lazyUpdate: opt.lazyUpdate,
                notMerge: opt.notMerge
            });

            var isAutoResize = opt.autoResize == null ? true : opt.autoResize;
            if (isAutoResize) {
                testHelper.resizable(chart, {onResize: opt.onResize});
            }

            return chart;
        }
    };

    /**
     * @usage
     * ```js
     * testHelper.printAssert(chart, function (assert) {
     *     // If any error thrown here, a "checked: Fail" will be printed on the chart;
     *     // Otherwise, "checked: Pass" will be printed on the chart.
     *     assert(condition1);
     *     assert(condition2);
     *     assert(condition3);
     * });
     * ```
     * `testHelper.printAssert` can be called multiple times for one chart instance.
     * For each call, one result (fail or pass) will be printed.
     *
     * @param chartOrDomId {EChartsInstance | string}
     * @param checkFn {Function} param: a function `assert`.
     */
    testHelper.printAssert = function (chartOrDomId, checkerFn) {
        if (!chartOrDomId) {
            return;
        }

        var hostDOMEl;
        var chart;
        if (typeof chartOrDomId === 'string') {
            hostDOMEl = document.getElementById(chartOrDomId);
        }
        else {
            chart = chartOrDomId;
            hostDOMEl = chartOrDomId.getDom();
        }
        var failErr;
        function assert(cond) {
            if (!cond) {
                throw new Error();
            }
        }
        try {
            checkerFn(assert);
        }
        catch (err) {
            console.error(err);
            failErr = err;
        }
        var printAssertRecord = hostDOMEl.__printAssertRecord || (hostDOMEl.__printAssertRecord = []);

        var resultDom = document.createElement('div');
        resultDom.innerHTML = failErr ? 'checked: Fail' : 'checked: Pass';
        var fontSize = 40;
        resultDom.style.cssText = [
            'position: absolute;',
            'left: 20px;',
            'pointer-events: none;',
            'font-size: ' + fontSize + 'px;',
            'z-index: ' + (failErr ? 99999 : 88888) + ';',
            'color: ' + (failErr ? 'rgba(150,0,0,0.8)' : 'rgba(0,150,0,0.8)') + ';',
        ].join('');
        printAssertRecord.push(resultDom);
        hostDOMEl.appendChild(resultDom);

        relayoutResult();

        function relayoutResult() {
            var chartHeight = chart ? chart.getHeight() : hostDOMEl.offsetHeight;
            var lineHeight = Math.min(fontSize + 10, (chartHeight - 20) / printAssertRecord.length);
            for (var i = 0; i < printAssertRecord.length; i++) {
                var record = printAssertRecord[i];
                record.style.top = (10 + i * lineHeight) + 'px';
            }
        }
    };


    var _dummyRequestAnimationFrameMounted = false;

    /**
     * Usage:
     * ```js
     * testHelper.controlFrame({pauseAt: 60});
     * // Then load echarts.js (must after controlFrame called)
     * ```
     *
     * @param {Object} [opt]
     * @param {number} [opt.puaseAt] If specified `pauseAt`, auto pause at the frame.
     * @param {Function} [opt.onFrame]
     */
    testHelper.controlFrame = function (opt) {
        opt = opt || {};
        var pauseAt = opt.pauseAt;
        pauseAt == null && (pauseAt = 0);

        var _running = true;
        var _pendingCbList = [];
        var _frameNumber = 0;
        var _mounted = false;

        function getRunBtnText() {
            return _running ? 'pause' : 'run';
        }

        var buttons = [{
            text: getRunBtnText(),
            onclick: function () {
                buttons[0].el.innerHTML = getRunBtnText();
                _running ? pause() : run();
            }
        }, {
            text: 'next frame',
            onclick: nextFrame
        }];

        var btnPanel = document.createElement('div');
        btnPanel.className = 'control-frame-btn-panel'
        var infoEl = document.createElement('div');
        infoEl.className = 'control-frame-info';
        btnPanel.appendChild(infoEl);
        document.body.appendChild(btnPanel);
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            var btnEl = button.el = document.createElement('button');
            btnEl.innerHTML = button.text;
            btnEl.addEventListener('click', button.onclick);
            btnPanel.appendChild(btnEl);
        }

        if (_dummyRequestAnimationFrameMounted) {
            throw new Error('Do not support `controlFrame` twice');
        }
        _dummyRequestAnimationFrameMounted = true;
        var raf = window.requestAnimationFrame;
        window.requestAnimationFrame = function (cb) {
            _pendingCbList.push(cb);
            if (_running && !_mounted) {
                _mounted = true;
                raf(nextFrame);
            }
        };

        function run() {
            _running = true;
            nextFrame();
        }

        function pause() {
            _running = false;
        }

        function nextFrame() {
            opt.onFrame && opt.onFrame(_frameNumber);

            if (pauseAt != null && _frameNumber === pauseAt) {
                _running = false;
                pauseAt = null;
            }
            infoEl.innerHTML = 'Frame: ' + _frameNumber + ' ( ' + (_running ? 'Running' : 'Paused') + ' )';
            buttons[0].el.innerHTML = getRunBtnText();

            _mounted = false;
            var pending = _pendingCbList;
            _pendingCbList = [];
            for (var i = 0; i < pending.length; i++) {
                pending[i]();
            }
            _frameNumber++;
        }
    }

    testHelper.resizable = function (chart, opt) {
        opt = opt || {};
        var dom = chart.getDom();
        var width = dom.clientWidth;
        var height = dom.clientHeight;
        function resize() {
            var newWidth = dom.clientWidth;
            var newHeight = dom.clientHeight;
            if (width !== newWidth || height !== newHeight) {
                chart.resize();
                if (chart.__testHelper && chart.__testHelper.updateBoundingRects) {
                    chart.__testHelper.updateBoundingRects();
                }
                width = newWidth;
                height = newHeight;

                if (opt.onResize) {
                    opt.onResize();
                }
            }
        }
        if (window.attachEvent) {
            // Use builtin resize in IE
            window.attachEvent('onresize', resize);
        }
        else if (window.addEventListener) {
            window.addEventListener('resize', resize, false);
        }
    };

    // Clean params specified by `cleanList` and seed a param specifid by `newVal` in URL.
    testHelper.setURLParam = function (cleanList, newVal) {
        var params = getParamListFromURL();
        for (var i = params.length - 1; i >= 0; i--) {
            for (var j = 0; j < cleanList.length; j++) {
                if (params[i] === cleanList[j]) {
                    params.splice(i, 1);
                }
            }
        }
        newVal && params.push(newVal);
        params.sort();
        location.search = params.join('&');
    };

    // Whether has param `val` in URL.
    testHelper.hasURLParam = function (val) {
        var params = getParamListFromURL();
        for (var i = params.length - 1; i >= 0; i--) {
            if (params[i] === val) {
                return true;
            }
        }
        return false;
    };

    // Nodejs `path.resolve`.
    testHelper.resolve = function () {
        var resolvedPath = '';
        var resolvedAbsolute;

        for (var i = arguments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
            var path = arguments[i];
            if (path) {
                resolvedPath = path + '/' + resolvedPath;
                resolvedAbsolute = path[0] === '/';
            }
        }

        if (!resolvedAbsolute) {
            throw new Error('At least one absolute path should be input.');
        }

        // Normalize the path
        resolvedPath = normalizePathArray(resolvedPath.split('/'), false).join('/');

        return '/' + resolvedPath;
    };

    var encodeHTML = testHelper.encodeHTML = function (source) {
        return String(source)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    var encodeJSObjectKey = function (source, quotationMark) {
        source = '' + source;
        if (!/^[a-zA-Z$_][a-zA-Z0-9$_]*$/.test(source)) {
            source = convertStringToJSLiteral(source, quotationMark);
        }
        return source;
    };

    var convertStringToJSLiteral = function (str, quotationMark) {
        // assert(getType(str) === 'string');
        // assert(quotationMark === '"' || quotationMark === "'");
        str = JSON.stringify(str); // escapse \n\r or others.
        if (quotationMark === "'") {
            str = "'" + str.slice(1, str.length - 1).replace(/'/g, "\\'") + "'";
        }
        return str;
    }

    /**
     * @usage
     * var result = retrieveValue(val, defaultVal);
     * var result = retrieveValue(val1, val2, defaultVal);
     */
    var retrieveValue = testHelper.retrieveValue = function () {
        for (var i = 0, len = arguments.length; i < len; i++) {
            var val = arguments[i];
            if (val != null) {
                return val;
            }
        }
    };

    /**
     * @public
     * @return {string} Current url dir.
     */
    testHelper.dir = function () {
        return location.origin + testHelper.resolve(location.pathname, '..');
    };

    /**
     * Not accurate.
     * @param {*} type
     * @return {string} 'function', 'array', 'typedArray', 'regexp',
     *       'date', 'object', 'boolean', 'number', 'string'
     */
    var getType = testHelper.getType = function (value) {
        var type = typeof value;
        var typeStr = objToString.call(value);

        return !!TYPED_ARRAY[objToString.call(value)]
            ? 'typedArray'
            : typeof value === 'function'
            ? 'function'
            : typeStr === '[object Array]'
            ? 'array'
            : typeStr === '[object Number]'
            ? 'number'
            : typeStr === '[object Boolean]'
            ? 'boolean'
            : typeStr === '[object String]'
            ? 'string'
            : typeStr === '[object RegExp]'
            ? 'regexp'
            : typeStr === '[object Date]'
            ? 'date'
            : !!value && type === 'object'
            ? 'object'
            : null;
    };

    /**
     * JSON.stringify(obj, null, 2) will vertically layout array, which takes too much space.
     * Can print like:
     * [
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123},
     *     {name: 'xxx', value: 123}
     * ]
     * {
     *     arr: [33, 44, 55],
     *     str: 'xxx'
     * }
     *
     * @param {*} object
     * @param {opt|string} [opt] If string, means key.
     * @param {string} [opt.key=''] Top level key, if given, print like: 'someKey: [asdf]'
     * @param {number} [opt.lineBreakMaxColumn=80] If the content in a single line is greater than
     *  `maxColumn` (indent is not included), line break.
     * @param {boolean} [opt.objectLineBreak=undefined] Whether to line break. undefined/null means auto.
     * @param {boolean} [opt.arrayLineBreak=undefined] Whether to line break. undefined/null means auto.
     * @param {string} [opt.indent=4]
     * @param {string} [opt.marginLeft=0] Spaces number for margin left of the entire text.
     * @param {string} [opt.lineBreak='\n']
     * @param {string} [opt.quotationMark="'"] "'" or '"'.
     */
    var printObject = testHelper.printObject = function (obj, opt) {
        opt = typeof opt === 'string'
            ? {key: opt}
            : (opt || {});

        var indent = opt.indent != null ? opt.indent : 4;
        var lineBreak = opt.lineBreak != null ? opt.lineBreak : '\n';
        var quotationMark = ({'"': '"', "'": "'"})[opt.quotationMark] || "'";
        var marginLeft = opt.marginLeft || 0;
        var lineBreakMaxColumn = opt.lineBreakMaxColumn || 80;
        var forceObjectLineBreak = opt.objectLineBreak === true || opt.objectLineBreak === false;
        var forceArrayLineBreak = opt.arrayLineBreak === true || opt.arrayLineBreak === false;

        return (new Array(marginLeft + 1)).join(' ') + doPrint(obj, opt.key, 0).str;

        function doPrint(obj, key, depth) {
            var codeIndent = (new Array(depth * indent + marginLeft + 1)).join(' ');
            var subCodeIndent = (new Array((depth + 1) * indent + marginLeft + 1)).join(' ');
            var hasLineBreak = false;
            //  [
            //      11, 22, 33, 44, 55, 66, // This is a partial break.
            //      77, 88, 99
            //  ]
            var preventParentArrayPartiallyBreak = false;

            var preStr = '';
            if (key != null) {
                preStr += encodeJSObjectKey(key, quotationMark) + ': ';
            }
            var str;

            var objType = getType(obj);

            switch (objType) {
                case 'function':
                    hasLineBreak = true;
                    preventParentArrayPartiallyBreak = true;
                    var fnStr = obj.toString();
                    var isMethodShorthand = key != null && isMethodShorthandNotAccurate(fnStr, obj.name, key);
                    str = (isMethodShorthand ? '' : preStr) + fnStr;
                    break;
                case 'regexp':
                case 'date':
                    str = preStr + quotationMark + obj + quotationMark;
                    break;
                case 'array':
                case 'typedArray':
                    if (forceArrayLineBreak) {
                        hasLineBreak = !!opt.arrayLineBreak;
                    }
                    // If no break line in array, print in single line, like [12, 23, 34].
                    // else, each item takes a line.
                    var childBuilder = [];
                    var maxColumnWithoutLineBreak = preStr.length;
                    var canPartiallyBreak = true;
                    for (var i = 0, len = obj.length; i < len; i++) {
                        var subResult = doPrint(obj[i], null, depth + 1);
                        childBuilder.push(subResult.str);

                        if (subResult.hasLineBreak) {
                            hasLineBreak = true;
                        }
                        else {
                            maxColumnWithoutLineBreak += subResult.str.length + 2; // `2` is ', '.length
                        }

                        if (subResult.preventParentArrayPartiallyBreak) {
                            preventParentArrayPartiallyBreak = true;
                            canPartiallyBreak = false
                        }
                    }
                    if (obj.length > 3) {
                        // `3` is an arbitrary value, considering a path array:
                        //  [
                        //      [1,2], [3,4], [5,6],
                        //      [7,8], [9,10]
                        //  ]
                        preventParentArrayPartiallyBreak = true;
                    }
                    if (!forceObjectLineBreak && maxColumnWithoutLineBreak > lineBreakMaxColumn) {
                        hasLineBreak = true;
                    }
                    var tail = hasLineBreak ? lineBreak : '';
                    var subPre = hasLineBreak ? subCodeIndent : '';
                    var endPre = hasLineBreak ? codeIndent : '';
                    var delimiterInline = ', ';
                    var delimiterBreak = ',' + lineBreak + subCodeIndent;
                    if (!childBuilder.length) {
                        str = preStr + '[]';
                    }
                    else {
                        var subContentStr = '';
                        var subContentMaxColumn = 0;
                        if (canPartiallyBreak && hasLineBreak) {
                            for (var idx = 0; idx < childBuilder.length; idx++) {
                                var childStr = childBuilder[idx];
                                subContentMaxColumn += childStr.length + delimiterInline.length;
                                if (idx === childBuilder.length - 1) {
                                    subContentStr += childStr;
                                }
                                else if (subContentMaxColumn > lineBreakMaxColumn) {
                                    subContentStr += childStr + delimiterBreak;
                                    subContentMaxColumn = 0;
                                }
                                else {
                                    subContentStr += childStr + delimiterInline;
                                }
                            }
                        }
                        else {
                            subContentStr = childBuilder.join(hasLineBreak ? delimiterBreak : delimiterInline);
                        }
                        str = ''
                            + preStr + '[' + tail
                            + subPre + subContentStr + tail
                            + endPre + ']';
                    }
                    break;
                case 'object':
                    if (forceObjectLineBreak) {
                        hasLineBreak = !!opt.objectLineBreak;
                    }
                    var childBuilder = [];
                    var maxColumnWithoutLineBreak = preStr.length;
                    var keyCount = 0;
                    for (var i in obj) {
                        if (obj.hasOwnProperty(i)) {
                            keyCount++;
                            var subResult = doPrint(obj[i], i, depth + 1);
                            childBuilder.push(subResult.str);

                            if (subResult.hasLineBreak) {
                                hasLineBreak = true;
                            }
                            else {
                                maxColumnWithoutLineBreak += subResult.str.length + 2; // `2` is ', '.length
                            }

                            if (subResult.preventParentArrayPartiallyBreak) {
                                preventParentArrayPartiallyBreak = true;
                            }
                        }
                    }
                    if (keyCount > 1) {
                        // `3` is an arbitrary value, considering case like:
                        //  [
                        //      {name: 'xx'}, {name: 'yy'}, {name: 'zz'},
                        //      {name: 'aa'}, {name: 'bb'}
                        //  ]
                        preventParentArrayPartiallyBreak = true;
                    }
                    if (!forceObjectLineBreak && maxColumnWithoutLineBreak > lineBreakMaxColumn) {
                        hasLineBreak = true;
                    }
                    if (!childBuilder.length) {
                        str = preStr + '{}';
                    }
                    else {
                        str = ''
                            + preStr + '{' + (hasLineBreak ? lineBreak : '')
                                + (hasLineBreak ? subCodeIndent : '')
                                + childBuilder.join(',' + (hasLineBreak ? lineBreak + subCodeIndent: ' '))
                                + (hasLineBreak ? lineBreak: '')
                            + (hasLineBreak ? codeIndent : '') + '}';
                    }
                    break;
                case 'boolean':
                case 'number':
                    str = preStr + obj + '';
                    break;
                case 'string':
                    str = preStr + convertStringToJSLiteral(obj, quotationMark);
                    break;
                default:
                    str = preStr + obj + '';
                    preventParentArrayPartiallyBreak = true;
            }

            return {
                str: str,
                hasLineBreak: hasLineBreak,
                isMethodShorthand: isMethodShorthand,
                preventParentArrayPartiallyBreak: preventParentArrayPartiallyBreak
            };
        }

        /**
         * Simple implementation for detecting method shorthand, such as,
         *  ({abc() { return 1; }}).abc   is a method shorthand and needs to
         *  be serialized as `{abc() { return 1; }}` rather than `{abc: abc() { return 1; }}`.
         * Those cases can be detected:
         *   ({abc() { console.log('=>'); return 1; }}).abc   expected: IS_SHORTHAND
         *   ({abc(x, y = 5) { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({$ab_c() { return 1; }}).$ab_c   expected: IS_SHORTHAND
         *   ({*abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({*  abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({async   abc() { return 1; }}).abc   expected: IS_SHORTHAND
         *   ({*abc() { yield 1; }}).abc   expected: IS_SHORTHAND
         *   ({abc(x, y) { return x + y; }}).abc   expected: IS_SHORTHAND
         *   ({abc: function abc() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function def() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function() { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function* () { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function (aa, bb) { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: function (aa, bb = 5) { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: async () => { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: () => { return 1; }}).abc   expected: NOT_SHORTHAND
         *   ({abc: (aa, bb = 5) => { return 1; }}).abc   expected: NOT_SHORTHAND
         * FIXME: fail at some rare cases, such as:
         *   Literal string involved, like:
         *      ({"ab-() ' =>c"() { return 1; }})["ab-() ' =>c"]   expected: IS_SHORTHAND
         *      ({async "ab-c"() { return 1; }})["ab-c"]   expected: IS_SHORTHAND
         *   Computed property name involved, like:
         *      ({[some]() { return 1; }})[some]   expected: IS_SHORTHAND
        */
        function isMethodShorthandNotAccurate(fnStr, fnName, objKey) {
            // Assert fnStr, fnName, objKey is a string.
            if (fnName !== objKey) {
                return false;
            }
            var matched = fnStr.match(/^\s*(async\s+)?(function\s*)?(\*\s*)?([a-zA-Z$_][a-zA-Z0-9$_]*)?\s*\(/);
            if (!matched) {
                return false;
            }
            if (matched[2]) { // match 'function'
                return false;
            }
            // May enhanced by /(['"])(?:(?=(\\?))\2.)*?\1/; to match literal string,
            // such as "ab-c", "a\nc". But this simple impl does not cover it.
            if (!matched[4] || matched[4] !== objKey) { // match "maybe function name"
                return false;
            }
            return true;
        }

    };

    /**
     * Usage:
     * ```js
     * // Print all elements that has `style.text`:
     * var str = testHelper.stringifyElements(chart, {
     *     attr: ['z', 'z2', 'style.text', 'style.fill', 'style.stroke'],
     *     filter: el => el.style && el.style.text
     * });
     * ```
     *
     * @param {EChart} chart
     * @param {Object} [opt]
     * @param {string|Array.<string>} [opt.attr] Only print the given attrName;
     *        For example: 'z2' or ['z2', 'style.fill', 'style.stroke']
     * @param {function} [opt.filter] print a subtree only if any satisfied node exists.
     *        param: el, return: boolean
     */
    var stringifyElements = testHelper.stringifyElements = function (chart, opt) {
        if (!chart) {
            return;
        }
        opt = opt || {};
        var attrNameList = opt.attr;
        if (getType(attrNameList) !== 'array') {
            attrNameList = attrNameList ? [attrNameList] : [];
        }

        var zr = chart.getZr();
        var roots = zr.storage.getRoots();
        var plainRoots = [];

        retrieve(roots, plainRoots);

        var elsStr = printObject(plainRoots, {indent: 2});

        return elsStr;

        // Only retrieve the value of the given attrName.
        function retrieve(elList, plainNodes) {
            var anySatisfied = false;
            for (var i = 0; i < elList.length; i++) {
                var el = elList[i];

                var thisElSatisfied = !opt.filter || opt.filter(el);

                var plainNode = {};

                copyElment(plainNode, el);

                var textContent = el.getTextContent();
                if (textContent) {
                    plainNode.textContent = {};
                    copyElment(plainNode.textContent, textContent);
                }

                var thisSubAnySatisfied = false;
                if (el.isGroup) {
                    plainNode.children = [];
                    thisSubAnySatisfied = retrieve(el.childrenRef(), plainNode.children);
                }

                if (thisElSatisfied || thisSubAnySatisfied) {
                    plainNodes.push(plainNode);
                    anySatisfied = true;
                }
            }

            return anySatisfied;
        }

        function copyElment(plainNode, el) {
            for (var i = 0; i < attrNameList.length; i++) {
                var attrName = attrNameList[i];
                var attrParts = attrName.split('.');
                var partsLen = attrParts.length;
                if (!partsLen) {
                    continue;
                }
                var elInner = el;
                var plainInner = plainNode;
                for (var j = 0; j < partsLen - 1 && elInner; j++) {
                    var attr = attrParts[j];
                    elInner = el[attr];
                    if (elInner) {
                        plainInner = plainInner[attr] || (plainInner[attr] = {});
                    }
                }
                var attr = attrParts[partsLen - 1];
                if (elInner && elInner.hasOwnProperty(attr)) {
                    plainInner[attr] = elInner[attr];
                }
            }
        }
    };

    /**
     * Usage:
     * ```js
     * // Print all elements that has `style.text`:
     * testHelper.printElements(chart, {
     *     attr: ['z', 'z2', 'style.text', 'style.fill', 'style.stroke'],
     *     filter: el => el.style && el.style.text
     * });
     * ```
     *
     * @see `stringifyElements`.
     */
    var printElements = testHelper.printElements = function (chart, opt) {
        var elsStr = testHelper.stringifyElements(chart, opt);
        console.log(elsStr);
    };

    /**
     * Usage:
     * ```js
     * // Print all elements that has `style.text`:
     * testHelper.retrieveElements(chart, {
     *     filter: el => el.style && el.style.text
     * });
     * ```
     *
     * @param {EChart} chart
     * @param {Object} [opt]
     * @param {function} [opt.filter] print a subtree only if any satisfied node exists.
     *        param: el, return: boolean
     * @return {Array.<Element>}
     */
    var retrieveElements = testHelper.retrieveElements = function (chart, opt) {
        if (!chart) {
            return;
        }
        opt = opt || {};
        var attrNameList = opt.attr;
        if (getType(attrNameList) !== 'array') {
            attrNameList = attrNameList ? [attrNameList] : [];
        }

        var zr = chart.getZr();
        var roots = zr.storage.getRoots();
        var result = [];

        retrieve(roots);

        function retrieve(elList) {
            for (var i = 0; i < elList.length; i++) {
                var el = elList[i];
                if (!opt.filter || opt.filter(el)) {
                    result.push(el);
                }
                if (el.isGroup) {
                    retrieve(el.childrenRef());
                }
            }
        }

        return result;
    };

    // opt: {record: JSON, width: number, height: number}
    testHelper.reproduceCanteen = function (opt) {
        var canvas = document.createElement('canvas');
        canvas.style.width = opt.width + 'px';
        canvas.style.height = opt.height + 'px';
        var dpr = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = opt.width * dpr;
        canvas.height = opt.height * dpr;

        var ctx = canvas.getContext('2d');
        var record = opt.record;

        for (var i = 0; i < record.length; i++) {
            var line = record[i];
            if (line.attr) {
                if (!line.hasOwnProperty('val')) {
                    alertIllegal(line);
                }
                ctx[line.attr] = line.val;
            }
            else if (line.method) {
                if (!line.hasOwnProperty('arguments')) {
                    alertIllegal(line);
                }
                ctx[line.method].apply(ctx, line.arguments);
            }
            else {
                alertIllegal(line);
            }
        }

        function alertIllegal(line) {
            throw new Error('Illegal line: ' + JSON.stringify(line));
        }

        document.body.appendChild(canvas);
    };

    function initDataTables(opt, dataTableContainer) {
        var dataTables = opt.dataTables;
        if (!dataTables && opt.dataTable) {
            dataTables = [opt.dataTable];
        }
        if (dataTables) {
            var tableHTML = [];
            for (var i = 0; i < dataTables.length; i++) {
                tableHTML.push(createDataTableHTML(dataTables[i], opt));
            }
            dataTableContainer.innerHTML = tableHTML.join('');
        }
    }

    function createDataTableHTML(data, opt) {
        var sourceFormat = detectSourceFormat(data);
        var dataTableLimit = opt.dataTableLimit || DEFAULT_DATA_TABLE_LIMIT;

        if (!sourceFormat) {
            return '';
        }

        var html = ['<table><tbody>'];

        if (sourceFormat === 'arrayRows') {
            for (var i = 0; i < data.length && i <= dataTableLimit; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var j = 0; j < line.length; j++) {
                    var val = i === dataTableLimit ? '...' : line[j];
                    htmlLine.push('<td>' + encodeHTML(val) + '</td>');
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }
        else if (sourceFormat === 'objectRows') {
            for (var i = 0; i < data.length && i <= dataTableLimit; i++) {
                var line = data[i];
                var htmlLine = ['<tr>'];
                for (var key in line) {
                    if (line.hasOwnProperty(key)) {
                        var keyText = i === dataTableLimit ? '...' : key;
                        htmlLine.push('<td class="test-data-table-key">' + encodeHTML(keyText) + '</td>');
                        var val = i === dataTableLimit ? '...' : line[key];
                        htmlLine.push('<td>' + encodeHTML(val) + '</td>');
                    }
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }
        else if (sourceFormat === 'keyedColumns') {
            for (var key in data) {
                var htmlLine = ['<tr>'];
                htmlLine.push('<td class="test-data-table-key">' + encodeHTML(key) + '</td>');
                if (data.hasOwnProperty(key)) {
                    var col = data[key] || [];
                    for (var i = 0; i < col.length && i <= dataTableLimit; i++) {
                        var val = i === dataTableLimit ? '...' : col[i];
                        htmlLine.push('<td>' + encodeHTML(val) + '</td>');
                    }
                }
                htmlLine.push('</tr>');
                html.push(htmlLine.join(''));
            }
        }

        html.push('</tbody></table>');

        return html.join('');
    }

    function detectSourceFormat(data) {
        if (data.length) {
            for (var i = 0, len = data.length; i < len; i++) {
                var item = data[i];

                if (item == null) {
                    continue;
                }
                else if (item.length) {
                    return 'arrayRows';
                }
                else if (typeof data === 'object') {
                    return 'objectRows';
                }
            }
        }
        else if (typeof data === 'object') {
            return 'keyedColumns';
        }
    }

    function createObjectHTML(obj, key) {
        var html = isObject(obj)
            ? encodeHTML(printObject(obj, key))
            : obj
            ? obj.toString()
            : '';

        return [
            '<pre class="test-print-object">',
            html,
            '</pre>'
        ].join('');
    }

    var getDom = testHelper.getDom = function (domOrId) {
        return getType(domOrId) === 'string' ? document.getElementById(domOrId) : domOrId;
    }


    // resolves . and .. elements in a path array with directory names there
    // must be no slashes or device names (c:\) in the array
    // (so also no leading and trailing slashes - it does not distinguish
    // relative and absolute paths)
    function normalizePathArray(parts, allowAboveRoot) {
        var res = [];
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];

            // ignore empty parts
            if (!p || p === '.') {
                continue;
            }

            if (p === '..') {
                if (res.length && res[res.length - 1] !== '..') {
                    res.pop();
                } else if (allowAboveRoot) {
                    res.push('..');
                }
            } else {
                res.push(p);
            }
        }

        return res;
    }

    function getParamListFromURL() {
        var params = location.search.replace('?', '');
        return params ? params.split('&') : [];
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return type === 'function' || (!!value && type === 'object');
    }

    function arrayIndexOf(arr, value) {
        if (arr.indexOf) {
            return arr.indexOf(value);
        }
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === value) {
                return i;
            }
        }
        return -1;
    }

    var assert = testHelper.assert = function (cond, msg) {
        if (!cond) {
            throw new Error(msg || 'Assertion failed.');
        }
    }

    function makeFlexibleNames(dashedNames) {
        var nameMap = {};
        for (var i = 0; i < dashedNames.length; i++) {
            var name = dashedNames[i];
            var tmpNames = [];
            tmpNames.push(name);
            tmpNames.push(name.replace(/-/g, ''));
            tmpNames.push(name.replace(/-/g, '_'));
            tmpNames.push(name.replace(/-([a-zA-Z0-9])/g, function (_, wf) {
                return wf.toUpperCase();
            }));
            for (var j = 0; j < tmpNames.length; j++) {
                nameMap[tmpNames[j]] = 1;
                nameMap[tmpNames[j].toUpperCase()] = 1;
                nameMap[tmpNames[j].toLowerCase()] = 1;
            }
        }
        var names = [];
        for (var name in nameMap) {
            if (nameMap.hasOwnProperty(name)) {
                names.push(name);
            }
        }
        return names;
    }

    /**
     * Copied from src/util/number.ts
     */
    function getPrecision(val) {
        val = +val;
        if (isNaN(val)) {
            return 0;
        }

        // It is much faster than methods converting number to string as follows
        //      let tmp = val.toString();
        //      return tmp.length - 1 - tmp.indexOf('.');
        // especially when precision is low
        // Notice:
        // (1) If the loop count is over about 20, it is slower than `getPrecisionSafe`.
        //     (see https://jsbench.me/2vkpcekkvw/1)
        // (2) If the val is less than for example 1e-15, the result may be incorrect.
        //     (see test/ut/spec/util/number.test.ts `getPrecision_equal_random`)
        if (val > 1e-14) {
            var e = 1;
            for (var i = 0; i < 15; i++, e *= 10) {
                if (Math.round(val * e) / e === val) {
                    return i;
                }
            }
        }

        return getPrecisionSafe(val);
    }

    /**
     * Copied from src/util/number.ts
     * Get precision with slow but safe method
     */
    function getPrecisionSafe(val) {
        // toLowerCase for: '3.4E-12'
        var str = val.toString().toLowerCase();

        // Consider scientific notation: '3.4e-12' '3.4e+12'
        var eIndex = str.indexOf('e');
        var exp = eIndex > 0 ? +str.slice(eIndex + 1) : 0;
        var significandPartLen = eIndex > 0 ? eIndex : str.length;
        var dotIndex = str.indexOf('.');
        var decimalPartLen = dotIndex < 0 ? 0 : significandPartLen - 1 - dotIndex;
        return Math.max(0, decimalPartLen - exp);
    }

    /**
     * Copied from src/util/number.ts
     */
    function round(x, precision, returnStr) {
        if (precision == null) {
            precision = 10;
        }
        // Avoid range error
        precision = Math.min(Math.max(0, precision), ROUND_SUPPORTED_PRECISION_MAX);
        // PENDING: 1.005.toFixed(2) is '1.00' rather than '1.01'
        x = (+x).toFixed(precision);
        return (returnStr ? x : +x);
    }
    // Although chrome already enlarge this number to 100 for `toFixed`, but
    // we sill follow the spec for compatibility.
    var ROUND_SUPPORTED_PRECISION_MAX = 20;


    function objectNoOtherNotNullUndefinedPropExcept(obj, exceptProps) {
        if (!obj) {
            return false;
        }
        for (var key in obj) {
            if (obj.hasOwnProperty(key) && arrayIndexOf(exceptProps, key) < 0 && obj[key] != null) {
                return false;
            }
        }
        return true;
    }

    var copyToClipboard = function (text) {
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
            console.error('[clipboard] Can not copy to clipboard.');
            return;
        }
        return navigator.clipboard.writeText(text).then(function () {
            console.log('[clipboard] Text copied to clipboard.');
        }).catch(function (err) {
            console.error('[clipboard] Failed to copy text: ', err); // Just print for easy to use.
            return err;
        });
    };

    /**
     * A shortcut for both stringify and copy to clipboard.
     *
     * @param {any} val Any val to stringify and copy to clipboard.
     * @param {Object?} printObjectOpt Optional.
     */
    testHelper.clipboard = function (val, printObjectOpt) {
        var literal = testHelper.printObject(val, printObjectOpt);
        if (document.hasFocus()) {
            copyToClipboard(literal);
        }
        else {
            // Handle the error:
            //  NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
            ensureClipboardButton();
            updateClipboardButton(literal)
            console.log(
                '⚠️ [clipboard] Please click the new button that appears on the top-left corner of the screen'
                + ' to copy to clipboard.'
            );
        }

        function updateClipboardButton(text) {
            var button = __tmpClipboardButttonWrapper.button;
            button.innerHTML = 'Click me to copy to clipboard';
            button.style.display = 'block';
            __tmpClipboardButttonWrapper.text = text;
        }

        function ensureClipboardButton() {
            var button = __tmpClipboardButttonWrapper.button;
            if (button != null) {
                return;
            }
            __tmpClipboardButttonWrapper.button = button = document.createElement('div');
            button.style.cssText = [
                'height: 80px;',
                'line-height: 80px;',
                'padding: 10px 20px;',
                'margin: 5px;',
                'text-align: center;',
                'position: fixed;',
                'top: 10px;',
                'left: 10px;',
                'z-index: 9999;',
                'cursor: pointer;',
                'color: #fff;',
                'background-color: #333;',
                'border: 2px solid #eee;',
                'border-radius: 5px;',
                'font-size: 18px;',
                'font-weight: bold;',
                'font-family: sans-serif;',
                'box-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);'
            ].join('');
            document.body.appendChild(button);
            button.addEventListener('click', function () {
                copyToClipboard(__tmpClipboardButttonWrapper.text).then(function (err) {
                    if (!err) {
                        button.style.display = 'none';
                    }
                    else {
                        button.innerHTML = 'error, see console log.';
                    }
                });
            });
        }
        // Do not return the text, because it may be too long for a console.log.
    };
    var __tmpClipboardButttonWrapper = {};

    // It may be changed by test case changing. Do not use it as a persistent id.
    var _idBase = 1;
    function generateNonPersistentId(prefix) {
        return (prefix || '') + '' + (_idBase++);
    }

    function VideoRecorder(chart) {
        this.start = startRecording;
        this.stop = stopRecording;

        var recorder = null;

        var oldRefreshImmediately = chart.getZr().refreshImmediately;

        function startRecording() {
            // Normal resolution or high resolution?
            var compositeCanvas = document.createElement('canvas');
            var width = chart.getWidth();
            var height = chart.getHeight();
            compositeCanvas.width = width;
            compositeCanvas.height = height;
            var compositeCtx = compositeCanvas.getContext('2d');

            chart.getZr().refreshImmediately = function () {
                var ret = oldRefreshImmediately.apply(this, arguments);
                var canvasList = chart.getDom().querySelectorAll('canvas');
                compositeCtx.fillStyle = '#fff';
                compositeCtx.fillRect(0, 0, width, height);
                for (var i = 0; i < canvasList.length; i++) {
                    compositeCtx.drawImage(canvasList[i], 0, 0, width, height);
                }
                return ret;
            }

            var stream = compositeCanvas.captureStream(25);
            recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

            var videoData = [];
            recorder.ondataavailable = function (event) {
                if (event.data && event.data.size) {
                    videoData.push(event.data);
                }
            };

            recorder.onstop = function () {
                var url = URL.createObjectURL(new Blob(videoData, { type: 'video/webm' }));

                var a = document.createElement('a');
                a.href = url;
                a.download = 'recording.webm';
                a.click();

                setTimeout(function () {
                    window.URL.revokeObjectURL(url);
                }, 100);
            };

            recorder.start();
        }

        function stopRecording() {
            if (recorder) {
                chart.getZr().refreshImmediately = oldRefreshImmediately;
                recorder.stop();
            }
        }
    }

    context.testHelper = testHelper;

})(window);
