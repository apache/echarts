/**
 * @file Sunburst action
 */

import * as echarts from '../../echarts';
import * as helper from '../helper/treeHelper';

var ROOT_TO_NODE_ACTION = 'sunburstRootToNode';

echarts.registerAction(
    {type: ROOT_TO_NODE_ACTION, update: 'updateView'},
    function (payload, ecModel) {

        ecModel.eachComponent(
            {mainType: 'series', subType: 'sunburst', query: payload},
            handleRootToNode
        );

        function handleRootToNode(model, index) {
            var targetInfo = helper
                .retrieveTargetInfo(payload, [ROOT_TO_NODE_ACTION], model);

            if (targetInfo) {
                var originViewRoot = model.getViewRoot();
                if (originViewRoot) {
                    payload.direction = helper.aboveViewRoot(originViewRoot, targetInfo.node)
                        ? 'rollUp' : 'drillDown';
                }
                model.resetViewRoot(targetInfo.node);
            }
        }
    }
);


var HIGHLIGHT_ACTION = 'sunburstHighlight';

echarts.registerAction(
    {type: HIGHLIGHT_ACTION, update: 'updateView'},
    function (payload, ecModel) {

        ecModel.eachComponent(
            {mainType: 'series', subType: 'sunburst', query: payload},
            handleHighlight
        );

        function handleHighlight(model, index) {
            var targetInfo = helper
                .retrieveTargetInfo(payload, [HIGHLIGHT_ACTION], model);

            if (targetInfo) {
                payload.highlight = targetInfo.node;
            }
        }
    }
);


var UNHIGHLIGHT_ACTION = 'sunburstUnhighlight';

echarts.registerAction(
    {type: UNHIGHLIGHT_ACTION, update: 'updateView'},
    function (payload, ecModel) {

        ecModel.eachComponent(
            {mainType: 'series', subType: 'sunburst', query: payload},
            handleUnhighlight
        );

        function handleUnhighlight(model, index) {
            payload.unhighlight = true;
        }
    }
);
