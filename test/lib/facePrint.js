
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

// Just for temporarily mobile debug.

(function () {

    var infoDom;
    var msgs = [];

    var count = 0;

    /**
     * @param {string|Object|Array} msg
     */
    window.facePrint = function (msg) {
        if (!infoDom) {
            infoDom = createInfoDom();
        }

        if (isObject(msg)) {
            msg = window.facePrint.objToStr(msg);
        }

        msgs.push(encodeHTML(msg));
        count++;

        if (msgs.length > 30) {
            msgs.shift();
        }

        var str = '';
        // Make some change in view, otherwise user may
        // be not aware that log is still printing.
        for (var i = 0; i < msgs.length; i++) {
            str += '<span style="background:#555;margin: 0 3px;padding: 0 2px;color:yellow;">'
                + (count - msgs.length + i) + '</span>' + msgs[i];
        }
        infoDom.innerHTML = str;
    };

    window.facePrint.objToStr = function (obj) {
        var msgArr = [];
        for (var key in obj) {
            msgArr.push(key + '=' + obj[key]);
        }
        return msgArr.join(', ');
    };

    function createInfoDom() {
        var dom = document.createElement('div');

        dom.style.cssText = [
            'position: fixed',
            'top: 0',
            'width: 100%',
            'min-height: 14px',
            'line-height: 14px',
            'z-index: 2147483647',
            'color: #fff',
            'font-size: 9px',
            'background: #000',
            'word-break:break-all',
            'word-wrap:break-word'
        ].join(';') + ';';

        document.body.appendChild(dom);

        return dom;
    }

    function encodeHTML(source) {
        return source == null
            ? ''
            : String(source)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return type === 'function' || (!!value && type == 'object');
    }

})();