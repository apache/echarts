// Just for temporarily mobile debug.

(function () {

    var infoDom;
    var msgs = [];

    var count = 0;

    window.facePrint = function (msg, delimiter, max) {
        if (!infoDom) {
            infoDom = createInfoDom();
        }

        msgs.push(encodeHTML(msg));
        count++;

        if (msgs.length > (max || 30)) {
            msgs.shift();
        }

        if (delimiter) {
            infoDom.innerHTML = msgs.join(delimiter);
        }
        else {
            var str = '';
            // Make some change in view, otherwise user may
            // be not aware that log is still printing.
            for (var i = 0; i < msgs.length; i++) {
                str += msgs[i] + ' ' + (count - msgs.length + i) + ' ';
            }
            infoDom.innerHTML = str;
        }
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

})();