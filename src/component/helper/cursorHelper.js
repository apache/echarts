
var IRRELEVANT_EXCLUDES = {'axisPointer': 1, 'tooltip': 1, 'brush': 1};

/**
 * Avoid that: mouse click on a elements that is over geo or graph,
 * but roam is triggered.
 */
export function onIrrelevantElement(e, api, targetCoordSysModel) {
    var model = api.getComponentByElement(e.topTarget);
    // If model is axisModel, it works only if it is injected with coordinateSystem.
    var coordSys = model && model.coordinateSystem;
    return model
        && model !== targetCoordSysModel
        && !IRRELEVANT_EXCLUDES[model.mainType]
        && (coordSys && coordSys.model !== targetCoordSysModel);
}
