import Element from 'zrender/src/Element';
import { EditorInfo } from './types';
export const addEditorInfo = function (el: Element, editorInfo: EditorInfo) {
    if (!el) {
        return;
    };
    el.__editorInfo = editorInfo;
};
