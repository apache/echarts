require.config({
    paths: {
        'geoJson': '../geoData/geoJson',
        'theme': '../theme',
        'data': './data'
    },
    packages: [
        {
            main: 'echarts',
            location: '../src',
            name: 'echarts'
        },
        {
            main: 'zrender',
            location: '../../zrender-dev3.0/src',
            name: 'zrender'
        }
    ]//,
    // urlArgs: '_v_=' + +new Date()
});