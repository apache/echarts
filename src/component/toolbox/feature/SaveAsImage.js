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

/* global Uint8Array */

import env from 'zrender/src/core/env';
import lang from '../../../lang';
import * as featureManager from '../featureManager';

var saveAsImageLang = lang.toolbox.saveAsImage;

function SaveAsImage(model) {
    this.model = model;
}

SaveAsImage.defaultOption = {
    show: true,
    icon: 'M4.7,22.9L29.3,45.5L54.7,23.4M4.6,43.6L4.6,58L53.8,58L53.8,43.6M29.2,45.1L29.2,0',
    title: saveAsImageLang.title,
    type: 'png',
    // Default use option.backgroundColor
    // backgroundColor: '#fff',
    name: '',
    excludeComponents: ['toolbox'],
    pixelRatio: 1,
    lang: saveAsImageLang.lang.slice()
};

SaveAsImage.prototype.unusable = !env.canvasSupported;

var proto = SaveAsImage.prototype;

proto.onclick = function (ecModel, api) {
    var model = this.model;
    var title = model.get('name') || ecModel.get('title.0.text') || 'echarts';
    var $a = document.createElement('a');
    var type = model.get('type', true) || 'png';
    $a.download = title + '.' + type;
    $a.target = '_blank';
    var url = api.getConnectedDataURL({
        type: type,
        backgroundColor: model.get('backgroundColor', true)
            || ecModel.get('backgroundColor') || '#fff',
        excludeComponents: model.get('excludeComponents'),
        pixelRatio: model.get('pixelRatio')
    });
    $a.href = url;
    // Chrome and Firefox
    if (typeof MouseEvent === 'function' && !env.browser.ie && !env.browser.edge) {
        var evt = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: false
        });
        $a.dispatchEvent(evt);
    }
    // IE
    else {
        if (window.navigator.msSaveOrOpenBlob) {
            var bstr = atob(url.split(',')[1]);
            var n = bstr.length;
            var u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            var blob = new Blob([u8arr]);
            window.navigator.msSaveOrOpenBlob(blob, title + '.' + type);
        }
        else {
            var lang = model.get('lang');
            var html = ''
                + '<body style="margin:0;">'
                + '<img src="' + url + '" style="max-width:100%;" title="' + ((lang && lang[0]) || '') + '" />'
                + '</body>';
            var tab = window.open();
            tab.document.write(html);
        }
    }
};

featureManager.register(
    'saveAsImage', SaveAsImage
);

export default SaveAsImage;