import {PathStyleProps} from 'zrender/src/graphic/Path';
import {SeriesModel} from '../../export/api';
import {LineStyleProps} from '../../model/mixin/lineStyle';
import {Group} from '../../util/graphic';
import {createSymbol, ECSymbol} from '../../util/symbol';

export function defaultSeriesLegendIcon(opt: {
    series: SeriesModel,
    itemWidth: number,
    itemHeight: number,
    symbolType: string,
    symbolKeepAspect: boolean,
    itemStyle: PathStyleProps,
    lineStyle: LineStyleProps
}): ECSymbol | Group {
    const symbol = createSymbol(
        opt.symbolType,
        0,
        0,
        opt.itemWidth,
        opt.itemHeight,
        opt.itemStyle.fill,
        opt.symbolKeepAspect
    );

    symbol.setStyle(opt.itemStyle);

    if (opt.symbolType.indexOf('empty') > -1) {
        symbol.style.stroke = symbol.style.fill;
        symbol.style.fill = '#fff';
    }

    return symbol;
}
