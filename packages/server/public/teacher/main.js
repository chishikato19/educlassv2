import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import './index.css';
// Polyfill Buffer & global an toàn cho môi trường trình duyệt web
if (typeof window !== 'undefined') {
    const win = window;
    if (typeof win['global'] === 'undefined') {
        win['global'] = window;
    }
    if (typeof win['Buffer'] === 'undefined') {
        win['Buffer'] = {
            isBuffer: (obj) => obj instanceof Uint8Array,
            from: (data, encoding) => {
                if (typeof data === 'string') {
                    if (encoding === 'base64') {
                        const binary = window.atob(data);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        return bytes;
                    }
                    const encoder = new TextEncoder();
                    return encoder.encode(data);
                }
                if (data instanceof ArrayBuffer) {
                    return new Uint8Array(data);
                }
                if (Array.isArray(data) || data instanceof Uint8Array) {
                    return new Uint8Array(data);
                }
                return new Uint8Array(0);
            },
            alloc: (size) => new Uint8Array(size),
            allocUnsafe: (size) => new Uint8Array(size),
            concat: (list) => {
                let total = 0;
                for (const item of list)
                    total += item.length;
                const res = new Uint8Array(total);
                let offset = 0;
                for (const item of list) {
                    res.set(item, offset);
                    offset += item.length;
                }
                return res;
            },
        };
    }
}
import { ActivityHostWindow } from './components/ActivityHostWindow.js';
import { VideoProjectorWindow } from './components/VideoProjectorWindow.js';
import { RandomPickerProjectorWindow } from './components/random-picker/RandomPickerProjectorWindow.js';
const rootElement = document.getElementById('root');
if (rootElement) {
    const searchParams = new URLSearchParams(window.location.search);
    const windowType = searchParams.get('window');
    let windowContent = _jsx(App, {});
    if (windowType === 'activity') {
        windowContent = _jsx(ActivityHostWindow, {});
    }
    else if (windowType === 'video') {
        windowContent = _jsx(VideoProjectorWindow, {});
    }
    else if (windowType === 'random-picker') {
        windowContent = _jsx(RandomPickerProjectorWindow, {});
    }
    ReactDOM.createRoot(rootElement).render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: windowContent }) }));
}
//# sourceMappingURL=main.js.map