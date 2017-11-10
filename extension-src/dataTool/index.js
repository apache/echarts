import * as echarts from 'echarts';
import * as gexf from './gexf';
import prepareBoxplotData from './prepareBoxplotData';

export var version = '1.0.0';

export {gexf};

export {prepareBoxplotData};

echarts.$inject.dataTool({
    version: version,
    gexf: gexf,
    prepareBoxplotData: prepareBoxplotData
});
