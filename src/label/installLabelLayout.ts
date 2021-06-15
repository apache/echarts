import { EChartsExtensionInstallRegisters } from '../extension';
import { makeInner } from '../util/model';
import LabelManager from './LabelManager';
import ExtensionAPI from '../core/ExtensionAPI';

const getLabelManager = makeInner<{ labelManager: LabelManager }, ExtensionAPI>();
export function installLabelLayout(registers: EChartsExtensionInstallRegisters) {
    registers.registerUpdateLifecycle('series:beforeupdate', (ecModel, api, params) => {
        // TODO api provide an namespace that can save stuff per instance
        let labelManager = getLabelManager(api).labelManager;
        if (!labelManager) {
            labelManager = getLabelManager(api).labelManager = new LabelManager();
        }
        labelManager.clearLabels();
    });

    registers.registerUpdateLifecycle('series:layoutlabels', (ecModel, api, params) => {
        const labelManager = getLabelManager(api).labelManager;

        params.updatedSeries.forEach(series => {
            labelManager.addLabelsOfSeries(api.getViewOfSeriesModel(series));
        });
        labelManager.updateLayoutConfig(api);
        labelManager.layout(api);
        labelManager.processLabelsOverall();
    });
}