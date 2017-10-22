require.config({
    paths: {
        'geoJson': '../geoData/geoJson',
        'theme': '../theme',
        'data': './data',
        'map': '../map',
        'extension': '../dist/extension'
    },
    packages: [
        {
            main: 'echarts',
            location: '../dist',
            name: 'echarts'
        },
        {
            main: 'zrender',
            location: '../../zrender/dist',
            name: 'zrender'
        }
    ]
    // urlArgs: '_v_=' + +new Date()
});