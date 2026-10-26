import React, { useState, useId, useMemo } from 'react';
import type { AssignmentState, MaterialFile } from '../assignment-schemas.js';

export interface AssignmentStudentViewProps {
  runId: string;
  state: AssignmentState;
  participantId: string;
  displayName: string;
  onSendIntent: (intent: unknown) => void;
  onSubmitFile?: (file: File) => Promise<void>;
  onLeaveSession?: () => void;
}

export const AssignmentStudentView: React.FC<AssignmentStudentViewProps> = ({
  runId: _runId,
  state,
  participantId,
  displayName,
  onSendIntent,
  onSubmitFile,
  onLeaveSession,
}) => {
  const fileInputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeMaterialPopup, setActiveMaterialPopup] = useState<MaterialFile | null>(null);

  const mySubmission = useMemo(() => {
    return state.submissions?.[participantId] || null;
  }, [state.submissions, participantId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    // 1. Kiểm tra kích thước file
    const maxBytes = (state.maxFileSizeMb || 50) * 1024 * 1024;
    if (file.size > maxBytes) {
      return `Kích thước tệp quá lớn (${formatFileSize(file.size)}). Giới hạn tối đa là ${state.maxFileSizeMb} MB.`;
    }

    // 2. Kiểm tra định dạng nếu có quy định
    if (state.allowedExtensions && state.allowedExtensions.length > 0) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      const isAllowed = state.allowedExtensions.some(
        a => a.toLowerCase() === ext || a.toLowerCase() === ext.replace('.', '')
      );
      if (!isAllowed) {
        return `Định dạng tệp "${ext}" không được chấp nhận. Thầy/Cô chỉ nhận các định dạng: ${state.allowedExtensions.join(', ')}.`;
      }
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      e.target.value = '';
    } else {
      setErrorMessage(null);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
    } else {
      setErrorMessage(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn tệp bài làm trước khi nộp.');
      return;
    }

    if (state.isLocked) {
      setErrorMessage('Cổng thu bài đã đóng, bạn không thể nộp lúc này.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (onSubmitFile) {
        await onSubmitFile(selectedFile);
      } else {
        // Mặc định upload qua endpoint REST
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64Data = reader.result as string;
              const res = await fetch(`/api/sessions/active/activities/current/assignment/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  participantId,
                  displayName,
                  filename: selectedFile.name,
                  fileSize: selectedFile.size,
                  mime: selectedFile.type || 'application/octet-stream',
                  base64: base64Data,
                }),
              });

              if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || 'Nộp bài không thành công');
              }

              const data = await res.json();
              // Gửi intent cập nhật state
              onSendIntent({
                type: 'submit_assignment',
                submission: data.submission,
              });

              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Lỗi khi đọc tệp'));
          reader.readAsDataURL(selectedFile);
        });
      }

      setSuccessToast('Đã nộp bài thành công! Thầy/Cô đã nhận được tệp của bạn.');
      setSelectedFile(null);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải bài nộp lên');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-linear-to-b from-blue-50/60 to-white p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Title & Instructions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📁</span>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">{state.title || 'Thu - phát bài tập'}</h2>
              <p className="text-xs text-gray-500">
                Học sinh: <strong className="text-gray-700">{displayName}</strong>
              </p>
            </div>
          </div>
          {onLeaveSession && (
            <button
              type="button"
              onClick={onLeaveSession}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 shrink-0"
              title="Đổi học sinh khác"
            >
              <span>🚪</span> Đổi học sinh
            </button>
          )}
        </div>

        {state.instructions && (
          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs md:text-sm text-gray-700 leading-relaxed">
            <span className="font-bold text-blue-900 block mb-1">📝 Hướng dẫn từ Thầy/Cô:</span>
            {state.instructions}
          </div>
        )}

        {state.isLocked && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs md:text-sm text-amber-800 flex items-center gap-2 font-medium">
            <span>🔒</span> Cổng nộp bài hiện đang đóng. Không thể nộp bài vào lúc này.
          </div>
        )}
      </div>

      {/* Material Download / View Notification (Phương án A) */}
      {state.materials && state.materials.length > 0 && (
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-emerald-200 bg-linear-to-r from-emerald-50/40 to-teal-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <span>📢</span> Tài liệu Thầy/Cô phát ({state.materials.length})
            </h3>
            <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
              Bấm để tải về / Xem
            </span>
          </div>

          <div className="space-y-2">
            {state.materials.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200 shadow-xs hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-gray-800 truncate" title={m.name}>
                      {m.name}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatFileSize(m.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveMaterialPopup(m)}
                    className="min-h-[44px] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  >
                    👁️ Xem
                  </button>

                  <a
                    href={m.url}
                    download={m.name}
                    className="min-h-[44px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>⬇️</span> Tải về
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Status or Upload Form */}
      {mySubmission ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-300 bg-emerald-50/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">Bạn đã nộp bài thành công!</h3>
              <p className="text-xs text-gray-500">
                Nộp lúc: {new Date(mySubmission.submittedAt).toLocaleTimeString('vi-VN')} ngày{' '}
                {new Date(mySubmission.submittedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl">📑</span>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-bold text-gray-800 truncate">{mySubmission.fileName}</p>
                <p className="text-[11px] text-gray-400">{formatFileSize(mySubmission.fileSize)}</p>
              </div>
            </div>

            <a
              href={mySubmission.downloadUrl}
              download={mySubmission.fileName}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline px-2 py-1"
            >
              Tải lại tệp
            </a>
          </div>

          {state.allowResubmit && !state.isLocked && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Thầy/Cô cho phép nộp lại nếu bạn muốn gửi bản sửa đổi:</p>
              <label
                htmlFor={fileInputId}
                className="w-full min-h-[48px] py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>🔄</span> Chọn tệp khác để nộp lại
              </label>
              <input
                id={fileInputId}
                type="file"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
            </div>
          )}

          {onLeaveSession && (
            <div className="pt-2 text-center border-t border-gray-100">
              <button
                type="button"
                onClick={onLeaveSession}
                className="text-xs text-slate-600 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
              >
                <span>🚪</span> Đổi học sinh khác nộp bài
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span>📤</span> Nộp bài làm của bạn
          </h3>

          {/* Drag & Drop Area */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-gray-300 hover:border-blue-400 bg-gray-50/50'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <span className="text-4xl block">📄</span>
                <p className="text-sm font-bold text-gray-800 break-all">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold underline mt-1 cursor-pointer"
                >
                  Chọn tệp khác
                </button>
              </div>
            ) : (
              <>
                <span className="text-4xl mb-2 text-blue-500">📁</span>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Kéo thả tệp vào đây, hoặc bấm nút bên dưới
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Dung lượng tối đa: {state.maxFileSizeMb || 50} MB
                  {state.allowedExtensions && state.allowedExtensions.length > 0 ? (
                    <span> • Định dạng: {state.allowedExtensions.join(', ')}</span>
                  ) : (
                    <span> • Định dạng: Mọi loại tệp</span>
                  )}
                </p>

                <label
                  htmlFor={fileInputId}
                  className="min-h-[48px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>📎</span> Chọn tệp từ thiết bị
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  onChange={handleFileChange}
                  disabled={isSubmitting || state.isLocked}
                  className="hidden"
                />
              </>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <span>⚠️</span> {errorMessage}
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <span>✓</span> {successToast}
            </div>
          )}

          {selectedFile && !mySubmission && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || state.isLocked}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải bài lên...</span>
                </>
              ) : (
                <>
                  <span>🚀</span> Xác nhận nộp bài
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Material Quick View Popup Modal */}
      {activeMaterialPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">📄</span>
                <h4 className="text-sm font-bold text-gray-800 truncate">{activeMaterialPopup.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveMaterialPopup(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex flex-col items-center justify-center text-center">
              <span className="text-5xl mb-3">📚</span>
              <p className="text-sm font-bold text-gray-800 mb-1">{activeMaterialPopup.name}</p>
              <p className="text-xs text-gray-500 mb-4">{formatFileSize(activeMaterialPopup.size)}</p>

              <div className="flex gap-2">
                <a
                  href={activeMaterialPopup.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[48px] px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span>↗️</span> Mở xem trong tab mới
                </a>
                <a
                  href={activeMaterialPopup.url}
                  download={activeMaterialPopup.name}
                  className="min-h-[48px] px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span>⬇️</span> Tải xuống
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
