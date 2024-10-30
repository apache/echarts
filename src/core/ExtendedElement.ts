import Element, { ElementProps } from 'zrender/src/Element';

export interface ExtendedElement extends Element {
    ignoreModelZ?: boolean;
}

export interface ExtendedElementProps extends ElementProps {
    ignoreModelZ?: boolean;
}
