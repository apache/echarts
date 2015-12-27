/**
 * Simple draggable tool, just for demo or testing.
 * Use jquery.
 */
(function (global) {

    var BORDER_WIDTH = 3;

    global.draggable = {

        init: function (mainEl, chart) {

            var mainEl = $(mainEl);
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
                'border-color': '#777',
                'border-width': BORDER_WIDTH + 'px',
                'padding': 0,
                'margin': 0
            });

            mainEl.parent().append(controlEl);

            var controlSize = controlEl[0].offsetWidth;

            var mainElWidth = mainEl[0].offsetWidth - 2 * BORDER_WIDTH;
            var mainElHeight = mainEl[0].offsetHeight - 2 * BORDER_WIDTH;
            controlEl.css({
                left: mainEl[0].offsetLeft + mainElWidth - controlSize / 2,
                top: mainEl[0].offsetTop + mainElHeight - controlSize / 2
            });

            label.text(mainElWidth + ' x ' + mainElHeight);

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

            function resize(x, y) {
                controlEl.css({left: x - controlSize / 2, top: y - controlSize / 2});
                var mainElWidth = x - mainEl[0].offsetLeft;
                var mainElHeight = y - mainEl[0].offsetTop;

                mainEl.css({width: mainElWidth, height: mainElHeight});

                label.text(mainElWidth + ' x ' + mainElHeight)

                if (chart) {
                    chart.resize();
                }
            }
        }
    };

})(window);