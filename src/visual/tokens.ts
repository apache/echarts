const tokens = {
    color: {
        theme: [
            '#5978e3',
            '#b6d634',
            '#505372',
            '#ff994d',
            '#5acb92',
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
        neutral95: '#17171b',
        neutral99: '#000',

        transparent: 'rgba(0,0,0,0)',

        primary: '@neutral80',
        secondary: '@neutral70',
        tertiary: '@neutral60',
        quaternary: '@neutral50',
        disabled: '@neutral20',

        border: '@neutral30',
        borderTint: '@neutral20',
        borderShade: '@neutral40',

        background: '@neutral05',
        backgroundTint: 'rgba(234,237,245,0.5)',
        backgroundShade: '@neutral10',

        shadow: 'rgba(0,0,0,0.2)',
        shadowTint: 'rgba(129,130,136,0.2)',

        axisLine: '@neutral70',
        axisTick: '@axisLine',
        axisTickMinor: '@neutral60',
        axisLabel: '@axisLine'
    }
} as const;

function decodeTokens() {
    const color = tokens.color as {
        [key: string]: string | readonly string[]
    };
    for (const key in color) {
        if (Object.prototype.hasOwnProperty.call(color, key)) {
            const value = color[key];
            if (typeof value === 'string' && value.startsWith('@')) {
                const refKey = value.slice(1);
                if (refKey in color) {
                    color[key] = color[refKey];
                }
            }
        }
    }
}

decodeTokens();

export default tokens;
