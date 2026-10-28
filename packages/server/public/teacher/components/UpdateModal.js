import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS } from '@educlass/ui-kit';
export const UpdateModal = ({ isOpen, onClose, currentVersion }) => {
    const [status, setStatus] = useState('idle');
    const [latestVersion, setLatestVersion] = useState('');
    const [releaseNotes, setReleaseNotes] = useState(null);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const getElectronApi = () => {
        return window.electronAPI;
    };
    const handleCheckUpdate = async () => {
        const api = getElectronApi();
        if (!api || typeof api.checkForUpdate !== 'function') {
            setStatus('not-desktop');
            return;
        }
        setStatus('checking');
        setErrorMessage('');
        try {
            const res = await api.checkForUpdate();
            if (res.error) {
                setStatus('error');
                setErrorMessage(res.error);
            }
            else if (res.devMode) {
                setStatus('up-to-date');
                setErrorMessage(res.message || 'Chế độ phát triển (Dev Mode).');
            }
            else if (res.hasUpdate && res.latestVersion) {
                setStatus('available');
                setLatestVersion(res.latestVersion);
                setReleaseNotes(res.releaseNotes || null);
            }
            else {
                setStatus('up-to-date');
            }
        }
        catch (err) {
            setStatus('error');
            setErrorMessage(err instanceof Error ? err.message : 'Không thể kết nối máy chủ cập nhật.');
        }
    };
    useEffect(() => {
        if (isOpen) {
            void handleCheckUpdate();
        }
        else {
            if (status !== 'downloading' && status !== 'downloaded') {
                setStatus('idle');
                setDownloadPercent(0);
                setErrorMessage('');
            }
        }
    }, [isOpen]);
    useEffect(() => {
        const api = getElectronApi();
        if (!api)
            return;
        let cleanupProgress;
        let cleanupDownloaded;
        if (typeof api.onUpdateDownloadProgress === 'function') {
            cleanupProgress = api.onUpdateDownloadProgress(progress => {
                setDownloadPercent(progress.percent);
            });
        }
        if (typeof api.onUpdateDownloaded === 'function') {
            cleanupDownloaded = api.onUpdateDownloaded(info => {
                setStatus('downloaded');
                if (info.version)
                    setLatestVersion(info.version);
            });
        }
        return () => {
            cleanupProgress?.();
            cleanupDownloaded?.();
        };
    }, []);
    const handleStartDownload = async () => {
        const api = getElectronApi();
        if (!api || typeof api.startDownloadUpdate !== 'function')
            return;
        setStatus('downloading');
        setDownloadPercent(0);
        const res = await api.startDownloadUpdate();
        if (!res.success && res.error) {
            setStatus('error');
            setErrorMessage(res.error);
        }
    };
    const handleQuitAndInstall = async () => {
        const api = getElectronApi();
        if (api && typeof api.quitAndInstall === 'function') {
            await api.quitAndInstall();
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: status === 'downloading' ? () => { } : onClose, title: "C\u1EADp Nh\u1EADt Ph\u1EA7n M\u1EC1m EduClass v2", children: _jsxs("div", { style: { padding: '8px 4px' }, children: [status === 'checking' && (_jsxs("div", { style: { textAlign: 'center', padding: '24px 0' }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '12px' }, children: "\uD83D\uDD04" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }, children: "\u0110ang ki\u1EC3m tra phi\u00EAn b\u1EA3n m\u1EDBi t\u1EEB GitHub..." }), _jsx("div", { style: { fontSize: '13px', color: '#64748B' }, children: "H\u1EC7 th\u1ED1ng \u0111ang so kh\u1EDBp v\u1EDBi b\u1EA3n ph\u00E1t h\u00E0nh m\u1EDBi nh\u1EA5t." })] })), status === 'up-to-date' && (_jsxs("div", { style: { textAlign: 'center', padding: '20px 0' }, children: [_jsx("div", { style: { fontSize: '40px', marginBottom: '12px' }, children: "\uD83C\uDF89" }), _jsx("div", { style: { fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }, children: "B\u1EA1n \u0111ang s\u1EED d\u1EE5ng phi\u00EAn b\u1EA3n m\u1EDBi nh\u1EA5t!" }), _jsxs("div", { style: { fontSize: '14px', color: '#475569', marginBottom: '16px' }, children: ["Phi\u00EAn b\u1EA3n hi\u1EC7n t\u1EA1i: ", _jsxs("strong", { children: ["v", currentVersion] })] }), errorMessage && (_jsx("div", { style: { fontSize: '12px', color: '#64748B', marginBottom: '16px' }, children: errorMessage })), _jsx(Button, { variant: "secondary", onClick: onClose, style: { minWidth: '120px' }, children: "\u0110\u00E3 hi\u1EC3u" })] })), status === 'available' && (_jsxs("div", { children: [_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px',
                                backgroundColor: '#EFF6FF',
                                borderRadius: '16px',
                                border: '1px solid #BFDBFE',
                                marginBottom: '16px',
                            }, children: [_jsx("div", { style: { fontSize: '28px' }, children: "\uD83D\uDE80" }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: '15px', fontWeight: 800, color: '#1E3A8A' }, children: ["\u0110\u00E3 c\u00F3 b\u1EA3n c\u1EADp nh\u1EADt m\u1EDBi: v", latestVersion] }), _jsxs("div", { style: { fontSize: '13px', color: '#3B82F6' }, children: ["Phi\u00EAn b\u1EA3n hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n: v", currentVersion] })] })] }), releaseNotes && (_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("div", { style: {
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#334155',
                                        marginBottom: '6px',
                                    }, children: "\u0110i\u1EC3m m\u1EDBi trong phi\u00EAn b\u1EA3n n\u00E0y:" }), _jsx("div", { style: {
                                        backgroundColor: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        fontSize: '13px',
                                        color: '#475569',
                                        maxHeight: '140px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-line',
                                    }, children: releaseNotes })] })), _jsx("div", { style: { fontSize: '13px', color: '#64748B', marginBottom: '20px' }, children: "\uD83D\uDCA1 G\u00F3i c\u1EADp nh\u1EADt vi sai ch\u1EC9 t\u1EA3i c\u00E1c ph\u1EA7n thay \u0111\u1ED5i (~5\u201315MB) m\u00E0 kh\u00F4ng \u1EA3nh h\u01B0\u1EDFng t\u1EDBi d\u1EEF li\u1EC7u l\u1EDBp h\u1ECDc hi\u1EC7n c\u00F3." }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px' }, children: [_jsx(Button, { variant: "secondary", onClick: onClose, style: { minWidth: '100px' }, children: "\u0110\u1EC3 sau" }), _jsx(Button, { variant: "primary", onClick: handleStartDownload, style: { backgroundColor: UI_COLORS.primary, color: '#FFFFFF', minWidth: '160px' }, children: "\u2B07\uFE0F T\u1EA3i & C\u1EADp nh\u1EADt ngay" })] })] })), status === 'downloading' && (_jsxs("div", { style: { textAlign: 'center', padding: '16px 0' }, children: [_jsx("div", { style: { fontSize: '32px', marginBottom: '12px' }, children: "\uD83D\uDCE6" }), _jsxs("div", { style: { fontSize: '16px', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }, children: ["\u0110ang t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt v", latestVersion, "..."] }), _jsx("div", { style: { fontSize: '13px', color: '#64748B', marginBottom: '20px' }, children: "Vui l\u00F2ng gi\u1EEF \u1EE9ng d\u1EE5ng m\u1EDF trong gi\u00E2y l\u00E1t." }), _jsx("div", { style: {
                                width: '100%',
                                height: '16px',
                                backgroundColor: '#E2E8F0',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                marginBottom: '10px',
                            }, children: _jsx("div", { style: {
                                    width: `${downloadPercent}%`,
                                    height: '100%',
                                    backgroundColor: UI_COLORS.primary,
                                    transition: 'width 0.3s ease',
                                    borderRadius: '9999px',
                                } }) }), _jsxs("div", { style: { fontSize: '14px', fontWeight: 700, color: UI_COLORS.primary }, children: [downloadPercent, "%"] })] })), status === 'downloaded' && (_jsxs("div", { style: { textAlign: 'center', padding: '16px 0' }, children: [_jsx("div", { style: { fontSize: '40px', marginBottom: '12px' }, children: "\u2728" }), _jsxs("div", { style: { fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }, children: ["\u0110\u00E3 t\u1EA3i xong b\u1EA3n c\u1EADp nh\u1EADt v", latestVersion, "!"] }), _jsx("div", { style: { fontSize: '13px', color: '#475569', marginBottom: '20px' }, children: "B\u1EA1n c\u00F3 th\u1EC3 kh\u1EDFi \u0111\u1ED9ng l\u1EA1i ngay b\u00E2y gi\u1EDD \u0111\u1EC3 \u00E1p d\u1EE5ng b\u1EA3n m\u1EDBi (ch\u1EC9 m\u1EA5t ~10 gi\u00E2y), ho\u1EB7c \u0111\u1EC3 app t\u1EF1 c\u1EADp nh\u1EADt khi b\u1EA1n k\u1EBFt th\u00FAc bu\u1ED5i d\u1EA1y." }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '12px' }, children: [_jsx(Button, { variant: "secondary", onClick: onClose, style: { minWidth: '110px' }, children: "\u0110\u1EC3 sau" }), _jsx(Button, { variant: "primary", onClick: handleQuitAndInstall, style: { backgroundColor: '#10B981', color: '#FFFFFF', minWidth: '180px' }, children: "\uD83D\uDE80 Kh\u1EDFi \u0111\u1ED9ng l\u1EA1i ngay" })] })] })), status === 'error' && (_jsxs("div", { style: { textAlign: 'center', padding: '16px 0' }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '12px' }, children: "\u26A0\uFE0F" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 800, color: '#DC2626', marginBottom: '6px' }, children: "Kh\u00F4ng th\u1EC3 ki\u1EC3m tra ho\u1EB7c t\u1EA3i b\u1EA3n c\u1EADp nh\u1EADt" }), _jsx("div", { style: {
                                fontSize: '13px',
                                color: '#64748B',
                                backgroundColor: '#FEF2F2',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #FEE2E2',
                                marginBottom: '20px',
                                wordBreak: 'break-word',
                            }, children: errorMessage || 'Vui lòng kiểm tra lại kết nối mạng Internet của máy tính.' }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '10px' }, children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "\u0110\u00F3ng" }), _jsx(Button, { variant: "primary", onClick: handleCheckUpdate, children: "\uD83D\uDD04 Th\u1EED l\u1EA1i" })] })] })), status === 'not-desktop' && (_jsxs("div", { style: { textAlign: 'center', padding: '16px 0' }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '12px' }, children: "\uD83C\uDF10" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }, children: "\u0110ang m\u1EDF tr\u00EAn tr\u00ECnh duy\u1EC7t web" }), _jsxs("div", { style: { fontSize: '13px', color: '#64748B', marginBottom: '20px' }, children: ["T\u00EDnh n\u0103ng t\u1EF1 \u0111\u1ED9ng c\u1EADp nh\u1EADt \u0111\u01B0\u1EE3c t\u00EDch h\u1EE3p tr\u1EF1c ti\u1EBFp tr\u00EAn \u1EE9ng d\u1EE5ng", ' ', _jsx("strong", { children: "EduClass v2 Desktop" }), " cho gi\u00E1o vi\u00EAn."] }), _jsx(Button, { variant: "secondary", onClick: onClose, children: "\u0110\u00E3 hi\u1EC3u" })] }))] }) }));
};
//# sourceMappingURL=UpdateModal.js.map