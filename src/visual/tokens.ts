const tokens = {
    color: {
        theme: [
            '#5978e3',
            '#b6d634',
            '#505372',
            '#ff994d',
            '#52d098',
            '#ffd82c',
            '#e76991',
            '#6854aa',
            '#52c4d0'
        ],

        neutral00: '#fff',
        neutral05: '#eaedf5',
        neutral10: '#dee1e9',
        neutral15: '#d3d5dd',
        neutral20: '#c7c9d1',
        neutral25: '#bbbdc5',
        neutral30: '#afb2b8',
        neutral35: '#a4a6ac',
        neutral40: '#989aa0',
        neutral45: '#8c8e94',
        neutral50: '#818288',
        neutral55: '#75767c',
        neutral60: '#696a70',
        neutral65: '#5d5e64',
        neutral70: '#525258',
        neutral75: '#46474b',
        neutral80: '#3a3b3f',
        neutral85: '#2e2f33',
        neutral90: '#232327',
        neutral95: '#232327',
        neutral100: '#000',

        // Dynamic colors
        foreground: {
            primary: '',
            secondary: '',
            tertiary: '',
            quaternary: ''
        }
    }
};

tokens.color.foreground = {
    primary: tokens.color.neutral80,
    secondary: tokens.color.neutral70,
    tertiary: tokens.color.neutral60,
    quaternary: tokens.color.neutral50
};

export default tokens;
