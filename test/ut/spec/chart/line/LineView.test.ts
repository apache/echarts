import LineView from "@/src/chart/line/LineView";
import { HOVER_STATE_EMPHASIS } from "@/src/util/states";
import { ECElement } from "@/src/util/types";

describe('LineView', function () {

    let lineView: LineView;
    beforeEach(function () {
        lineView = new LineView();
        lineView.init();
    });

    it('should change poly state when polygon is set', function () {
        lineView._polygon = lineView._newPolygon(
            [], [],
        );
        lineView._changePolyState('emphasis');
        expect((lineView._polygon as ECElement).hoverState).toBe(HOVER_STATE_EMPHASIS);
    });

    it('should not error on state change when polygon is not set', function () {
        lineView._polygon = null;
        expect(() => lineView._changePolyState('emphasis')).not.toThrow();
    });

});
