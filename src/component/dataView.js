/**
 * echarts组件：提示框
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
define(function (require) {
    /**
     * 构造函数
     * @param {Object} messageCenter echart消息中心
     * @param {ZRender} zr zrender实例
     * @param {Object} option 提示框参数
     * @param {HtmlElement} dom 目标对象
     */
    function DataView(ecConfig, messageCenter, zr, option, dom) {
        var Base = require('./base');
        Base.call(this, ecConfig, zr);

        var self = this;
        self.type = ecConfig.COMPONENT_TYPE_DATAVIEW;

        var _lang = ['Data View', 'close', 'refresh'];

        var _canvasSupported = require('zrender/tool/env').canvasSupported;
        
        // dataview dom & css
        var _tDom = document.createElement('div');
        var _textArea = document.createElement('textArea');
        var _buttonRefresh = document.createElement('button');
        var _buttonClose = document.createElement('button');
        var _hasShow = false;

        // 通用样式
        var _gCssText = 'position:absolute;'
                        + 'display:block;'
                        + 'overflow:hidden;'
                        + 'transition:height 0.8s,background-color 1s;'
                        + '-moz-transition:height 0.8s,background-color 1s;'
                        + '-webkit-transition:height 0.8s,background-color 1s;'
                        + '-o-transition:height 0.8s,background-color 1s;'
                        + 'z-index:1;'
                        + 'left:0;'
                        + 'top:0;';
        var _sizeCssText;
        var _cssName = 'echarts-dataview';

        // 缓存一些高宽数据
        var _zrHeight = zr.getHeight();
        var _zrWidth = zr.getWidth();

        function hide() {
            _sizeCssText = 'width:' + _zrWidth + 'px;'
                           + 'height:' + 0 + 'px;'
                           + 'background-color:#f0ffff;';
            _tDom.style.cssText = _gCssText + _sizeCssText;
            // 这是个很恶心的事情
            dom.onselectstart = function() {
                return false;
            };
        }

        function show(newOption) {
            _hasShow = true;
            var lang = self.query(option, 'toolbox.feature.dataView.lang')
                       || _lang;

            option = newOption;


            _tDom.innerHTML = '<p style="padding:8px 0;margin:0 0 10px 0;'
                              + 'border-bottom:1px solid #eee">'
                              + (lang[0] || _lang[0])
                              + '</p>';

            _textArea.style.cssText =
                'display:block;margin:0 0 8px 0;padding:4px 6px;overflow:auto;'
                + 'width:' + (_zrWidth - 15) + 'px;'
                + 'height:' + (_zrHeight - 100) + 'px;';
            var customContent = self.query(
                option, 'toolbox.feature.dataView.optionToContent'
            );
            if (typeof customContent != 'function') {
                _textArea.value = _optionToContent();
            }
            else {
                _textArea.value = customContent(option);
            }
            _tDom.appendChild(_textArea);

            _buttonClose.style.cssText = 'float:right;padding:1px 6px;';
            _buttonClose.innerHTML = lang[1] || _lang[1];
            _buttonClose.onclick = hide;
            _tDom.appendChild(_buttonClose);

            if (self.query(option, 'toolbox.feature.dataView.readOnly')
                === false
            ) {
                _buttonRefresh.style.cssText =
                    'float:right;margin-right:10px;padding:1px 6px;';
                _buttonRefresh.innerHTML = lang[2] || _lang[2];
                _buttonRefresh.onclick = _save;
                _tDom.appendChild(_buttonRefresh);
                _textArea.readOnly = false;
                _textArea.style.cursor = 'default';
            }
            else {
                _textArea.readOnly = true;
                _textArea.style.cursor = 'text';
            }

            _sizeCssText = 'width:' + _zrWidth + 'px;'
                           + 'height:' + _zrHeight + 'px;'
                           + 'background-color:#fff;';
            _tDom.style.cssText = _gCssText + _sizeCssText;

            // 这是个很恶心的事情
            dom.onselectstart = function() {
                return true;
            };
        }

        function _optionToContent() {
            var i;
            var j;
            var k;
            var len;
            var data;
            var valueList;
            var axisList = [];
            var content = '';
            if (option.xAxis) {
                if (option.xAxis instanceof Array) {
                    axisList = option.xAxis;
                } else {
                    axisList = [option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // 横纵默认为类目
                    if ((axisList[i].type || 'category') == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            data = axisList[i].data[j];
                            valueList.push(
                                typeof data.value != 'undefined'
                                ? data.value : data
                            );
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            if (option.yAxis) {
                if (option.yAxis instanceof Array) {
                    axisList = option.yAxis;
                } else {
                    axisList = [option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            data = axisList[i].data[j];
                            valueList.push(
                                typeof data.value != 'undefined'
                                ? data.value : data
                            );
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            var series = option.series;
            var itemName;
            for (i = 0, len = series.length; i < len; i++) {
                valueList = [];
                for (j = 0, k = series[i].data.length; j < k; j++) {
                    data = series[i].data[j];
                    if (series[i].type == ecConfig.CHART_TYPE_PIE
                        || series[i].type == ecConfig.CHART_TYPE_MAP
                    ) {
                        itemName = (data.name || '-') + ':';
                    }
                    else {
                        itemName = '';
                    }
                    
                    if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                        data = typeof data.value != 'undefined' 
                               ? data.value
                               : data;
                        data = data.join(', ');
                    }
                    valueList.push(
                        itemName
                        + (typeof data.value != 'undefined' ? data.value : data)
                    );
                }
                content += (series[i].name || '-') + ' : \n';
                content += valueList.join(
                    series[i].type == ecConfig.CHART_TYPE_SCATTER ? '\n': ', '
                );
                content += '\n\n';
            }

            return content;
        }

        function _save() {
            var text = _textArea.value;
            var customContent = self.query(
                option, 'toolbox.feature.dataView.contentToOption'
            );
            if (typeof customContent != 'function') {
                text = text.split('\n');
                var content = [];
                for (var i = 0, l = text.length; i < l; i++) {
                    text[i] = _trim(text[i]);
                    if (text[i] !== '') {
                        content.push(text[i]);
                    }
                }
                _contentToOption(content);
            }
            else {
                customContent(text, option);
            }

            hide();

            setTimeout(
                function(){
                    messageCenter && messageCenter.dispatch(
                        ecConfig.EVENT.DATA_VIEW_CHANGED,
                        null,
                        {option : option}
                    );
                },
                // 有动画，所以高级浏览器时间更长点
                _canvasSupported ? 800 : 100
            );
        }

        function _contentToOption(content) {
            var i;
            var j;
            var k;
            var len;
            var data;
            var axisList = [];

            var contentIdx = 0;
            var contentValueList;
            var value;

            if (option.xAxis) {
                if (option.xAxis instanceof Array) {
                    axisList = option.xAxis;
                } else {
                    axisList = [option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // 横纵默认为类目
                    if ((axisList[i].type || 'category') == 'category'
                    ) {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = _trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            if (option.yAxis) {
                if (option.yAxis instanceof Array) {
                    axisList = option.yAxis;
                } else {
                    axisList = [option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = _trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            var series = option.series;
            for (i = 0, len = series.length; i < len; i++) {
                contentIdx++;
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        contentValueList = content[contentIdx];
                        value = contentValueList.replace(' ','').split(',');
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                        contentIdx++;
                    }
                }
                else {
                    contentValueList = content[contentIdx].split(',');
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        value = (contentValueList[j] || '').replace(/.*:/,'');
                        value = _trim(value);
                        value = (value != '-' && value !== '')
                                ? (value - 0)
                                : '-';
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                    }
                    contentIdx++;
                }
            }
        }

        function _trim(str){
            var trimer = new RegExp(
                '(^[\\s\\t\\xa0\\u3000]+)|([\\u3000\\xa0\\s\\t]+\x24)', 'g'
            );
            return str.replace(trimer, '');
        }

        // 阻塞zrender事件
        function _stop(e){
            e = e || window.event;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            else {
                e.cancelBubble = true;
            }
        }

        function _init() {
            _tDom.className = _cssName;
            hide();
            dom.firstChild.appendChild(_tDom);

            if (window.addEventListener) {
                _tDom.addEventListener('click', _stop);
                _tDom.addEventListener('mousewheel', _stop);
                _tDom.addEventListener('mousemove', _stop);
                _tDom.addEventListener('mousedown', _stop);
                _tDom.addEventListener('mouseup', _stop);

                // mobile支持
                _tDom.addEventListener('touchstart', _stop);
                _tDom.addEventListener('touchmove', _stop);
                _tDom.addEventListener('touchend', _stop);
            }
            else {
                _tDom.attachEvent('onclick', _stop);
                _tDom.attachEvent('onmousewheel', _stop);
                _tDom.attachEvent('onmousemove', _stop);
                _tDom.attachEvent('onmousedown', _stop);
                _tDom.attachEvent('onmouseup', _stop);
            }
        }

        /**
         * zrender事件响应：窗口大小改变
         */
        function resize() {
            _zrHeight = zr.getHeight();
            _zrWidth = zr.getWidth();
            if (_tDom.offsetHeight > 10) {
                _sizeCssText = 'width:' + _zrWidth + 'px;'
                               + 'height:' + _zrHeight + 'px;'
                               + 'background-color:#fff;';
                _tDom.style.cssText = _gCssText + _sizeCssText;
                _textArea.style.cssText = 'display:block;margin:0 0 8px 0;'
                                        + 'padding:4px 6px;overflow:auto;'
                                        + 'width:' + (_zrWidth - 15) + 'px;'
                                        + 'height:' + (_zrHeight - 100) + 'px;';
            }
        }

        /**
         * 释放后实例不可用，重载基类方法
         */
        function dispose() {
            if (window.removeEventListener) {
                _tDom.removeEventListener('click', _stop);
                _tDom.removeEventListener('mousewheel', _stop);
                _tDom.removeEventListener('mousemove', _stop);
                _tDom.removeEventListener('mousedown', _stop);
                _tDom.removeEventListener('mouseup', _stop);

                // mobile支持
                _tDom.removeEventListener('touchstart', _stop);
                _tDom.removeEventListener('touchmove', _stop);
                _tDom.removeEventListener('touchend', _stop);
            }
            else {
                _tDom.detachEvent('onclick', _stop);
                _tDom.detachEvent('onmousewheel', _stop);
                _tDom.detachEvent('onmousemove', _stop);
                _tDom.detachEvent('onmousedown', _stop);
                _tDom.detachEvent('onmouseup', _stop);
            }

            _buttonRefresh.onclick = null;
            _buttonClose.onclick = null;

            if (_hasShow) {
                _tDom.removeChild(_textArea);
                _tDom.removeChild(_buttonRefresh);
                _tDom.removeChild(_buttonClose);
            }

            _textArea = null;
            _buttonRefresh = null;
            _buttonClose = null;

            dom.firstChild.removeChild(_tDom);
            _tDom = null;
            self = null;
        }


        // 重载基类方法
        self.dispose = dispose;

        self.resize = resize;
        self.show = show;
        self.hide = hide;

        _init();
    }

    require('../component').define('dataView', DataView);
    
    return DataView;
});