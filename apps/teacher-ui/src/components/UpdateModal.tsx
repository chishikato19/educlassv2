import React, { useEffect, useState } from 'react';
import { Button, Modal, UI_COLORS } from '@educlass/ui-kit';

export interface UpdateInfoResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string | null;
  releaseDate?: string;
  devMode?: boolean;
  message?: string;
  error?: string;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface ElectronUpdateApi {
  checkForUpdate?: () => Promise<UpdateInfoResult>;
  startDownloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall?: () => Promise<void>;
  onUpdateDownloadProgress?: (callback: (progress: UpdateProgress) => void) => () => void;
  onUpdateDownloaded?: (callback: (info: { version: string }) => void) => () => void;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, currentVersion }) => {
  const [status, setStatus] = useState<
    | 'idle'
    | 'checking'
    | 'up-to-date'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'error'
    | 'not-desktop'
  >('idle');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [displayVersion, setDisplayVersion] = useState<string>(currentVersion);

  useEffect(() => {
    setDisplayVersion(currentVersion);
  }, [currentVersion]);

  const getElectronApi = (): ElectronUpdateApi | undefined => {
    return (window as unknown as { electronAPI?: ElectronUpdateApi }).electronAPI;
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
      if (res.currentVersion) {
        setDisplayVersion(res.currentVersion);
      }
      if (res.error) {
        setStatus('error');
        setErrorMessage(res.error);
      } else if (res.devMode) {
        setStatus('up-to-date');
        setErrorMessage(res.message || 'Chế độ phát triển (Dev Mode).');
      } else if (res.hasUpdate && res.latestVersion) {
        setStatus('available');
        setLatestVersion(res.latestVersion);
        setReleaseNotes(res.releaseNotes || null);
      } else {
        setStatus('up-to-date');
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Không thể kết nối máy chủ cập nhật.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      void handleCheckUpdate();
    } else {
      if (status !== 'downloading' && status !== 'downloaded') {
        setStatus('idle');
        setDownloadPercent(0);
        setErrorMessage('');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const api = getElectronApi();
    if (!api) return;

    let cleanupProgress: (() => void) | undefined;
    let cleanupDownloaded: (() => void) | undefined;

    if (typeof api.onUpdateDownloadProgress === 'function') {
      cleanupProgress = api.onUpdateDownloadProgress(progress => {
        setDownloadPercent(progress.percent);
      });
    }

    if (typeof api.onUpdateDownloaded === 'function') {
      cleanupDownloaded = api.onUpdateDownloaded(info => {
        setStatus('downloaded');
        if (info.version) setLatestVersion(info.version);
      });
    }

    return () => {
      cleanupProgress?.();
      cleanupDownloaded?.();
    };
  }, []);

  const handleStartDownload = async () => {
    const api = getElectronApi();
    if (!api || typeof api.startDownloadUpdate !== 'function') return;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={status === 'downloading' ? () => {} : onClose}
      title="Cập Nhật Phần Mềm EduClass v2"
    >
      <div style={{ padding: '8px 4px' }}>
        {status === 'checking' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
            <div
              style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}
            >
              Đang kiểm tra phiên bản mới từ GitHub...
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Hệ thống đang so khớp với bản phát hành mới nhất.
            </div>
          </div>
        )}

        {status === 'up-to-date' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <div
              style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}
            >
              Bạn đang sử dụng phiên bản mới nhất!
            </div>
            <div style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
              Phiên bản hiện tại: <strong>v{displayVersion}</strong>
            </div>
            {errorMessage && (
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                {errorMessage}
              </div>
            )}
            <Button variant="secondary" onClick={onClose} style={{ minWidth: '120px' }}>
              Đã hiểu
            </Button>
          </div>
        )}

        {status === 'available' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '16px',
                border: '1px solid #BFDBFE',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '28px' }}>🚀</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E3A8A' }}>
                  Đã có bản cập nhật mới: v{latestVersion}
                </div>
                <div style={{ fontSize: '13px', color: '#3B82F6' }}>
                  Phiên bản hiện tại của bạn: v{displayVersion}
                </div>
              </div>
            </div>

            {releaseNotes && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Điểm mới trong phiên bản này:
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '13px',
                    color: '#475569',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {releaseNotes}
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              💡 Gói cập nhật vi sai chỉ tải các phần thay đổi (~5–15MB) mà không ảnh hưởng tới dữ
              liệu lớp học hiện có.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={onClose} style={{ minWidth: '100px' }}>
                Để sau
              </Button>
              <Button
                variant="primary"
                onClick={handleStartDownload}
                style={{ backgroundColor: UI_COLORS.primary, color: '#FFFFFF', minWidth: '160px' }}
              >
                ⬇️ Tải & Cập nhật ngay
              </Button>
            </div>
          </div>
        )}

        {status === 'downloading' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <div
              style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}
            >
              Đang tải bản cập nhật v{latestVersion}...
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Vui lòng giữ ứng dụng mở trong giây lát.
            </div>

            <div
              style={{
                width: '100%',
                height: '16px',
                backgroundColor: '#E2E8F0',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  width: `${downloadPercent}%`,
                  height: '100%',
                  backgroundColor: UI_COLORS.primary,
                  transition: 'width 0.3s ease',
                  borderRadius: '9999px',
                }}
              />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: UI_COLORS.primary }}>
              {downloadPercent}%
            </div>
          </div>
        )}

        {status === 'downloaded' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
            <div
              style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}
            >
              Đã tải xong bản cập nhật v{latestVersion}!
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
              Bạn có thể khởi động lại ngay bây giờ để áp dụng bản mới (chỉ mất ~10 giây), hoặc để
              app tự cập nhật khi bạn kết thúc buổi dạy.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button variant="secondary" onClick={onClose} style={{ minWidth: '110px' }}>
                Để sau
              </Button>
              <Button
                variant="primary"
                onClick={handleQuitAndInstall}
                style={{ backgroundColor: '#10B981', color: '#FFFFFF', minWidth: '180px' }}
              >
                🚀 Khởi động lại ngay
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <div
              style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626', marginBottom: '6px' }}
            >
              Không thể kiểm tra hoặc tải bản cập nhật
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#64748B',
                backgroundColor: '#FEF2F2',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #FEE2E2',
                marginBottom: '20px',
                wordBreak: 'break-word',
              }}
            >
              {errorMessage || 'Vui lòng kiểm tra lại kết nối mạng Internet của máy tính.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <Button variant="secondary" onClick={onClose}>
                Đóng
              </Button>
              <Button variant="primary" onClick={handleCheckUpdate}>
                🔄 Thử lại
              </Button>
            </div>
          </div>
        )}

        {status === 'not-desktop' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌐</div>
            <div
              style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}
            >
              Đang mở trên trình duyệt web
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Tính năng tự động cập nhật được tích hợp trực tiếp trên ứng dụng{' '}
              <strong>EduClass v2 Desktop</strong> cho giáo viên.
            </div>
            <Button variant="secondary" onClick={onClose}>
              Đã hiểu
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
