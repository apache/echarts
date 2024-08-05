import { CustomSeriesRenderItem } from './CustomSeries';

const customRenderers: {[type: string]: CustomSeriesRenderItem} = {};

class CustomSeriesManager {

    static register = function (type: string, creator: CustomSeriesRenderItem): void {
        customRenderers[type] = creator;
    };

    static get = function (type: string): CustomSeriesRenderItem {
        return customRenderers[type];
    }

}

export default CustomSeriesManager;
