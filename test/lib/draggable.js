/**
 * Simple draggable tool, just for demo or testing.
 * Use jquery.
 */
(function (global) {

    var BORDER_WIDTH = 4;
    var $ = global.jQuery;

    global.draggable = {

        /**
         * @param {HTMLElement} mainEl
         * @param {module:echarts/echarts~EChart} chart
         * @param {Object} [opt] {width: ..., height: ...}
         * @param {number} [opt.width] If not specified, use mainEl current width.
         * @param {number} [opt.height] If not specified, use mainEl current height.
         * @param {boolean} [opt.lockX=false]
         * @param {boolean} [opt.lockY=false]
         * @param {number} [opt.throttle=false]
         * @param {boolean} [opt.addPlaceholder=false]
         * @return {type}  description
         */
        init: function (mainEl, chart, opt) {
            opt = opt || {};

            var chartResize = chart ? $.proxy(chart.resize, chart) : function () {};
            if (opt.throttle) {
                chartResize = throttle(chartResize, opt.throttle, true, false);
            }

            var mainEl = $(mainEl);
            var id = mainEl.attr('data-draggable-id');

            if (opt.addPlaceholder) {
                var width = mainEl.outerWidth();
                var height = mainEl.outerHeight();
                $('<div></div>').css({
                    width: width,
                    height: height,
                    margin: 0,
                    padding: 0,
                    visibility: 'hidden'
                }).insertAfter(mainEl);
            }

            if (id == null) {
                id = +Math.random();
                mainEl.attr('data-draggable-id', id);
            }
            else {
                $('.draggable-control[data-draggable-id=' + id + ']').remove();
            }

            var controlEl = $(
                '<div class="draggable-control">DRAG<span class="draggable-label"></span></div>'
            );

            controlEl.css({
                'position': 'absolute',
                'border-radius': '30px',
                'width': '60px',
                'height': '60px',
                'line-height': '60px',
                'text-align': 'center',
                'background': '#333',
                'color': '#fff',
                'cursor': 'pointer',
                'font-size': '18px',
                'box-shadow': '0 0 5px #333',
                '-webkit-user-select': 'none',
                'user-select': 'none'
            });

            var label = controlEl.find('.draggable-label');

            label.css({
                'display': 'block',
                'position': 'absolute',
                'color': '#000',
                'font-size': '12px',
                'text-align': 'center',
                'left': 0,
                'top': '65px',
                'width': '60px',
                'line-height': 1
            });

            mainEl.css({
                'position': 'absolute',
                'left': mainEl[0].offsetLeft + 'px',
                'top': mainEl[0].offsetTop + 'px',
                'width': mainEl[0].offsetWidth + 'px',
                'height': mainEl[0].offsetHeight + 'px',
                'border-style': 'solid',
                'border-color': '#ddd',
                'border-width': BORDER_WIDTH + 'px',
                'padding': 0,
                'margin': 0
            });

            mainEl.parent().append(controlEl);

            var controlSize = controlEl[0].offsetWidth;

            var boxSizing = mainEl.css('box-sizing');

            var borderBoxBroder = boxSizing === 'border-box' ? 2 * BORDER_WIDTH : 0;
            var mainContentWidth = opt.width || (mainEl.width() + borderBoxBroder);
            var mainContentHeight = opt.height || (mainEl.height() + borderBoxBroder);

            var mainOffset = mainEl.offset();
            resize(
                mainOffset.left + mainContentWidth + BORDER_WIDTH,
                mainOffset.top + mainContentHeight + BORDER_WIDTH,
                true
            );

            var dragging = false;

            controlEl.on('mousedown', function () {
                dragging = true;
            });

            $(document).on('mousemove', function (e) {
                if (dragging) {
                    resize(e.pageX, e.pageY);
                }
            });

            $(document).on('mouseup', function () {
                dragging = false;
            });



            function resize(x, y, isInit) {
                var mainOffset = mainEl.offset();
                var mainPosition = mainEl.position();
                var mainContentWidth = x - mainOffset.left - BORDER_WIDTH;
                var mainContentHeight = y - mainOffset.top - BORDER_WIDTH;

                if (isInit || !opt.lockX) {
                    controlEl.css(
                        'left',
                        (mainPosition.left + mainContentWidth + BORDER_WIDTH - controlSize / 2) + 'px'
                    );
                    mainEl.css(
                        'width',
                        (mainContentWidth + borderBoxBroder) + 'px'
                    );
                }

                if (isInit || !opt.lockY) {
                    controlEl.css(
                        'top',
                        (mainPosition.top + mainContentHeight + BORDER_WIDTH - controlSize / 2) + 'px'
                    );
                    mainEl.css(
                        'height',
                        (mainContentHeight + borderBoxBroder) + 'px'
                    );
                }

                label.text(Math.round(mainContentWidth) + ' x ' + Math.round(mainContentHeight));

                chartResize();
            }
        }
    };

    function throttle(fn, delay, trailing, debounce) {

        var currCall = (new Date()).getTime();
        var lastCall = 0;
        var lastExec = 0;
        var timer = null;
        var diff;
        var scope;
        var args;
        var isSingle = typeof fn === 'function';
        delay = delay || 0;

        if (isSingle) {
            return createCallback();
        }
        else {
            var ret = [];
            for (var i = 0; i < fn.length; i++) {
                ret[i] = createCallback(i);
            }
            return ret;
        }

        function createCallback(index) {

            function exec() {
                lastExec = (new Date()).getTime();
                timer = null;
                (isSingle ? fn : fn[index]).apply(scope, args || []);
            }

            var cb = function () {
                currCall = (new Date()).getTime();
                scope = this;
                args = arguments;
                diff = currCall - (debounce ? lastCall : lastExec) - delay;

                clearTimeout(timer);

                if (debounce) {
                    if (trailing) {
                        timer = setTimeout(exec, delay);
                    }
                    else if (diff >= 0) {
                        exec();
                    }
                }
                else {
                    if (diff >= 0) {
                        exec();
                    }
                    else if (trailing) {
                        timer = setTimeout(exec, -diff);
                    }
                }

                lastCall = currCall;
            };

            /**
             * Clear throttle.
             * @public
             */
            cb.clear = function () {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            };

            return cb;
        }
    }

})(window);