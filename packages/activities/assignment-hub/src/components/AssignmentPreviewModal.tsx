import React, { useState, useEffect } from 'react';
import type { StudentSubmission } from '../assignment-schemas.js';

export interface PreviewData {
  type: 'image' | 'pdf' | 'text' | 'docx' | 'xlsx' | 'pptx' | 'binary' | 'error';
  url?: string;
  content?: string;
  html?: string;
  sheets?: Array<{ name: string; data: string[][] }>;
  slides?: Array<{ title?: string; text?: string }>;
  error?: string;
}

export interface AssignmentPreviewModalProps {
  submission: StudentSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFileInOs?: (storedPath: string) => void;
}

export const AssignmentPreviewModal: React.FC<AssignmentPreviewModalProps> = ({
  submission,
  isOpen,
  onClose,
  onOpenFileInOs,
}) => {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !submission) {
      setPreviewData(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoading(true);
      try {
        const previewUrl = submission.downloadUrl
          ? submission.downloadUrl.replace('/submissions/', '/preview/').replace(/\/download\/?$/, '')
          : `/api/sessions/active/activities/current/assignment/preview/${submission.participantId}`;
        const res = await fetch(previewUrl);
        if (res.ok) {
          const data = (await res.json()) as PreviewData;
          setPreviewData(data);
        } else {
          // Fallback dựa trên đuôi file
          const ext = submission.fileName.split('.').pop()?.toLowerCase() || '';
          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
            setPreviewData({ type: 'image', url: submission.downloadUrl });
          } else if (ext === 'pdf') {
            setPreviewData({ type: 'pdf', url: submission.downloadUrl });
          } else {
            setPreviewData({ type: 'binary', url: submission.downloadUrl });
          }
        }
      } catch {
        const ext = submission.fileName.split('.').pop()?.toLowerCase() || '';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
          setPreviewData({ type: 'image', url: submission.downloadUrl });
        } else if (ext === 'pdf') {
          setPreviewData({ type: 'pdf', url: submission.downloadUrl });
        } else {
          setPreviewData({ type: 'binary', url: submission.downloadUrl });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreview();
  }, [isOpen, submission]);

  if (!isOpen || !submission) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">📄</span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-800 truncate" title={submission.fileName}>
                {submission.fileName}
              </h3>
              <p className="text-xs text-gray-500">
                Học sinh: <strong className="text-gray-700">{submission.studentName}</strong> • Dung lượng:{' '}
                {formatFileSize(submission.fileSize)} • Nộp lúc:{' '}
                {new Date(submission.submittedAt).toLocaleTimeString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {submission.storedPath && onOpenFileInOs && (
              <button
                type="button"
                onClick={() => onOpenFileInOs(submission.storedPath!)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mở bằng phần mềm mặc định trên máy tính (Word, Excel, PowerPoint...)"
              >
                <span>🖥️</span> Mở bằng máy tính
              </button>
            )}

            <a
              href={submission.downloadUrl}
              download={submission.fileName}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tải tệp này về máy"
            >
              <span>⬇️</span> Tải về
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-lg leading-none"
              title="Đóng (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="flex-1 overflow-auto bg-gray-100/50 p-4 flex flex-col justify-center items-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Đang nạp bản xem trước tài liệu...</p>
            </div>
          ) : previewData?.type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                src={previewData.url || submission.downloadUrl}
                alt={submission.fileName}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md border border-gray-200 bg-white"
              />
            </div>
          ) : previewData?.type === 'pdf' ? (
            <iframe
              src={previewData.url || `${submission.downloadUrl}?inline=true`}
              title={submission.fileName}
              className="w-full h-full rounded-lg border border-gray-200 bg-white shadow-xs"
            />
          ) : previewData?.type === 'docx' && previewData.html ? (
            <div className="w-full h-full overflow-y-auto bg-slate-200/90 p-4 md:p-8">
              <style>{`
                .docx-preview-content {
                  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .docx-preview-content table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin: 16px 0 !important;
                  border: 1.5px solid #334155 !important;
                }
                .docx-preview-content th,
                .docx-preview-content td {
                  border: 1px solid #475569 !important;
                  padding: 8px 12px !important;
                  text-align: left !important;
                  vertical-align: top !important;
                  font-size: 13px !important;
                  line-height: 1.5 !important;
                  color: #0f172a !important;
                }
                .docx-preview-content th {
                  background-color: #f1f5f9 !important;
                  font-weight: 700 !important;
                }
                .docx-preview-content tr:nth-child(even) td {
                  background-color: #f8fafc !important;
                }
                .docx-preview-content p {
                  margin: 8px 0 !important;
                  line-height: 1.6 !important;
                }
                .docx-preview-content h1, .docx-preview-content h2, .docx-preview-content h3 {
                  font-weight: 800 !important;
                  color: #0f172a !important;
                  margin: 16px 0 8px 0 !important;
                }
                .docx-preview-content img {
                  max-width: 100% !important;
                  height: auto !important;
                  margin: 12px 0 !important;
                  border-radius: 8px !important;
                }
              `}</style>
              <div
                className="bg-white p-8 md:p-14 rounded-xl shadow-xl border border-slate-300 max-w-4xl mx-auto text-slate-800 text-sm leading-relaxed docx-preview-content min-h-fit"
                dangerouslySetInnerHTML={{ __html: previewData.html }}
              />
            </div>
          ) : previewData?.type === 'xlsx' && previewData.sheets && previewData.sheets.length > 0 ? (
            <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Sheet tabs */}
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 border-b border-gray-200 overflow-x-auto shrink-0">
                <span className="text-xs font-semibold text-gray-500 mr-2">Trang tính:</span>
                {previewData.sheets.map((s, idx) => (
                  <button
                    key={s.name || idx}
                    type="button"
                    onClick={() => setActiveSheetIndex(idx)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      activeSheetIndex === idx
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    📊 {s.name || `Sheet ${idx + 1}`}
                  </button>
                ))}
              </div>

              {/* Sheet grid table */}
              <div className="flex-1 overflow-auto p-2">
                {(() => {
                  const currentRows = previewData.sheets[activeSheetIndex]?.data || [];
                  const maxCols = Math.max(1, ...currentRows.map(r => r.length));
                  return (
                    <table className="w-full border-collapse text-xs border border-gray-300">
                      <thead className="sticky top-0 z-10 bg-gray-100">
                        <tr>
                          <th className="w-10 px-2 py-1.5 border border-gray-300 bg-gray-200 text-gray-500 font-bold text-center text-[11px] select-none">
                            #
                          </th>
                          {Array.from({ length: maxCols }).map((_, colIdx) => (
                            <th
                              key={colIdx}
                              className="px-3 py-1.5 border border-gray-300 bg-gray-100 text-gray-700 font-bold text-center text-[11px] select-none min-w-[70px]"
                            >
                              {colIdx < 26
                                ? String.fromCharCode(65 + colIdx)
                                : `${String.fromCharCode(65 + Math.floor(colIdx / 26) - 1)}${String.fromCharCode(65 + (colIdx % 26))}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-blue-50/50">
                            <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-500 text-center font-bold select-none text-[10px]">
                              {rIdx + 1}
                            </td>
                            {Array.from({ length: maxCols }).map((_, cIdx) => {
                              const cell = row[cIdx];
                              return (
                                <td
                                  key={cIdx}
                                  className="px-3 py-1.5 border border-gray-300 text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
                                >
                                  {cell !== undefined && cell !== null ? String(cell) : ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          ) : previewData?.type === 'pptx' && previewData.slides && previewData.slides.length > 0 ? (
            <div className="w-full h-full overflow-auto p-4 space-y-4">
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center justify-between">
                <span>Trình xem trước tóm tắt Slide PowerPoint ({previewData.slides.length} trang)</span>
                {submission.storedPath && onOpenFileInOs && (
                  <button
                    type="button"
                    onClick={() => onOpenFileInOs(submission.storedPath!)}
                    className="font-bold underline cursor-pointer"
                  >
                    Bấm vào đây để mở trực tiếp bằng MS PowerPoint
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {previewData.slides.map((sl, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col min-h-[160px]"
                  >
                    <div className="flex items-center justify-between border-b pb-2 mb-2 text-xs font-bold text-gray-500">
                      <span>Trang {idx + 1}</span>
                      {sl.title && <span className="text-blue-700 font-semibold truncate max-w-[200px]">{sl.title}</span>}
                    </div>
                    <div className="text-xs text-gray-700 whitespace-pre-wrap flex-1 overflow-auto max-h-[140px]">
                      {sl.text || '(Slide không có văn bản hoặc chỉ có hình ảnh đồ họa)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : previewData?.type === 'text' && previewData.content ? (
            <div className="w-full h-full bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-800 whitespace-pre-wrap bg-gray-50/50 leading-relaxed">
                {previewData.content}
              </div>
            </div>
          ) : previewData?.type === 'error' ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md text-center">
              <span className="text-5xl mb-3">⚠️</span>
              <h4 className="text-base font-bold text-gray-800 mb-1">{submission.fileName}</h4>
              <p className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 mb-2 font-medium">
                {previewData.error || 'Không thể tạo bản xem trước trực tiếp trên web.'}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Bạn có thể mở tệp trực tiếp bằng phần mềm trên máy tính (Microsoft Word, Excel, PowerPoint...) hoặc tải về máy.
              </p>
              <div className="flex gap-2">
                {submission.storedPath && onOpenFileInOs && (
                  <button
                    type="button"
                    onClick={() => onOpenFileInOs(submission.storedPath!)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    🖥️ Mở trên máy tính
                  </button>
                )}
                <a
                  href={submission.downloadUrl}
                  download={submission.fileName}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  ⬇️ Tải file về
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md text-center">
              <span className="text-5xl mb-3">📁</span>
              <h4 className="text-base font-bold text-gray-800 mb-1">{submission.fileName}</h4>
              <p className="text-xs text-gray-500 mb-4">
                Định dạng tệp này không hỗ trợ hiển thị trực tiếp trong khung xem trước web. Bạn có thể mở trực tiếp
                bằng phần mềm trên máy tính hoặc tải về.
              </p>
              <div className="flex gap-2">
                {submission.storedPath && onOpenFileInOs && (
                  <button
                    type="button"
                    onClick={() => onOpenFileInOs(submission.storedPath!)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    🖥️ Mở trên máy tính
                  </button>
                )}
                <a
                  href={submission.downloadUrl}
                  download={submission.fileName}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  ⬇️ Tải file về
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
