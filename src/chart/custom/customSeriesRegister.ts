import type { CustomSeriesRenderItem } from './CustomSeries';

const customRenderers: {[type: string]: CustomSeriesRenderItem} = {};

export function registerCustomSeries(type: string, renderItem: CustomSeriesRenderItem): void {
    customRenderers[type] = renderItem;
}

export function getCustomSeries(type: string): CustomSeriesRenderItem {
    return customRenderers[type];
}
