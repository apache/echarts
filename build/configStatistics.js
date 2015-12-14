({
    // appDir: './',
    // baseUrl: '../src',
    // optimize: 'none',
    name: 'echarts',
    paths: {
        extension: '../extension',
        echarts: '../extension/statistics/echarts'
    },
    wrap: {
        startFile: [
            'wrap/startExtension.js',
            'wrap/nut.js'
        ],
        endFile: [
            'wrap/endExtension.js'
        ]
    },
    include:[
        'extension/statistics/quantile',
        'extension/statistics/prepareBoxplotData'
    ],
    out: '../dist/extension/statistics.js'
})