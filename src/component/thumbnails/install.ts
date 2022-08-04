import ComponentModel from '../../model/Component';
import ComponentView from '../../view/Component';
import { ComponentOption } from '../../util/types';
import GlobalModel from '../../model/Global';
import ExtensionAPI from '../../core/ExtensionAPI';
import { EChartsExtensionInstallRegisters } from '../../extension';


export interface ThumbnailsOption extends ComponentOption {
  text?: string
}


class ThumbnailsModel extends ComponentModel<ThumbnailsOption> {
  static type = 'thumbnails' as const;
  type = ThumbnailsModel.type;

  static defaultOption: ThumbnailsOption = {
    text: ''
  };

}

class ThumbnailsView extends ComponentView {

    static type = 'thumbnails' as const;
    type = ThumbnailsView.type;

    render(thumbnailsModel: ThumbnailsModel, ecModel: GlobalModel, api: ExtensionAPI) {

      const group = this.group;

      group.removeAll();

      const title = thumbnailsModel.getModel('text');
    }


}

export function install(registers: EChartsExtensionInstallRegisters) {
  registers.registerComponentModel(ThumbnailsModel);
  registers.registerComponentView(ThumbnailsView);
}
