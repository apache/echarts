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
        neutral05: '#f4f7fd',
        neutral10: '#e8ebf0',
        neutral15: '#dbdee4',
        neutral20: '#cfd2d7',
        neutral25: '#c3c5cb',
        neutral30: '#b7b9be',
        neutral35: '#aaacb2',
        neutral40: '#9ea0a5',
        neutral45: '#929399',
        neutral50: '#86878c',
        neutral55: '#797b7f',
        neutral60: '#6d6e73',
        neutral65: '#616266',
        neutral70: '#54555a',
        neutral75: '#48494d',
        neutral80: '#3c3c41',
        neutral85: '#303034',
        neutral90: '#232328',
        neutral95: '#17171b',
        neutral99: '#000',

        accent05: '#eef2fc',
        accent10: '#dee4f9',
        accent15: '#cdd7f7',
        accent20: '#bdc9f4',
        accent25: '#acbcf1',
        accent30: '#9baeee',
        accent35: '#8ba1eb',
        accent40: '#7a93e9',
        accent45: '#6a86e6',
        accent50: '#5978e3',
        accent55: '#506ccc',
        accent60: '#4760b6',
        accent65: '#3e549f',
        accent70: '#354888',
        accent75: '#2d3c72',
        accent80: '#24305b',
        accent85: '#1b2444',
        accent90: '#12182d',
        accent95: '#090c17',

        visualGradient: ['#f05252', '#ffbc85', '#fff5c5'],

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
        backgroundTransparent: 'rgba(255,255,255,0)',
        backgroundShade: '@neutral10',

        shadow: 'rgba(0,0,0,0.2)',
        shadowTint: 'rgba(129,130,136,0.2)',

        axisLine: '@neutral70',
        axisLineTint: '@neutral40',
        axisTick: '@axisLine',
        axisTickMinor: '@neutral60',
        axisLabel: '@axisLine',
        axisSplitLine: '@neutral15',
        axisMinorSplitLine: '@neutral05'
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
