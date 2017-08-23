/**
 * Separate legend and scrollable legend to reduce package size.
 */
define(function (require) {

    var zrUtil = require('zrender/core/util');
    var graphic = require('../../util/graphic');
    var layoutUtil = require('../../util/layout');
    var LegendView = require('./LegendView');

    var Group = graphic.Group;

    var WH = ['width', 'height'];
    var XY = ['x', 'y'];

    var ScrollableLegendView = LegendView.extend({

        type: 'legend.scroll',

        newlineDisabled: true,

        init: function () {

            ScrollableLegendView.superCall(this, 'init');

            /**
             * @private
             * @type {number} For `scroll`.
             */
            this._currentIndex = 0;

            /**
             * @private
             * @type {module:zrender/container/Group}
             */
            this.group.add(this._containerGroup = new Group());
            this._containerGroup.add(this.getContentGroup());

            /**
             * @private
             * @type {module:zrender/container/Group}
             */
            this.group.add(this._controllerGroup = new Group());
        },

        /**
         * @override
         */
        resetInner: function () {
            ScrollableLegendView.superCall(this, 'resetInner');

            this._controllerGroup.removeAll();
            this._containerGroup.removeClipPath();
            this._containerGroup.__rectSize = null;
        },

        /**
         * @override
         */
        renderInner: function (itemAlign, legendModel, ecModel, api) {
            var me = this;

            // Render content items.
            ScrollableLegendView.superCall(this, 'renderInner', itemAlign, legendModel, ecModel, api);

            var controllerGroup = this._controllerGroup;

            var pageIconSize = legendModel.get('pageIconSize', true);
            if (!zrUtil.isArray(pageIconSize)) {
                pageIconSize = [pageIconSize, pageIconSize];
            }

            createPageButton('pagePrev', 0);

            var pageTextStyleModel = legendModel.getModel('pageTextStyle');
            controllerGroup.add(new graphic.Text({
                name: 'pageText',
                style: {
                    textFill: pageTextStyleModel.getTextColor(),
                    font: pageTextStyleModel.getFont(),
                    textVerticalAlign: 'middle',
                    textAlign: 'center'
                },
                silent: true
            }));

            createPageButton('pageNext', 1);

            function createPageButton(name, iconIdx) {
                var pageDataIndexName = name + 'DataIndex';
                var icon = graphic.createIcon(
                    legendModel.get('pageIcons', true)[legendModel.getOrient().name][iconIdx],
                    {
                        // Buttons will be created in each render, so we do not need
                        // to worry about avoiding using legendModel kept in scope.
                        onclick: zrUtil.bind(
                            me._pageGo, me, pageDataIndexName, legendModel, api
                        )
                    },
                    {
                        x: -pageIconSize[0] / 2,
                        y: -pageIconSize[1] / 2,
                        width: pageIconSize[0],
                        height: pageIconSize[1]
                    }
                );
                icon.name = name;
                controllerGroup.add(icon);
            }
        },

        /**
         * @override
         */
        layoutInner: function (legendModel, itemAlign, maxSize) {
            var contentGroup = this.getContentGroup();
            var containerGroup = this._containerGroup;
            var controllerGroup = this._controllerGroup;

            var orientIdx = legendModel.getOrient().index;
            var wh = WH[orientIdx];
            var hw = WH[1 - orientIdx];
            var yx = XY[1 - orientIdx];

            // Place items in contentGroup.
            layoutUtil.box(
                legendModel.get('orient'),
                contentGroup,
                legendModel.get('itemGap'),
                !orientIdx ? null : maxSize.width,
                orientIdx ? null : maxSize.height
            );

            layoutUtil.box(
                // Buttons in controller are layout always horizontally.
                'horizontal',
                controllerGroup,
                legendModel.get('pageButtonItemGap', true)
            );

            var contentRect = contentGroup.getBoundingRect();
            var controllerRect = controllerGroup.getBoundingRect();
            var showController = contentRect[wh] > maxSize[wh];

            var contentPos = [-contentRect.x, -contentRect.y];
            // Remain contentPos when scroll animation perfroming.
            contentPos[orientIdx] = contentGroup.position[orientIdx];

            // Layout container group based on 0.
            var containerPos = [0, 0];
            var controllerPos = [-controllerRect.x, -controllerRect.y];
            var pageButtonGap = zrUtil.retrieve2(
                legendModel.get('pageButtonGap', true), legendModel.get('itemGap', true)
            );

            // Place containerGroup and controllerGroup and contentGroup.
            if (showController) {
                var pageButtonPosition = legendModel.get('pageButtonPosition', true);
                // controller is on the right / bottom.
                if (pageButtonPosition === 'end') {
                    controllerPos[orientIdx] += maxSize[wh] - controllerRect[wh];
                }
                // controller is on the left / top.
                else {
                    containerPos[orientIdx] += controllerRect[wh] + pageButtonGap;
                }
            }

            // Always align controller to content as 'middle'.
            controllerPos[1 - orientIdx] += contentRect[hw] / 2 - controllerRect[hw] / 2;

            contentGroup.attr('position', contentPos);
            containerGroup.attr('position', containerPos);
            controllerGroup.attr('position', controllerPos);

            // Calculate `mainRect` and set `clipPath`.
            // mainRect should not be calculated by `this.group.getBoundingRect()`
            // for sake of the overflow.
            var mainRect = this.group.getBoundingRect();
            var mainRect = {x: 0, y: 0};
            // Consider content may be overflow (should be clipped).
            mainRect[wh] = showController ? maxSize[wh] : contentRect[wh];
            mainRect[hw] = Math.max(contentRect[hw], controllerRect[hw]);
            // `containerRect[yx] + containerPos[1 - orientIdx]` is 0.
            mainRect[yx] = Math.min(0, controllerRect[yx] + controllerPos[1 - orientIdx]);

            containerGroup.__rectSize = maxSize[wh];
            if (showController) {
                var clipShape = {x: 0, y: 0};
                clipShape[wh] = Math.max(maxSize[wh] - controllerRect[wh] - pageButtonGap, 0);
                clipShape[hw] = mainRect[hw];
                containerGroup.setClipPath(new graphic.Rect({shape: clipShape}));
                // Consider content may be larger than container, container rect
                // can not be obtained from `containerGroup.getBoundingRect()`.
                containerGroup.__rectSize = clipShape[wh];
            }
            else {
                // Do not remove or ignore controller. Keep them set as place holders.
                controllerGroup.eachChild(function (child) {
                    child.attr({invisible: true, silent: true});
                });
            }

            // Content translate animation.
            var pageInfo = this._getPageInfo(legendModel);
            pageInfo.pageIndex != null && graphic.updateProps(
                contentGroup, {position: pageInfo.contentPosition}, legendModel
            );

            this._updatePageInfoView(legendModel, pageInfo);

            return mainRect;
        },

        _pageGo: function (to, legendModel, api) {
            var scrollDataIndex = this._getPageInfo(legendModel)[to];

            scrollDataIndex != null && api.dispatchAction({
                type: 'legendScroll',
                scrollDataIndex: scrollDataIndex,
                legendId: legendModel.id
            });
        },

        _updatePageInfoView: function (legendModel, pageInfo) {
            var controllerGroup = this._controllerGroup;

            zrUtil.each(['pagePrev', 'pageNext'], function (name) {
                var canJump = pageInfo[name + 'DataIndex'] != null;
                var icon = controllerGroup.childOfName(name);
                if (icon) {
                    icon.setStyle(
                        'fill',
                        canJump
                            ? legendModel.get('pageIconColor', true)
                            : legendModel.get('pageIconInactiveColor', true)
                    );
                    icon.cursor = canJump ? 'pointer' : 'default';
                }
            });

            var pageText = controllerGroup.childOfName('pageText');
            var pageFormatter = legendModel.get('pageFormatter');
            var pageIndex = pageInfo.pageIndex;
            var current = pageIndex != null ? pageIndex + 1 : 0;
            var total = pageInfo.pageCount;

            pageText && pageFormatter && pageText.setStyle(
                'text',
                zrUtil.isString(pageFormatter)
                    ? pageFormatter.replace('{current}', current).replace('{total}', total)
                    : pageFormatter({current: current, total: total})
            );
        },

        /**
         * @param {module:echarts/model/Model} legendModel
         * @return {Object} {
         *  contentPosition: Array.<number>, null when data item not found.
         *  pageIndex: number, null when data item not found.
         *  pageCount: number, always be a number, can be 0.
         *  pagePrevDataIndex: number, null when no next page.
         *  pageNextDataIndex: number, null when no previous page.
         * }
         */
        _getPageInfo: function (legendModel) {
            // Align left or top by the current dataIndex.
            var currDataIndex = legendModel.get('scrollDataIndex', true);
            var contentGroup = this.getContentGroup();
            var contentRect = contentGroup.getBoundingRect();
            var containerRectSize = this._containerGroup.__rectSize;

            var orientIdx = legendModel.getOrient().index;
            var wh = WH[orientIdx];
            var hw = WH[1 - orientIdx];
            var xy = XY[orientIdx];
            var contentPos = contentGroup.position.slice();

            var pageIndex;
            var pagePrevDataIndex;
            var pageNextDataIndex;

            var targetItemGroup;
            contentGroup.eachChild(function (child) {
                if (child.__legendDataIndex === currDataIndex) {
                    targetItemGroup = child;
                }
            });

            var pageCount = containerRectSize ? Math.ceil(contentRect[wh] / containerRectSize) : 0;

            if (targetItemGroup) {
                var itemRect = targetItemGroup.getBoundingRect();
                var itemLoc = targetItemGroup.position[orientIdx] + itemRect[xy];
                contentPos[orientIdx] = -itemLoc - contentRect[xy];
                pageIndex = Math.floor(
                    pageCount * (itemLoc + itemRect[xy] + containerRectSize / 2) / contentRect[wh]
                );
                pageIndex = (contentRect[wh] && pageCount)
                    ? Math.max(0, Math.min(pageCount - 1, pageIndex))
                    : -1;

                var winRect = {x: 0, y: 0};
                winRect[wh] = containerRectSize;
                winRect[hw] = contentRect[hw];
                winRect[xy] = -contentPos[orientIdx] - contentRect[xy];

                var startIdx;
                var children = contentGroup.children();

                contentGroup.eachChild(function (child, index) {
                    var itemRect = getItemRect(child);

                    if (itemRect.intersect(winRect)) {
                        startIdx == null && (startIdx = index);
                        // It is user-friendly that the last item shown in the
                        // current window is shown at the begining of next window.
                        pageNextDataIndex = child.__legendDataIndex;
                    }

                    // If the last item is shown entirely, no next page.
                    if (index === children.length - 1
                        && itemRect[xy] + itemRect[wh] <= winRect[xy] + winRect[wh]
                    ) {
                        pageNextDataIndex = null;
                    }
                });

                // Always align based on the left/top most item, so the left/top most
                // item in the previous window is needed to be found here.
                if (startIdx != null) {
                    var startItem = children[startIdx];
                    var startRect = getItemRect(startItem);
                    winRect[xy] = startRect[xy] + startRect[wh] - winRect[wh];

                    // If the first item is shown entirely, no previous page.
                    if (startIdx <= 0 && startRect[xy] >= winRect[xy]) {
                        pagePrevDataIndex = null;
                    }
                    else {
                        while (startIdx > 0 && getItemRect(children[startIdx - 1]).intersect(winRect)) {
                            startIdx--;
                        }
                        pagePrevDataIndex = children[startIdx].__legendDataIndex;
                    }
                }
            }

            return {
                contentPosition: contentPos,
                pageIndex: pageIndex,
                pageCount: pageCount,
                pagePrevDataIndex: pagePrevDataIndex,
                pageNextDataIndex: pageNextDataIndex
            };

            function getItemRect(el) {
                var itemRect = el.getBoundingRect().clone();
                itemRect[xy] += el.position[orientIdx];
                return itemRect;
            }
        }

    });

    return ScrollableLegendView;

});