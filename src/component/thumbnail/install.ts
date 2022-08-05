import ComponentModel from '../../model/Component';
import ComponentView from '../../view/Component';
import { ComponentOption } from '../../util/types';
import { Color } from '../../echarts.all';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { EChartsExtensionInstallRegisters } from '../../extension';


export interface ThumbnailOption extends ComponentOption {

    mintype?: 'thumbnail',

    show?: boolean,

    top?: number | string,
    bottom?: number | string,
    left?: number | string,
    right?: number | string,

    width?: number | string,
    height?: number | string,

    borderColor?: Color,
    backgroundColor?: Color,

}


class ThumbnailModel extends ComponentModel<ThumbnailOption> {

    static type = 'thumbnail' as const;
    type = ThumbnailModel.type;

    static defaultOption: ThumbnailOption = {

        show: true,

        top: 'ph',
        right: 'ph',
        width: 'ph',
        height: 'ph',
        bottom: null,
        left: null,

        borderColor: 'rgba(47,69,84,0)',
        backgroundColor: 'rgba(47,69,84,0)'

    };

}

class ThumbnailView extends ComponentView {

    static type = 'thumbnails' as const;
    type = ThumbnailView.type;

    render(thumbnailsModel: ThumbnailModel, ecModel: GlobalModel, api: ExtensionAPI) {

      // 在这里console.log测试无任何输出
      const group = this.group;

      group.removeAll();

    }


}

export function install(registers: EChartsExtensionInstallRegisters) {
  registers.registerComponentModel(ThumbnailModel);
  registers.registerComponentView(ThumbnailView);
}
