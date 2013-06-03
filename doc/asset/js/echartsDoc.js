function JsonTree(jsonData) {
    function isArray(o) {
        if (Array.isArray) {
            return Array.isArray(o);
        }
        if (Object.prototype.toString.call(o) === '[object Array]') {
            return true;
        }
        return false;
    }

    function htmlEncode(str) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    //building the jsonData as dom elements
    this.getTree = function(domId) {
        if (this.display === true) {
            return;
        } else {
            this.display = true;
        }
        var html = '';
        var dataType = isArray(jsonData) ? 'arr' : '';
        var tree = document.createElement('div');
        tree.id = domId || "tree";
        tree.className = 'tree';
        //tree.id = "JsonViewer";
        tree.innerHTML = buildDom(jsonData, dataType);
        bindEvents(tree);
        return tree;
    }
    //building doms
    function buildDom(o, literal) {
        // null object
        var type = o === null
                   ? 'null'
                   : (isArray(o) ? 'array' : typeof o);
        var html = '';

        switch(type) {
            case 'array' :
                for (var i = 0, len = o.length; i < len; i++) {
                    html += '<li class = \'tree-close\' title=\''
                            + literal + '[' + i + ']\'><strong>'
                            + i + '</strong>:'
                            + buildDom(o[i], literal + '[' + i + ']')
                            + ',</li>';
                }
                return '<span class="operator">+</span><div class="group">'
                       + '[<ul class="' + type + '">'
                       + html.replace(/,<\/li>$/, '<\/li>')
                       + '</ul>]</div><div class="summary">Array['
                       + len + ']</div>';
                break;
            case 'object':
                //sort obj
                //var keys = Object.keys(o);
                //keys.sort();
                for (var key in o) {
                    //quote numeric property
                    if (/^\d+$/.test(key)) {
                        html += '<li class = \'tree-close\' title=\'' + literal
                                + '["' + key + '"]\'><strong>"'
                                + key + '"</strong>:'
                                + buildDom(
                                    o[key], literal + '["' + key + '"]'
                                  )
                                + ',</li>';
                    } else {
                        html += '<li class = \'tree-close\' title=\''
                                + key
                                + '\'><a href=\'#' + (literal == '' ? key : literal).charAt(0).toUpperCase()
                                + (literal == '' ? key : literal).slice(1)
                                + '\'><strong>' + key + '</strong></a>:'
                                + buildDom(o[key], literal == '' ? key : literal)
                                + ',</li>';
                    }
                }
                //remove last comma
                return '<span class="operator">+</span><div class="group">'
                       +'{<ul class="' + type + '">'
                       + html.replace(/,<\/li>$/, '<\/li>')
                       + '</ul>}</div><div class="summary">Object</div>';
                break;
            case 'string':
                return '<span class="value ' + type + '">"'
                        + (/^https?\:(\/\/).*$/i.test(o)
                          ? '<a href="' + o + '" target="_blank">' + o + '</a>'
                          : htmlEncode(o) ) + '"</span>';
                break;
            default :
                return '<span class="value ' + type + '">' + o + '</span>';
        }
    }

    function bindEvents(tree) {
        tree.onclick = function(e) {
            e = e || window.event;
            var src = e.srcElement || e.target;
            if (src.className === 'operator') {
                if (src.parentNode.className == 'tree-close') {
                    src.parentNode.className = 'open';
                    src.innerHTML = '-';
                } else {
                    src.parentNode.className = 'tree-close';
                    src.innerHTML = '+';
                }
            }
            _resize();
        }
    }
}

var domConfig = document.getElementById('config');
var domToc = document.getElementById('toc');
domConfig.appendChild(new JsonTree(echartsConfig).getTree());
function _resize() {
    var viewHeight = document.documentElement.clientHeight;
    var scrollHeight = document.documentElement.scrollTop
                       || document.body.scrollTop;
    var offsetHeight = document.body.offsetHeight;
    var maxHeight;
    var footHole = offsetHeight - scrollHeight - viewHeight;
    if (footHole > 60) {
        // 未见footer，60 top、bottom， 40 per one
        maxHeight = viewHeight - 100 - 40 * 2;
    }
    else {
        // 见footer
        maxHeight = viewHeight - 200 - 40 * 2;
    }
    if (domConfig.scrollHeight > maxHeight) {
        domConfig.style.height = maxHeight + 'px';
    } else {
        domConfig.style.height = 'auto';
    }
    if (domToc.scrollHeight > maxHeight) {
        domToc.style.height = maxHeight + 'px';
    } else {
        domToc.style.height = 'auto';
    }
}
$(window).on('scroll', _resize);
$(window).on('resize', _resize);
_resize();
