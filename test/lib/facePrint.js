// Just for temporarily mobile debug.

(function () {

    var infoDom;
    var msgs = [];

    window.facePrint = function (msg, delimiter, max) {
        if (!infoDom) {
            infoDom = createInfoDom();
        }

        msgs.push(encodeHTML(msg));

        if (msgs.length > (max || 50)) {
            msgs.shift();
        }

        infoDom.innerHTML = msgs.join(delimiter || ' ');
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