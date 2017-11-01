import commonLayout from './commonLayout';

export default function (ecModel, api) {
    ecModel.eachSeriesByType('tree', function (seriesModel) {
        commonLayout(seriesModel, api);
    });
}