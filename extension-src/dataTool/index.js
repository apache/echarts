import * as echarts from 'echarts';
import * as gexf from './gexf';
import prepareBoxplotData from './prepareBoxplotData';

export var version = '1.0.0';

export {gexf};

export {prepareBoxplotData};

// For backward compatibility, where the namespace `dataTool` will
// be mounted on `echarts` is the extension `dataTool` is imported.
// But the old version of echarts do not have `dataTool` namespace,
// so check it before mounting.
if (echarts.dataTool) {
    echarts.dataTool.version = version;
    echarts.dataTool.gexf = gexf;
    echarts.dataTool.prepareBoxplotData = prepareBoxplotData;
}
