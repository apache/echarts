import * as echarts from '../../echarts';

var DatasetModel = echarts.extendComponentModel({

    type: 'dataset',

    /**
     * @protected
     */
    defaultOption: {
        sourceType: 'rows', // 'rows', 'columns', 'objects'
        source: null
    },

    /**
     * @override
     */
    optionUpdated: function () {
        parseData(this.option);
    }

});

function parseData(option) {
    var sourceType = option.sourceType;
    var parser = parsers[sourceType];
    if (parser && option.source) {
        option.data = parser(option.source, option);
    }
    option.source = null;
}

var parsers = {
    rows: function (source, option) {
        return source;
    },
    columns: function (source, option) {
        // TODO
    },
    objects: function (source, option) {
        // TODO
    }
};

export default DatasetModel;
