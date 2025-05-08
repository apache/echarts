import { extend } from 'zrender/src/core/util';

interface Tokens {
    color: {
        theme: string[];
        neutral00: string;
        neutral05: string;
        neutral10: string;
        neutral15: string;
        neutral20: string;
        neutral25: string;
        neutral30: string;
        neutral35: string;
        neutral40: string;
        neutral45: string;
        neutral50: string;
        neutral55: string;
        neutral60: string;
        neutral65: string;
        neutral70: string;
        neutral75: string;
        neutral80: string;
        neutral85: string;
        neutral90: string;
        neutral95: string;
        neutral99: string;
        accent05: string;
        accent10: string;
        accent15: string;
        accent20: string;
        accent25: string;
        accent30: string;
        accent35: string;
        accent40: string;
        accent45: string;
        accent50: string;
        accent55: string;
        accent60: string;
        accent65: string;
        accent70: string;
        accent75: string;
        accent80: string;
        accent85: string;
        accent90: string;
        accent95: string;
        transparent: string;
        primary: string;
        secondary: string;
        tertiary: string;
        quaternary: string;
        disabled: string;
        border: string;
        borderTint: string;
        borderShade: string;
        background: string;
        backgroundTint: string;
        backgroundTransparent: string;
        backgroundShade: string;
        shadow: string;
        shadowTint: string;
        axisLine: string;
        axisLineTint: string;
        axisTick: string;
        axisTickMinor: string;
        axisLabel: string;
        axisSplitLine: string;
        axisMinorSplitLine: string;
    };
    size: {
        xxs: number;
        xs: number;
        s: number;
        m: number;
        l: number;
        xl: number;
        xxl: number;
        xxxl: number;
    };
}

const tokens: Tokens = {
    color: {} as Tokens['color'],
    size: {} as Tokens['size']
};

const color = tokens.color = {
    theme: [
        '#5978e3',
        '#b6d634',
        '#505372',
        '#ff994d',
        '#0ca8df',
        '#ffd10a',
        '#fb628b',
        '#785db0',
        '#3fbe95'
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

    transparent: 'rgba(0,0,0,0)',
} as Tokens['color'];

extend(color, {
    primary: color.neutral80,
    secondary: color.neutral70,
    tertiary: color.neutral60,
    quaternary: color.neutral50,
    disabled: color.neutral20,

    border: color.neutral30,
    borderTint: color.neutral20,
    borderShade: color.neutral40,

    background: color.neutral05,
    backgroundTint: 'rgba(234,237,245,0.5)',
    backgroundTransparent: 'rgba(255,255,255,0)',
    backgroundShade: color.neutral10,

    shadow: 'rgba(0,0,0,0.2)',
    shadowTint: 'rgba(129,130,136,0.2)',

    axisLine: color.neutral70,
    axisLineTint: color.neutral40,
    axisTick: color.neutral70,
    axisTickMinor: color.neutral60,
    axisLabel: color.neutral70,
    axisSplitLine: color.neutral15,
    axisMinorSplitLine: color.neutral05,
} as Tokens['color']);

tokens.size = {
    xxs: 2,
    xs: 5,
    s: 10,
    m: 15,
    l: 20,
    xl: 30,
    xxl: 40,
    xxxl: 50
};

export default tokens;
