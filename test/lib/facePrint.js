// Just for temporarily mobile debug.

(function () {

    var infoDom;
    var msgs = [];

    var count = 0;

    window.facePrint = function (msg, printObj) {
        if (!infoDom) {
            infoDom = createInfoDom();
        }

        if (printObj && isObject(msg)) {
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
            str += msgs[i] + ' ' + (count - msgs.length + i) + ' ';
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
            'position: fixed;',
            'top: 0;',
            'width: 100%;',
            'border: 1px solid red;',
            'height: 20px;',
            'line-height: 20px;',
            'z-index: 2147483647'
        ].join('');

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