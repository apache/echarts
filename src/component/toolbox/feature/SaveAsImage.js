define(function (require) {

    function SaveAsImage (option) {
        this.option = option;
    };

    SaveAsImage.defaultOption = {
        icon: 'M57.2,23.2L55.8,21.8L46,31.6L46,9.4L44,9.4L44,31.3L34.3,21.5L32.8,23L45.1,35.3zM55.1,38.4L34.5,38.4L34.5,31.9L32.5,31.9L32.5,40.4L57.1,40.4L57.1,31.9L55.1,31.9z',
        show: true,
        title: '保存为图片',
        type: 'png',
        iconStyle: {
            normal: {
                borderColor: '#000',
                color: 'none'
            },
            emphasis: {
                borderColor: '#3E98C5'
            }
        }
    };

    var proto = SaveAsImage.prototype;

    proto.onclick = function (ecModel, api) {
        window.open(api.getConnectedDataURL());
    };

    require('../featureManager').register(
        'saveAsImage', SaveAsImage
    );

    return SaveAsImage;
});