define({
    color: ['#E01F54','#b8d2c7','#f5e8c8','#001852','#c6b38e',
            '#a4d8c2','#f3d999','#d3758f','#dcc392','#2e4783',
            '#82b6e9','#ff6347','#a092f1','#0a915d','#eaf889',
            '#6699FF','#ff6666','#3cb371','#d5b158','#38b6b6'],
    dataRange: {
        color:['#e01f54','#e7dbc3'],
        textStyle: {
            color: '#333'
        }
    },
    k: {
        itemStyle: {
            normal: {
                color: '#e01f54',          
                color0: '#001852',      
                lineStyle: {
                    width: 1,
                    color: '#f5e8c8',   
                    color0: '#b8d2c7'   
                }
            }
        }
    },
    pie: {
        itemStyle: {
            normal: {
                
                borderColor: '#fff',
                borderWidth: 1,
                label: {
                    show: true,
                    position: 'outer',
                  textStyle: {color: '#1b1b1b'},
                  lineStyle: {color: '#1b1b1b'}
                    
                },
                labelLine: {
                    show: true,
                    length: 20,
                    lineStyle: {
                        
                        width: 1,
                        type: 'solid'
                    }
                }
            },
            emphasis: {
                
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                label: {
                    show: false
                },
                labelLine: {
                    show: false,
                    length: 20,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                }
            }
        }
    },
    
    map: {
        itemStyle: {
            normal: {
                borderColor: '#fff',
                borderWidth: 1,
                areaStyle: {
                    color: '#ccc'
                },
                label: {
                    show: false,
                    textStyle: {
                        color: 'rgba(139,69,19,1)'
                    }
                }
            },
            emphasis: {                 
                
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
                areaStyle: {
                    color: '#f3d999'
                },
                label: {
                    show: false,
                    textStyle: {
                        color: 'rgba(139,69,19,1)'
                    }
                }
            }
        }
    },
    
    force : {
        itemStyle: {
            normal: {
                label: {
                    show: false
                },
                nodeStyle : {
                    brushType : 'both',
                    strokeColor : '#5182ab'
                },
                linkStyle : {
                    strokeColor : '#5182ab'
                }
            },
            emphasis: {
                label: {
                    show: false
                },
                nodeStyle : {},
                linkStyle : {}
            }
        }
    }
});