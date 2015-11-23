/**
 * @module echarts/component/tooltip/TooltipContent
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var zrColor = require('zrender/tool/color');
    var formatUtil = require('../../util/format');
    var each = zrUtil.each;
    var toCamelCase = formatUtil.toCamelCase;

    var vendors = ['', '-webkit-', '-moz-', '-o-'];

    var gCssText = 'position:absolute;display:block;border-style:solid;white-space:nowrap;';

    /**
     * @param {number} duration
     * @return {string}
     * @inner
     */
    function assembleTransition(duration) {
        var transitionText = 'left ' + duration + 's,'
                            + 'top ' + duration + 's';
        return zrUtil.map(vendors, function (vendorPrefix) {
            return vendorPrefix + 'transition:' + transitionText;
        }).join(';');
    }

    /**
     * @param {Object} textStyle
     * @return {string}
     * @inner
     */
    function assembleFont(textStyleModel) {
        var cssText = [];

        var fontSize = textStyleModel.get('fontSize');
        var color = textStyleModel.get('color');

        color && cssText.push('color:' + color);

        cssText.push('font:' + textStyleModel.getFont());

        fontSize &&
            cssText.push('line-height:' + Math.round(fontSize * 3 / 2) + 'px');

        each(['decoration', 'align'], function (name) {
            var val = textStyleModel.get(name);
            val && cssText.push('text-' + name + ':' + val);
        });

        return cssText.join(';');
    }

    /**
     * @param {Object} tooltipModel
     * @return {string}
     * @inner
     */
    function assembleCssText(tooltipModel) {

        tooltipModel = tooltipModel;

        var cssText = [];

        var transitionDuration = tooltipModel.get('transitionDuration');
        var backgroundColor = tooltipModel.get('backgroundColor');
        var textStyleModel = tooltipModel.getModel('textStyle');
        var padding = tooltipModel.get('padding');

        // Animation transition
        transitionDuration &&
            cssText.push(assembleTransition(transitionDuration));

        if (backgroundColor) {
            // for ie
            cssText.push(
                'background-Color:' + zrColor.toHex(backgroundColor)
            );
            cssText.push('filter:alpha(opacity=70)');
            cssText.push('background-Color:' + backgroundColor);
        }

        // Border style
        each(['width', 'color', 'radius'], function (name) {
            var borderName = 'border-' + name;
            var camelCase = toCamelCase(borderName);
            var val = tooltipModel.get(camelCase);
            val != null &&
                cssText.push(borderName + ':' + val + (name === 'color' ? '' : 'px'));
        });

        // Text style
        cssText.push(assembleFont(textStyleModel));

        // Padding
        if (padding != null) {
            cssText.push('padding:' + formatUtil.normalizeCssArray(padding).join('px ') + 'px');
        }

        return cssText.join(';') + ';';
    }

    /**
     * @alias module:echarts/component/tooltip/TooltipContent
     * @constructor
     */
    function TooltipContent(container, api) {
        var el = document.createElement('div');

        this.el = el;

        el.style.left = api.getWidth() / 2 + 'px';
        el.style.top = api.getHeight() / 2 + 'px';

        container.appendChild(el);

        this._container = container;

        this._show = false;
    }

    TooltipContent.prototype = {

        constructor: TooltipContent,

        /**
         * Update when tooltip is rendered
         */
        update: function () {
            var container = this._container;
            var stl = container.currentStyle
                || document.defaultView.getComputedStyle(container);
            var domStyle = container.style;
            if (domStyle.position !== 'absolute' && stl.position !== 'absolute') {
                domStyle.position = 'relative';
            }
            // Hide the tooltip
            // PENDING
            this.hide();
        },

        show: function (tooltipModel) {
            clearTimeout(this._hideTimeout);

            this.el.style.cssText = gCssText + assembleCssText(tooltipModel);

            this._show = true;
        },

        setContent: function (content) {
            var el = this.el;
            el.innerHTML = content;
            el.style.display = content ? 'block' : 'none';
        },

        moveTo: function (x, y) {
            var style = this.el.style;
            style.left = x + 'px';
            style.top = y + 'px';
        },

        hide: function () {
            if (this._show) {
                this.el.style.display = 'none';
            }

            this._show = false;
        },

        // showLater: function ()

        hideLater: function (time) {
            if (time) {
                this._hideTimeout = setTimeout(zrUtil.bind(this.hide, this), time);
            }
        },

        isShow: function () {
            return this._show;
        }
    };

    return TooltipContent;
});