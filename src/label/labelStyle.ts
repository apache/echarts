import ZRText, { TextStyleProps } from 'zrender/src/graphic/Text';
import { Dictionary } from 'zrender/src/core/types';
import Element, { ElementTextConfig } from 'zrender/src/Element';
import Model from '../model/Model';
import { LabelOption, DisplayState, TextCommonOption, ParsedValue, CallbackDataParams } from '../util/types';
import GlobalModel from '../model/Global';
import { isFunction, retrieve2, extend, keys, trim } from 'zrender/src/core/util';
import { TextCommonParams, EMPTY_OBJ } from '../util/graphic';

interface SetLabelStyleOpt<LDI> extends TextCommonParams {
    defaultText?: string | ((labelDataIndex: LDI, opt: SetLabelStyleOpt<LDI>) => string);
    // Fetch text by:
    // opt.labelFetcher.getFormattedLabel(
    //     opt.labelDataIndex, 'normal'/'emphasis', null, opt.labelDimIndex, opt.labelProp
    // )
    labelFetcher?: {
        getFormattedLabel: (
            // In MapDraw case it can be string (region name)
            labelDataIndex: LDI,
            status: DisplayState,
            dataType?: string,
            labelDimIndex?: number,
            formatter?: string | ((params: object) => string),
            extendParams?: Partial<CallbackDataParams>
        ) => string;
    };
    labelDataIndex?: LDI;
    labelDimIndex?: number;
}
type LabelModel = Model<LabelOption & {
    formatter?: string | ((params: any) => string);
}>;
type LabelModelForText = Model<Omit<
    // Remove
    LabelOption, 'position' | 'rotate'> & {
        formatter?: string | ((params: any) => string);
    }>;

export function getLabelText<LDI>(
    opt: SetLabelStyleOpt<LDI>,
    normalModel: LabelModel,
    emphasisModel: LabelModel,
    interpolateValues?: ParsedValue | ParsedValue[]
) {
    const labelFetcher = opt.labelFetcher;
    const labelDataIndex = opt.labelDataIndex;
    const labelDimIndex = opt.labelDimIndex;
    let baseText;
    if (labelFetcher) {
        baseText = labelFetcher.getFormattedLabel(
            labelDataIndex, 'normal',
            null,
            labelDimIndex,
            normalModel && normalModel.get('formatter'),
            interpolateValues != null ? {
                value: interpolateValues
            } : null
        );
    }
    if (baseText == null) {
        baseText = isFunction(opt.defaultText) ? opt.defaultText(labelDataIndex, opt) : opt.defaultText;
    }
    const emphasisStyleText = retrieve2(labelFetcher
        ? labelFetcher.getFormattedLabel(
            labelDataIndex,
            'emphasis',
            null,
            labelDimIndex,
            emphasisModel && emphasisModel.get('formatter')
        )
        : null, baseText);
    return {
        normal: baseText,
        emphasis: emphasisStyleText
    };
}
/**
 * Set normal styles and emphasis styles about text on target element
 * If target is a ZRText. It will create a new style object.
 * If target is other Element. It will create or reuse ZRText which is attached on the target.
 * And create a new style object.
 *
 * NOTICE: Because the style on ZRText will be replaced with new(only x, y are keeped).
 * So please update the style on ZRText after use this method.
 */
// eslint-disable-next-line
function setLabelStyle<LDI>(targetEl: ZRText, normalModel: LabelModelForText, emphasisModel: LabelModelForText, opt?: SetLabelStyleOpt<LDI>, normalSpecified?: TextStyleProps, emphasisSpecified?: TextStyleProps): void;
// eslint-disable-next-line
function setLabelStyle<LDI>(targetEl: Element, normalModel: LabelModel, emphasisModel: LabelModel, opt?: SetLabelStyleOpt<LDI>, normalSpecified?: TextStyleProps, emphasisSpecified?: TextStyleProps): void;
function setLabelStyle<LDI>(
    targetEl: Element,
    normalModel: LabelModel,
    emphasisModel: LabelModel,
    opt?: SetLabelStyleOpt<LDI>,
    normalSpecified?: TextStyleProps,
    emphasisSpecified?: TextStyleProps
    // TODO specified position?
) {
    opt = opt || EMPTY_OBJ;
    const isSetOnText = targetEl instanceof ZRText;
    const showNormal = normalModel.getShallow('show');
    const showEmphasis = emphasisModel.getShallow('show');
    let richText = isSetOnText ? targetEl as ZRText : null;
    if (showNormal || showEmphasis) {
        if (!isSetOnText) {
            // Reuse the previous
            richText = targetEl.getTextContent();
            if (!richText) {
                richText = new ZRText();
                targetEl.setTextContent(richText);

                // Use same state proxy
                if (targetEl.stateProxy) {
                    richText.stateProxy = targetEl.stateProxy;
                }
            }
        }
        richText.ignore = !showNormal;
        const emphasisState = richText.ensureState('emphasis');
        emphasisState.ignore = !showEmphasis;
        const normalStyle = createTextStyle(normalModel, normalSpecified, opt, false, !isSetOnText);
        emphasisState.style = createTextStyle(emphasisModel, emphasisSpecified, opt, true, !isSetOnText);
        if (!isSetOnText) {
            // Always create new
            targetEl.setTextConfig(createTextConfig(normalStyle, normalModel, opt, false));
            const targetElEmphasisState = targetEl.ensureState('emphasis');
            targetElEmphasisState.textConfig = createTextConfig(emphasisState.style, emphasisModel, opt, true);
        }
        // PENDING: if there is many requirements that emphasis position
        // need to be different from normal position, we might consider
        // auto slient is those cases.
        richText.silent = !!normalModel.getShallow('silent');
        const labelText = getLabelText(opt, normalModel, emphasisModel);
        normalStyle.text = labelText.normal;
        emphasisState.style.text = labelText.emphasis;
        // Keep x and y
        if (richText.style.x != null) {
            normalStyle.x = richText.style.x;
        }
        if (richText.style.y != null) {
            normalStyle.y = richText.style.y;
        }
        // Always create new style.
        richText.useStyle(normalStyle);
        richText.dirty();
    }
    else if (richText) {
        // Not display rich text.
        richText.ignore = true;
    }
    targetEl.dirty();
}
export { setLabelStyle };
/**
 * Set basic textStyle properties.
 */
export function createTextStyle(textStyleModel: Model, specifiedTextStyle?: TextStyleProps, // Can be overrided by settings in model.
    opt?: Pick<TextCommonParams, 'inheritColor' | 'disableBox'>, isNotNormal?: boolean, isAttached?: boolean // If text is attached on an element. If so, auto color will handling in zrender.
) {
    const textStyle: TextStyleProps = {};
    setTextStyleCommon(textStyle, textStyleModel, opt, isNotNormal, isAttached);
    specifiedTextStyle && extend(textStyle, specifiedTextStyle);
    // textStyle.host && textStyle.host.dirty && textStyle.host.dirty(false);
    return textStyle;
}
export function createTextConfig(textStyle: TextStyleProps,
    textStyleModel: Model,
    opt?: Pick<TextCommonParams, 'defaultOutsidePosition' | 'inheritColor'>,
    isNotNormal?: boolean
) {
    opt = opt || {};
    const textConfig: ElementTextConfig = {};
    let labelPosition;
    let labelRotate = textStyleModel.getShallow('rotate');
    const labelDistance = retrieve2(textStyleModel.getShallow('distance'), isNotNormal ? null : 5);
    const labelOffset = textStyleModel.getShallow('offset');
    labelPosition = textStyleModel.getShallow('position')
        || (isNotNormal ? null : 'inside');
    // 'outside' is not a valid zr textPostion value, but used
    // in bar series, and magric type should be considered.
    labelPosition === 'outside' && (labelPosition = opt.defaultOutsidePosition || 'top');
    if (labelPosition != null) {
        textConfig.position = labelPosition;
    }
    if (labelOffset != null) {
        textConfig.offset = labelOffset;
    }
    if (labelRotate != null) {
        labelRotate *= Math.PI / 180;
        textConfig.rotation = labelRotate;
    }
    if (labelDistance != null) {
        textConfig.distance = labelDistance;
    }
    // fill and auto is determined by the color of path fill if it's not specified by developers.
    textConfig.outsideFill = textStyleModel.get('color') === 'inherit'
        ? (opt.inheritColor || null)
        : 'auto';
    return textConfig;
}
/**
 * The uniform entry of set text style, that is, retrieve style definitions
 * from `model` and set to `textStyle` object.
 *
 * Never in merge mode, but in overwrite mode, that is, all of the text style
 * properties will be set. (Consider the states of normal and emphasis and
 * default value can be adopted, merge would make the logic too complicated
 * to manage.)
 */
function setTextStyleCommon(
    textStyle: TextStyleProps,
    textStyleModel: Model,
    opt?: Pick<TextCommonParams, 'inheritColor' | 'disableBox'>,
    isNotNormal?: boolean,
    isAttached?: boolean
) {
    // Consider there will be abnormal when merge hover style to normal style if given default value.
    opt = opt || EMPTY_OBJ;
    const ecModel = textStyleModel.ecModel;
    const globalTextStyle = ecModel && ecModel.option.textStyle;
    // Consider case:
    // {
    //     data: [{
    //         value: 12,
    //         label: {
    //             rich: {
    //                 // no 'a' here but using parent 'a'.
    //             }
    //         }
    //     }],
    //     rich: {
    //         a: { ... }
    //     }
    // }
    const richItemNames = getRichItemNames(textStyleModel);
    let richResult: TextStyleProps['rich'];
    if (richItemNames) {
        richResult = {};
        for (const name in richItemNames) {
            if (richItemNames.hasOwnProperty(name)) {
                // Cascade is supported in rich.
                const richTextStyle = textStyleModel.getModel(['rich', name]);
                // In rich, never `disableBox`.
                // FIXME: consider `label: {formatter: '{a|xx}', color: 'blue', rich: {a: {}}}`,
                // the default color `'blue'` will not be adopted if no color declared in `rich`.
                // That might confuses users. So probably we should put `textStyleModel` as the
                // root ancestor of the `richTextStyle`. But that would be a break change.
                setTokenTextStyle(richResult[name] = {}, richTextStyle, globalTextStyle, opt, isNotNormal, isAttached);
            }
        }
    }
    if (richResult) {
        textStyle.rich = richResult;
    }
    const overflow = textStyleModel.get('overflow');
    if (overflow) {
        textStyle.overflow = overflow;
    }
    const margin = textStyleModel.get('minMargin');
    if (margin != null) {
        textStyle.margin = margin;
    }
    setTokenTextStyle(textStyle, textStyleModel, globalTextStyle, opt, isNotNormal, isAttached, true);
}
// Consider case:
// {
//     data: [{
//         value: 12,
//         label: {
//             rich: {
//                 // no 'a' here but using parent 'a'.
//             }
//         }
//     }],
//     rich: {
//         a: { ... }
//     }
// }
// TODO TextStyleModel
function getRichItemNames(textStyleModel: Model<LabelOption>) {
    // Use object to remove duplicated names.
    let richItemNameMap: Dictionary<number>;
    while (textStyleModel && textStyleModel !== textStyleModel.ecModel) {
        const rich = (textStyleModel.option || EMPTY_OBJ as LabelOption).rich;
        if (rich) {
            richItemNameMap = richItemNameMap || {};
            const richKeys = keys(rich);
            for (let i = 0; i < richKeys.length; i++) {
                const richKey = richKeys[i];
                richItemNameMap[richKey] = 1;
            }
        }
        textStyleModel = textStyleModel.parentModel;
    }
    return richItemNameMap;
}
const TEXT_PROPS_WITH_GLOBAL = [
    'fontStyle', 'fontWeight', 'fontSize', 'fontFamily', 'opacity',
    'textShadowColor', 'textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY'
] as const;
const TEXT_PROPS_SELF = [
    'align', 'lineHeight', 'width', 'height', 'tag', 'verticalAlign'
] as const;
const TEXT_PROPS_BOX = [
    'padding', 'borderWidth', 'borderRadius',
    'backgroundColor', 'borderColor',
    'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'
] as const;

function setTokenTextStyle(
    textStyle: TextStyleProps['rich'][string],
    textStyleModel: Model<LabelOption>,
    globalTextStyle: LabelOption,
    opt?: Pick<TextCommonParams, 'inheritColor' | 'disableBox'>,
    isNotNormal?: boolean,
    isAttached?: boolean,
    isBlock?: boolean
) {
    // In merge mode, default value should not be given.
    globalTextStyle = !isNotNormal && globalTextStyle || EMPTY_OBJ;
    const inheritColor = opt && opt.inheritColor;
    let fillColor = textStyleModel.getShallow('color');
    let strokeColor = textStyleModel.getShallow('textBorderColor');
    if (fillColor === 'inherit') {
        if (inheritColor) {
            fillColor = inheritColor;
        }
        else {
            fillColor = null;
        }
    }
    if (strokeColor === 'inherit' && inheritColor) {
        if (inheritColor) {
            strokeColor = inheritColor;
        }
        else {
            strokeColor = inheritColor;
        }
    }
    fillColor = fillColor || globalTextStyle.color;
    strokeColor = strokeColor || globalTextStyle.textBorderColor;
    if (fillColor != null) {
        textStyle.fill = fillColor;
    }
    if (strokeColor != null) {
        textStyle.stroke = strokeColor;
    }
    const lineWidth = retrieve2(textStyleModel.getShallow('textBorderWidth'), globalTextStyle.textBorderWidth);
    if (lineWidth != null) {
        textStyle.lineWidth = lineWidth;
    }
    // TODO
    if (!isNotNormal && !isAttached) {
        // Set default finally.
        if (textStyle.fill == null && opt.inheritColor) {
            textStyle.fill = opt.inheritColor;
        }
    }
    // Do not use `getFont` here, because merge should be supported, where
    // part of these properties may be changed in emphasis style, and the
    // others should remain their original value got from normal style.
    for (let i = 0; i < TEXT_PROPS_WITH_GLOBAL.length; i++) {
        const key = TEXT_PROPS_WITH_GLOBAL[i];
        const val = retrieve2(textStyleModel.getShallow(key), globalTextStyle[key]);
        if (val != null) {
            (textStyle as any)[key] = val;
        }
    }
    for (let i = 0; i < TEXT_PROPS_SELF.length; i++) {
        const key = TEXT_PROPS_SELF[i];
        const val = textStyleModel.getShallow(key);
        if (val != null) {
            (textStyle as any)[key] = val;
        }
    }
    if (textStyle.verticalAlign == null) {
        const baseline = textStyleModel.getShallow('baseline');
        if (baseline != null) {
            textStyle.verticalAlign = baseline;
        }
    }
    if (!isBlock || !opt.disableBox) {
        if (textStyle.backgroundColor === 'auto' && inheritColor) {
            textStyle.backgroundColor = inheritColor;
        }
        if (textStyle.borderColor === 'auto' && inheritColor) {
            textStyle.borderColor = inheritColor;
        }
        for (let i = 0; i < TEXT_PROPS_BOX.length; i++) {
            const key = TEXT_PROPS_BOX[i];
            const val = textStyleModel.getShallow(key);
            if (val != null) {
                (textStyle as any)[key] = val;
            }
        }
    }
}
export function getFont(
    opt: Pick<TextCommonOption, 'fontStyle' | 'fontWeight' | 'fontSize' | 'fontFamily'>,
    ecModel: GlobalModel
) {
    const gTextStyleModel = ecModel && ecModel.getModel('textStyle');
    return trim([
        // FIXME in node-canvas fontWeight is before fontStyle
        opt.fontStyle || gTextStyleModel && gTextStyleModel.getShallow('fontStyle') || '',
        opt.fontWeight || gTextStyleModel && gTextStyleModel.getShallow('fontWeight') || '',
        (opt.fontSize || gTextStyleModel && gTextStyleModel.getShallow('fontSize') || 12) + 'px',
        opt.fontFamily || gTextStyleModel && gTextStyleModel.getShallow('fontFamily') || 'sans-serif'
    ].join(' '));
}
