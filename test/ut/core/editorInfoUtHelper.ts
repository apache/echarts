import { createChart } from './utHelper';
import type { EChartsType } from '../../../src/echarts';
import type { ECBasicOption, EditorInfo } from '../../../src/util/types';
import Displayable from 'zrender/src/graphic/Displayable';
import Group from 'zrender/src/graphic/Group';
export const isHaveEditorInfo =
    function (
        graphic: Displayable | Group, findParent = false, editorInfo: EditorInfo
    ): boolean {
        const { component, element, componentIndex, subType, dataIndex } = editorInfo;
        if (graphic?.__editorInfo?.component === component && graphic?.__editorInfo?.element === element) {
            if (componentIndex !== undefined && componentIndex !== graphic?.__editorInfo?.componentIndex) {
                return false;
            }
            if (subType !== undefined && subType !== graphic?.__editorInfo?.subType) {
                return false;
            }
            if (dataIndex !== undefined && dataIndex !== graphic?.__editorInfo?.dataIndex) {
                return false;
            }
            return true;
        }
        if (findParent && graphic.parent) {
            return isHaveEditorInfo(graphic.parent, true, editorInfo);
        }
        else {
            return false;
        }
    };

export interface ChartWaitTest {
    describeText: string;
    charts: {
        options: ECBasicOption,
        cases: {
            describeText: string,
            editorInfo: EditorInfo,
        }[]
    }[]
}

export const isChartElementHaveEditorInfo = function (chartsWaitTest: ChartWaitTest[]) {
    for (let i = 0; i < chartsWaitTest.length; i++) {
        const { describeText, charts } = chartsWaitTest[i];
        describe(describeText, function () {
            const chartsModel = [] as EChartsType[];
            const chartsGraphic = [] as Displayable[][];
            beforeAll(function () {
                for (let i = 0; i < charts.length; i++) {
                    const chartModel = createChart();
                    chartModel.setOption(charts[i].options);
                    chartsModel.push(chartModel);
                    // @ts-ignore
                    chartsGraphic.push(chartModel.getZr().storage._displayList);
                }
            });
            afterAll(function () {
                for (let i = 0; i < chartsModel.length; i++) {
                    chartsModel[i].dispose();
                }
            });
            for (let i = 0; i < charts.length; i++) {
                const cases = charts[i].cases;
                cases.forEach(({ describeText, editorInfo }) => {
                    it(describeText, function () {
                        const haveEditorInfo = chartsGraphic[i].some((graphic) => {
                            return isHaveEditorInfo(graphic, true, editorInfo);
                        });
                        expect(haveEditorInfo === true).toEqual(true);
                    });
                });
            }
        });
    }
};
