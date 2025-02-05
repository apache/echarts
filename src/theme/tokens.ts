import { TokenOption } from '../util/types';

/**
 * Default design tokens
 */
export const DEFAULT_TOKENS: TokenOption = {
    // Colors
    color: {
        // Testing colors
        border: '#f00',
    },

    // Spacing
    spacing: {
        base: 4,
        small: 8,
        medium: 16,
        large: 24
    },

    // Border radius
    borderRadius: {
        small: 2,
        base: 4,
        large: 8
    },

    // Font sizes
    fontSize: {
        sm: 12,
        base: 14,
        lg: 16,
        xl: 20
    }
};

export type DesignTokens = typeof DEFAULT_TOKENS;
