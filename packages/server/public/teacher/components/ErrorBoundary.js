import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[EduClass UI Error]', error, errorInfo);
    }
    handleReload = () => {
        window.location.href = '/teacher';
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function'
                    ? this.props.fallback(this.state.error)
                    : this.props.fallback;
            }
            return (_jsx("div", { style: {
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    backgroundColor: '#F8FAFC',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#1E293B',
                    boxSizing: 'border-box',
                }, children: _jsxs("div", { style: {
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E2E8F0',
                        textAlign: 'center',
                    }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '16px' }, children: "\u26A0\uFE0F" }), _jsx("h1", { style: { fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }, children: "B\u00E0n l\u00E0m vi\u1EC7c g\u1EB7p s\u1EF1 c\u1ED1 hi\u1EC3n th\u1ECB" }), _jsx("p", { style: { fontSize: '14px', color: '#64748B', margin: '0 0 24px 0', lineHeight: 1.5 }, children: "M\u1ED9t l\u1ED7i giao di\u1EC7n b\u1EA5t ng\u1EDD \u0111\u00E3 x\u1EA3y ra. Th\u1EA7y/C\u00F4 c\u00F3 th\u1EC3 t\u1EA3i l\u1EA1i b\u00E0n l\u00E0m vi\u1EC7c \u0111\u1EC3 ti\u1EBFp t\u1EE5c m\u00E0 kh\u00F4ng l\u00E0m \u1EA3nh h\u01B0\u1EDFng \u0111\u1EBFn d\u1EEF li\u1EC7u phi\u00EAn h\u1ECDc." }), this.state.error && (_jsx("div", { style: {
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '24px',
                                fontSize: '12px',
                                color: '#991B1B',
                                textAlign: 'left',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                            }, children: this.state.error.message || String(this.state.error) })), _jsx("div", { style: { display: 'flex', gap: '12px', justifyContent: 'center' }, children: _jsx("button", { type: "button", onClick: this.handleReload, style: {
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                }, children: "\uD83D\uDD04 T\u1EA3i l\u1EA1i B\u00E0n l\u00E0m vi\u1EC7c" }) })] }) }));
        }
        return this.props.children;
    }
}
//# sourceMappingURL=ErrorBoundary.js.map