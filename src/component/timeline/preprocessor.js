import * as zrUtil from 'zrender/src/core/util';

export default function (option) {
    var timelineOpt = option && option.timeline;

    if (!zrUtil.isArray(timelineOpt)) {
        timelineOpt = timelineOpt ? [timelineOpt] : [];
    }

    zrUtil.each(timelineOpt, function (opt) {
        if (!opt) {
            return;
        }

        compatibleEC2(opt);
    });
}

function compatibleEC2(opt) {
    var type = opt.type;

    var ec2Types = {'number': 'value', 'time': 'time'};

    // Compatible with ec2
    if (ec2Types[type]) {
        opt.axisType = ec2Types[type];
        delete opt.type;
    }

    transferItem(opt);

    if (has(opt, 'controlPosition')) {
        var controlStyle = opt.controlStyle || (opt.controlStyle = {});
        if (!has(controlStyle, 'position')) {
            controlStyle.position = opt.controlPosition;
        }
        if (controlStyle.position === 'none' && !has(controlStyle, 'show')) {
            controlStyle.show = false;
            delete controlStyle.position;
        }
        delete opt.controlPosition;
    }

    zrUtil.each(opt.data || [], function (dataItem) {
        if (zrUtil.isObject(dataItem) && !zrUtil.isArray(dataItem)) {
            if (!has(dataItem, 'value') && has(dataItem, 'name')) {
                // In ec2, using name as value.
                dataItem.value = dataItem.name;
            }
            transferItem(dataItem);
        }
    });
}

function transferItem(opt) {
    var itemStyle = opt.itemStyle || (opt.itemStyle = {});

    var itemStyleEmphasis = itemStyle.emphasis || (itemStyle.emphasis = {});

    // Transfer label out
    var label = opt.label || (opt.label || {});
    var labelNormal = label.normal || (label.normal = {});
    var excludeLabelAttr = {normal: 1, emphasis: 1};

    zrUtil.each(label, function (value, name) {
        if (!excludeLabelAttr[name] && !has(labelNormal, name)) {
            labelNormal[name] = value;
        }
    });

    if (itemStyleEmphasis.label && !has(label, 'emphasis')) {
        label.emphasis = itemStyleEmphasis.label;
        delete itemStyleEmphasis.label;
    }
}

function has(obj, attr) {
    return obj.hasOwnProperty(attr);
}
