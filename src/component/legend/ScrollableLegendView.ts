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

/**
 * Separate legend and scrollable legend to reduce package size.
 */

import * as zrUtil from 'zrender/src/core/util';
import * as graphic from '../../util/graphic';
import * as layoutUtil from '../../util/layout';
import LegendView from './LegendView';
import { LegendSelectorButtonOption } from './LegendModel';
import ExtensionAPI from '../../ExtensionAPI';
import GlobalModel from '../../model/Global';
import ScrollableLegendModel, {ScrollableLegendOption} from './ScrollableLegendModel';
import Displayable from 'zrender/src/graphic/Displayable';
import ComponentView from '../../view/Component';
import Element from 'zrender/src/Element';
import { ZRRectLike } from '../../util/types';

const Group = graphic.Group;

const WH = ['width', 'height'] as const;
const XY = ['x', 'y'] as const;

interface PageInfo {
    contentPosition: number[]
    pageCount: number
    pageIndex: number
    pagePrevDataIndex: number
    pageNextDataIndex: number
}

interface ItemInfo {
    /**
     * Start
     */
    s: number
    /**
     * End
     */
    e: number
    /**
     * Index
     */
    i: number
}

type LegendGroup = graphic.Group & {
    __rectSize: number
};

type LegendItemElement = Element & {
    __legendDataIndex: number
};

class ScrollableLegendView extends LegendView {

    static type = 'legend.scroll' as const;
    type = ScrollableLegendView.type;

    newlineDisabled = true;

    private _containerGroup: LegendGroup;
    private _controllerGroup: graphic.Group;

    private _currentIndex: number = 0;

    private _showController: boolean;

    init() {

        super.init();

        this.group.add(this._containerGroup = new Group() as LegendGroup);
        this._containerGroup.add(this.getContentGroup());

        this.group.add(this._controllerGroup = new Group());
    }

    /**
     * @override
     */
    resetInner() {
        super.resetInner();

        this._controllerGroup.removeAll();
        this._containerGroup.removeClipPath();
        this._containerGroup.__rectSize = null;
    }

    /**
     * @override
     */
    renderInner(
        itemAlign: ScrollableLegendOption['align'],
        legendModel: ScrollableLegendModel,
        ecModel: GlobalModel,
        api: ExtensionAPI,
        selector: LegendSelectorButtonOption[],
        orient: ScrollableLegendOption['orient'],
        selectorPosition: ScrollableLegendOption['selectorPosition']
    ) {
        let self = this;

        // Render content items.
        super.renderInner(itemAlign, legendModel, ecModel, api, selector, orient, selectorPosition);

        let controllerGroup = this._controllerGroup;

        // FIXME: support be 'auto' adapt to size number text length,
        // e.g., '3/12345' should not overlap with the control arrow button.
        const pageIconSize = legendModel.get('pageIconSize', true);
        let pageIconSizeArr: number[] = zrUtil.isArray(pageIconSize)
            ? pageIconSize : [pageIconSize, pageIconSize];

        createPageButton('pagePrev', 0);

        let pageTextStyleModel = legendModel.getModel('pageTextStyle');
        controllerGroup.add(new graphic.Text({
            name: 'pageText',
            style: {
                // Placeholder to calculate a proper layout.
                text: 'xx/xx',
                fill: pageTextStyleModel.getTextColor(),
                font: pageTextStyleModel.getFont(),
                verticalAlign: 'middle',
                align: 'center'
            },
            silent: true
        }));

        createPageButton('pageNext', 1);

        function createPageButton(name: string, iconIdx: number) {
            let pageDataIndexName = (name + 'DataIndex') as 'pagePrevDataIndex' | 'pageNextDataIndex';
            let icon = graphic.createIcon(
                legendModel.get('pageIcons', true)[legendModel.getOrient().name][iconIdx],
                {
                    // Buttons will be created in each render, so we do not need
                    // to worry about avoiding using legendModel kept in scope.
                    onclick: zrUtil.bind(
                        self._pageGo, self, pageDataIndexName, legendModel, api
                    )
                },
                {
                    x: -pageIconSizeArr[0] / 2,
                    y: -pageIconSizeArr[1] / 2,
                    width: pageIconSizeArr[0],
                    height: pageIconSizeArr[1]
                }
            );
            icon.name = name;
            controllerGroup.add(icon);
        }
    }

    /**
     * @override
     */
    layoutInner(
        legendModel: ScrollableLegendModel,
        itemAlign: ScrollableLegendOption['align'],
        maxSize: { width: number, height: number },
        isFirstRender: boolean,
        selector: LegendSelectorButtonOption[],
        selectorPosition: ScrollableLegendOption['selectorPosition']
    ) {
        let selectorGroup = this.getSelectorGroup();

        let orientIdx = legendModel.getOrient().index;
        let wh = WH[orientIdx];
        let xy = XY[orientIdx];
        let hw = WH[1 - orientIdx];
        let yx = XY[1 - orientIdx];

        selector && layoutUtil.box(
            // Buttons in selectorGroup always layout horizontally
            'horizontal',
            selectorGroup,
            legendModel.get('selectorItemGap', true)
        );

        let selectorButtonGap = legendModel.get('selectorButtonGap', true);
        let selectorRect = selectorGroup.getBoundingRect();
        let selectorPos = [-selectorRect.x, -selectorRect.y];

        let processMaxSize = zrUtil.clone(maxSize);
        selector && (processMaxSize[wh] = maxSize[wh] - selectorRect[wh] - selectorButtonGap);

        let mainRect = this._layoutContentAndController(legendModel, isFirstRender,
            processMaxSize, orientIdx, wh, hw, yx
        );

        if (selector) {
            if (selectorPosition === 'end') {
                selectorPos[orientIdx] += mainRect[wh] + selectorButtonGap;
            }
            else {
                let offset = selectorRect[wh] + selectorButtonGap;
                selectorPos[orientIdx] -= offset;
                mainRect[xy] -= offset;
            }
            mainRect[wh] += selectorRect[wh] + selectorButtonGap;

            selectorPos[1 - orientIdx] += mainRect[yx] + mainRect[hw] / 2 - selectorRect[hw] / 2;
            mainRect[hw] = Math.max(mainRect[hw], selectorRect[hw]);
            mainRect[yx] = Math.min(mainRect[yx], selectorRect[yx] + selectorPos[1 - orientIdx]);

            selectorGroup.attr('position', selectorPos);
        }

        return mainRect;
    }

    _layoutContentAndController(
        legendModel: ScrollableLegendModel,
        isFirstRender: boolean,
        maxSize: { width: number, height: number },
        orientIdx: 0 | 1,
        wh: 'width' | 'height',
        hw: 'width' | 'height',
        yx: 'x' | 'y'
    ) {
        let contentGroup = this.getContentGroup();
        let containerGroup = this._containerGroup;
        let controllerGroup = this._controllerGroup;

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

        let contentRect = contentGroup.getBoundingRect();
        let controllerRect = controllerGroup.getBoundingRect();
        let showController = this._showController = contentRect[wh] > maxSize[wh];

        let contentPos = [-contentRect.x, -contentRect.y];
        // Remain contentPos when scroll animation perfroming.
        // If first rendering, `contentGroup.position` is [0, 0], which
        // does not make sense and may cause unexepcted animation if adopted.
        if (!isFirstRender) {
            contentPos[orientIdx] = contentGroup.position[orientIdx];
        }

        // Layout container group based on 0.
        let containerPos = [0, 0];
        let controllerPos = [-controllerRect.x, -controllerRect.y];
        let pageButtonGap = zrUtil.retrieve2(
            legendModel.get('pageButtonGap', true), legendModel.get('itemGap', true)
        );

        // Place containerGroup and controllerGroup and contentGroup.
        if (showController) {
            let pageButtonPosition = legendModel.get('pageButtonPosition', true);
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
        let mainRect = {x: 0, y: 0} as ZRRectLike;

        // Consider content may be overflow (should be clipped).
        mainRect[wh] = showController ? maxSize[wh] : contentRect[wh];
        mainRect[hw] = Math.max(contentRect[hw], controllerRect[hw]);

        // `containerRect[yx] + containerPos[1 - orientIdx]` is 0.
        mainRect[yx] = Math.min(0, controllerRect[yx] + controllerPos[1 - orientIdx]);

        containerGroup.__rectSize = maxSize[wh];
        if (showController) {
            let clipShape = {x: 0, y: 0} as graphic.Rect['shape'];
            clipShape[wh] = Math.max(maxSize[wh] - controllerRect[wh] - pageButtonGap, 0);
            clipShape[hw] = mainRect[hw];
            containerGroup.setClipPath(new graphic.Rect({shape: clipShape}));
            // Consider content may be larger than container, container rect
            // can not be obtained from `containerGroup.getBoundingRect()`.
            containerGroup.__rectSize = clipShape[wh];
        }
        else {
            // Do not remove or ignore controller. Keep them set as placeholders.
            controllerGroup.eachChild(function (child: Displayable) {
                child.attr({
                    invisible: true,
                    silent: true
                });
            });
        }

        // Content translate animation.
        let pageInfo = this._getPageInfo(legendModel);
        pageInfo.pageIndex != null && graphic.updateProps(
            contentGroup,
            {position: pageInfo.contentPosition},
            // When switch from "show controller" to "not show controller", view should be
            // updated immediately without animation, otherwise causes weird effect.
            showController ? legendModel : null
        );

        this._updatePageInfoView(legendModel, pageInfo);

        return mainRect;
    }

    _pageGo(
        to: 'pagePrevDataIndex' | 'pageNextDataIndex',
        legendModel: ScrollableLegendModel,
        api: ExtensionAPI
    ) {
        let scrollDataIndex = this._getPageInfo(legendModel)[to];

        scrollDataIndex != null && api.dispatchAction({
            type: 'legendScroll',
            scrollDataIndex: scrollDataIndex,
            legendId: legendModel.id
        });
    }

    _updatePageInfoView(
        legendModel: ScrollableLegendModel,
        pageInfo: PageInfo
    ) {
        let controllerGroup = this._controllerGroup;

        zrUtil.each(['pagePrev', 'pageNext'], function (name) {
            const key = (name + 'DataIndex') as'pagePrevDataIndex' | 'pageNextDataIndex';
            let canJump = pageInfo[key] != null;
            let icon = controllerGroup.childOfName(name) as graphic.Path;
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

        let pageText = controllerGroup.childOfName('pageText') as graphic.Text;
        let pageFormatter = legendModel.get('pageFormatter');
        let pageIndex = pageInfo.pageIndex;
        let current = pageIndex != null ? pageIndex + 1 : 0;
        let total = pageInfo.pageCount;

        pageText && pageFormatter && pageText.setStyle(
            'text',
            zrUtil.isString(pageFormatter)
                ? pageFormatter.replace('{current}', current == null ? '' : current + '')
                    .replace('{total}', total == null ? '' : total + '')
                : pageFormatter({current: current, total: total})
        );
    }

    /**
     *  contentPosition: Array.<number>, null when data item not found.
     *  pageIndex: number, null when data item not found.
     *  pageCount: number, always be a number, can be 0.
     *  pagePrevDataIndex: number, null when no previous page.
     *  pageNextDataIndex: number, null when no next page.
     * }
     */
    _getPageInfo(legendModel: ScrollableLegendModel): PageInfo {
        let scrollDataIndex = legendModel.get('scrollDataIndex', true);
        let contentGroup = this.getContentGroup();
        let containerRectSize = this._containerGroup.__rectSize;
        let orientIdx = legendModel.getOrient().index;
        let wh = WH[orientIdx];
        let xy = XY[orientIdx];

        let targetItemIndex = this._findTargetItemIndex(scrollDataIndex);
        let children = contentGroup.children();
        let targetItem = children[targetItemIndex];
        let itemCount = children.length;
        let pCount = !itemCount ? 0 : 1;

        let result: PageInfo = {
            contentPosition: zrUtil.slice(contentGroup.position),
            pageCount: pCount,
            pageIndex: pCount - 1,
            pagePrevDataIndex: null,
            pageNextDataIndex: null
        };

        if (!targetItem) {
            return result;
        }

        let targetItemInfo = getItemInfo(targetItem);
        result.contentPosition[orientIdx] = -targetItemInfo.s;

        // Strategy:
        // (1) Always align based on the left/top most item.
        // (2) It is user-friendly that the last item shown in the
        // current window is shown at the begining of next window.
        // Otherwise if half of the last item is cut by the window,
        // it will have no chance to display entirely.
        // (3) Consider that item size probably be different, we
        // have calculate pageIndex by size rather than item index,
        // and we can not get page index directly by division.
        // (4) The window is to narrow to contain more than
        // one item, we should make sure that the page can be fliped.

        for (let i = targetItemIndex + 1,
            winStartItemInfo = targetItemInfo,
            winEndItemInfo = targetItemInfo,
            currItemInfo = null;
            i <= itemCount;
            ++i
        ) {
            currItemInfo = getItemInfo(children[i]);
            if (
                // Half of the last item is out of the window.
                (!currItemInfo && winEndItemInfo.e > winStartItemInfo.s + containerRectSize)
                // If the current item does not intersect with the window, the new page
                // can be started at the current item or the last item.
                || (currItemInfo && !intersect(currItemInfo, winStartItemInfo.s))
            ) {
                if (winEndItemInfo.i > winStartItemInfo.i) {
                    winStartItemInfo = winEndItemInfo;
                }
                else { // e.g., when page size is smaller than item size.
                    winStartItemInfo = currItemInfo;
                }
                if (winStartItemInfo) {
                    if (result.pageNextDataIndex == null) {
                        result.pageNextDataIndex = winStartItemInfo.i;
                    }
                    ++result.pageCount;
                }
            }
            winEndItemInfo = currItemInfo;
        }

        for (let i = targetItemIndex - 1,
            winStartItemInfo = targetItemInfo,
            winEndItemInfo = targetItemInfo,
            currItemInfo = null;
            i >= -1;
            --i
        ) {
            currItemInfo = getItemInfo(children[i]);
            if (
                // If the the end item does not intersect with the window started
                // from the current item, a page can be settled.
                (!currItemInfo || !intersect(winEndItemInfo, currItemInfo.s))
                // e.g., when page size is smaller than item size.
                && winStartItemInfo.i < winEndItemInfo.i
            ) {
                winEndItemInfo = winStartItemInfo;
                if (result.pagePrevDataIndex == null) {
                    result.pagePrevDataIndex = winStartItemInfo.i;
                }
                ++result.pageCount;
                ++result.pageIndex;
            }
            winStartItemInfo = currItemInfo;
        }

        return result;

        function getItemInfo(el: Element): ItemInfo {
            if (el) {
                let itemRect = el.getBoundingRect();
                let start = itemRect[xy] + el.position[orientIdx];
                return {
                    s: start,
                    e: start + itemRect[wh],
                    i: (el as LegendItemElement).__legendDataIndex
                };
            }
        }

        function intersect(itemInfo: ItemInfo, winStart: number) {
            return itemInfo.e >= winStart && itemInfo.s <= winStart + containerRectSize;
        }
    }

    _findTargetItemIndex(targetDataIndex: number) {
        if (!this._showController) {
            return 0;
        }

        let index;
        let contentGroup = this.getContentGroup();
        let defaultIndex: number;

        contentGroup.eachChild(function (child, idx) {
            let legendDataIdx = (child as LegendItemElement).__legendDataIndex;
            // FIXME
            // If the given targetDataIndex (from model) is illegal,
            // we use defualtIndex. But the index on the legend model and
            // action payload is still illegal. That case will not be
            // changed until some scenario requires.
            if (defaultIndex == null && legendDataIdx != null) {
                defaultIndex = idx;
            }
            if (legendDataIdx === targetDataIndex) {
                index = idx;
            }
        });

        return index != null ? index : defaultIndex;
    }
}

ComponentView.registerClass(ScrollableLegendView);

export default ScrollableLegendView;
