define(function (require) {

    function SaveAsImage (model) {
        this.model = model;
    }

    SaveAsImage.defaultOption = {
        show: true,
        icon: 'M4.7,22.9L29.3,45.5L54.7,23.4M4.6,43.6L4.6,58L53.8,58L53.8,43.6\
            M29.2,45.1L29.2,0',
        title: '保存为图片',
        type: 'png',
        // Default use option.backgroundColor
        // backgroundColor: '#fff',
        name: '',
        excludeComponents: ['toolbox'],
        pixelRatio: 1
    };

    var proto = SaveAsImage.prototype;

    proto.onclick = function (ecModel, api) {
        var model = this.model;
        var title = ecModel.get('title.0.text') || 'echarts';
        var $a = document.createElement('a');
        var type = model.get('type', true) || 'png';
        $a.download = title + '.' + type;
        $a.target = '_blank';
        $a.href = api.getConnectedDataURL({
            type: type,
            backgroundColor: model.get('backgroundColor', true)
                || ecModel.get('backgroundColor') || '#fff',
            excludeComponents: model.get('excludeComponents'),
            pixelRatio: model.get('pixelRatio')
        });
        $a.click();
    };

    require('../featureManager').register(
        'saveAsImage', SaveAsImage
    );

    return SaveAsImage;
});