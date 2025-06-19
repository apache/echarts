
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * 'License'); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createChart } from '../../../core/utHelper';
import { EChartsType, registerMap } from '../../../../../src/echarts';
import { isHaveEditorInfo } from '../../../core/editorInfoUtHelper';
import Displayable from 'zrender/src/graphic/Displayable';
/* eslint-disable max-len */
const svg: string = `
<svg xmlns:x="http://ns.adobe.com/Extensibility/1.0/" xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/" xmlns:graph="http://ns.adobe.com/Graphs/1.0/" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:a="http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/" i:vieworigin="108.0039 634.4854" i:rulerorigin="0 0" i:pagebounds="0 792 612 0" width="382.622" height="461.325" viewBox="0 0 382.622 461.325" overflow="visible" enable-background="new 0 0 382.622 461.325" xml:space="preserve">
	<switch>
		<g i:extraneous="self">
			<g id="Layer_1" i:layer="yes" i:dimmedpercent="50" i:rgbtrio="#4F008000FFFF">
				<g>
					<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#D8CEBF" d="M181.702,5.555       c-6.823,4.188-12.562,14.267-13.337,23.263c-1.24,10.389,4.342,6.823-0.465,15.817c-3.566,9.615-10.08,15.197-3.876,17.214       c3.876,0.774,3.721,3.101,3.721,3.101s-1.086,4.343,0.311,9.461c2.016,6.203-0.776,10.7,1.706,12.561       c3.411,3.412,9.615,1.085,14.421,1.085c1.552,4.962-3.412,21.865-3.412,21.865c-11.01,2.791-22.175,5.584-33.341,8.22       c0,0-16.438-0.93-25.433,11.631c-13.647,14.732-10.855,48.538-10.855,48.538s-12.251,36.133-12.251,44.974       c0,8.684-6.513,22.33-6.513,22.33c-12.562,8.839-12.095,27.449-16.904,42.492c10.855,6.513,19.384,8.839,30.55,10.698       c8.064-17.059,19.695-34.579,19.695-53.813c3.878-10.854,7.444-21.554,11.166-32.41c0,0,9.305,32.72,8.684,45.437       c-0.465,7.446-1.085,43.578-3.566,47.92c0,0-2.791,11.786-2.791,20.781c0,8.838-3.102,26.052-11.166,52.104       c-8.219,25.896-12.561,81.724-12.561,81.724c22.021,0,44.042,0,66.218,0c5.738-24.967,11.32-49.778,17.058-74.589       c-0.621,24.966-1.395,50.09-1.861,75.367c20.314-0.312,40.784-0.623,61.41-0.778c8.063-30.082,20.781-78.775,16.438-109.172       c-2.17-14.732-6.047-37.685-6.047-37.685s1.705-6.356,2.014-15.817c-8.372-20.78,4.964-36.131,2.016-74.745       c0,0,10.547,26.982,11.167,32.253c3.411,24.968,2.481,26.209,16.282,57.999c8.22-3.563,16.439-6.975,24.659-10.387       c-1.396-13.646-4.343-46.678-14.27-56.605c-4.961-22.331-4.806-45.126-12.869-67.923c0,0,5.272-15.041-3.877-35.046       c-5.582-13.647-16.439-17.99-27.449-21.557c-11.32-2.792-33.961-16.438-33.961-16.438c-2.017-8.374-3.566-16.902-1.24-27.293       c0,0,4.652-11.011,10.234-18.764c5.583-7.909,6.668-31.946-2.326-44.663C228.379-1.578,196.743-3.904,181.702,5.555z"></path>
					<g name="heart">
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#FD8646" d="M198.14,150.863l-6.668,8.529        c0,0-1.551,11.165,0.31,17.058c2.326,6.203,2.326,10.388,8.529,13.026c6.358,2.792,17.058,7.133,23.261,7.133        c6.358,0,9.303-0.31,9.926-3.412c0.618-3.1,0.773-13.956-2.171-18.299c-2.947-4.341-11.322-18.299-11.322-18.299l-0.465-5.271        l-13.803-3.412L198.14,150.863z"></path>
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#8D5F46" d="M191.627,157.065        c-0.932,8.529-2.792,24.502,4.653,30.705c5.735,4.652,21.553,9.923,29.152,9.459c2.636-0.156,5.738-1.241,5.738-1.241        s-4.188-1.859-6.049-1.706c-1.707,0.467-6.978-2.015-9.304-1.55c-2.326,0.464-6.358,0-6.358,0s5.894-2.171,5.582-2.171        c-0.309,0-9.306,0.776-9.306,0.776s4.188-2.017,3.724-1.861c-0.312,0.156-7.135-0.156-7.135-0.156        c1.088-0.465,2.326-0.929,3.411-1.395c0,0-5.735,1.395-7.597-0.776c-6.979-7.444-6.358-13.802-6.358-23.726        C192.246,161.563,193.022,158.925,191.627,157.065z"></path>
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#8D5F46" d="M197.674,151.792c0,0,0,6.047-0.309,7.909        c-0.467,1.861-2.638,4.188-2.949,5.582c-0.31,1.553-0.619,3.567-0.619,3.567c1.241-2.326,2.17-4.652,4.03-6.514        c-2.015,5.429-2.944,8.685-2.17,14.267c0.311-0.621,0.467-1.394,0.776-2.17c0.155,1.55,0.309,3.103,0.465,4.808        c0.467-1.397,0.775-2.638,1.241-4.032c0.311,1.706,0.621,3.411,1.086,4.961c0.775,0.155,1.705,0.311,2.637,0.465        c-0.932,0.467-1.861,0.776-2.793,1.241c1.861,0.312,3.723,0.464,5.738,0.464c-2.016,0.467-3.877,0.621-5.738,0.932        c1.708,0.309,3.411,0.621,5.272,0.929c-1.238,0.465-2.479,0.93-3.876,1.241c0,0,5.271,0.31,5.737,0.621        c4.342,2.791,8.063,3.412,13.183,3.876c0,0-9.461-3.876-10.702-5.273c-1.395-1.394-4.962-4.962-4.962-4.962        c-1.085-0.156-2.015-0.464-3.256-0.929c1.706-0.467,3.256-0.932,5.118-1.396c-1.862,0-3.412,0-5.118,0        c-0.155-1.085-0.465-2.17-0.62-3.256c-0.776-0.465-1.395-1.085-2.171-1.552c0-1.395-0.155-2.792-0.155-4.186        c0.932,0.93,1.862,1.706,2.792,2.327c-1.085-2.792-1.86-4.653-1.241-7.755c0.932,0.621,1.861,1.241,2.793,1.706        c-2.637-3.565-2.793-6.512-2.793-10.855C198.604,153.342,198.14,152.568,197.674,151.792z"></path>
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#8D5F46" d="M216.283,154.274        c0,0,1.861,6.823,2.946,8.994c2.48,3.876,2.016,5.427-1.396,8.685c2.638-6.205-1.241-6.979-1.705-11.322        C215.974,158.616,216.283,154.274,216.283,154.274z"></path>
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#8D5F46" d="M219.074,152.878        c0.62,5.272,3.567,12.717,3.412,17.679c-0.466,5.582,2.946,10.39,4.962,15.508c0.155-0.311-2.48-10.082-2.48-13.026        c3.411,5.271,12.097,17.523,4.032,22.329c1.548,0.932,3.874,1.397,4.959-1.085c5.585-13.335-5.58-27.138-12.714-37.217        c-0.465-1.553-0.93-3.103-1.395-4.808C219.539,152.568,219.386,152.722,219.074,152.878z"></path>
						<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#8D5F46" d="M221.4,173.039c0,0-0.93,0.153-2.635,1.55        c-1.553,1.085-2.018,2.791-2.018,2.791l1.861-1.085l2.636-2.017L221.4,173.039z"></path>
					</g>
					<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#FD9A52" d="M200.001,145.434       c0.93,3.876-0.62,8.529,3.876,9.305c0,0,2.48-1.397,1.396-5.738c-2.016-7.288-0.621-24.346,9.305-10.855       C211.631,123.258,196.28,133.493,200.001,145.434z"></path>
					<path i:knockout="Off" fill-rule="evenodd" clip-rule="evenodd" fill="#FD9A52" d="M209.46,144.813       c4.962,2.791,3.1,7.909,2.171,12.562c0.465,0.311,1.085,0.62,1.705,0.775c3.256-11.319,5.273-15.043,18.764-13.802       c-6.511-2.635-10.699-2.015-16.437,1.396c-1.861,1.395-5.273-1.861-6.515-2.793C209.148,143.573,209.46,144.193,209.46,144.813       z"></path>
				</g>
			</g>
		</g>
	</switch>
</svg>
`;

describe('devInfo/mapChart', function () {
    let chart: EChartsType;
    let chartGraphic: Displayable[];
    beforeAll(function () {
        chart = createChart();
        registerMap('organ_diagram', { svg: svg });
        chart.setOption({
            legend: {
                show: true
            },
            series: [{
                type: 'map',
                map: 'organ_diagram',
                showLegendSymbol: true,
                data: [
                    { name: 'heart', value: 15 }
                ]
            }]
        });
        // @ts-ignore
        chartGraphic = chart.getZr().storage._displayList;
    });
    afterAll(function () {
        chart.dispose();
    });
    const devInfoNames: string[] = [
        'map', 'symbol'
    ];
    devInfoNames.forEach((devInfoName: string) => {
        it(`series-${devInfoName}`, function () {
            const haveDevInfo = chartGraphic.some((graphic) => {
                return isHaveEditorInfo(graphic, true, {
                    component: 'series',
                    subType: 'map',
                    element: devInfoName,
                    componentIndex: 0
                });
            });
            expect(haveDevInfo === true).toEqual(true);
        });
    });
});
