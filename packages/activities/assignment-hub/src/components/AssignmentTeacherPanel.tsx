import React, { useState, useMemo } from 'react';
import type { AssignmentState, MaterialFile, StudentSubmission } from '../assignment-schemas.js';
import { AssignmentPreviewModal } from './AssignmentPreviewModal.js';

export interface AssignmentTeacherPanelProps {
  runId: string;
  state: AssignmentState;
  onSendIntent: (intent: unknown) => void;
  onEndActivity: () => void;
  onOpenFolderInOs?: (folderPath: string) => void;
  onOpenFileInOs?: (filePath: string) => void;
  totalParticipants?: number;
}

export const AssignmentTeacherPanel: React.FC<AssignmentTeacherPanelProps> = ({
  runId: _runId,
  state,
  onSendIntent,
  onEndActivity,
  onOpenFolderInOs,
  onOpenFileInOs,
  totalParticipants = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'missing'>('all');
  const [previewSubmission, setPreviewSubmission] = useState<StudentSubmission | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [materialUploadError, setMaterialUploadError] = useState<string | null>(null);

  const submissionsList = useMemo(() => {
    return Object.values(state.submissions || {});
  }, [state.submissions]);

  const submittedCount = submissionsList.length;
  const effectiveTotal = Math.max(totalParticipants, submittedCount);
  const completionRate =
    effectiveTotal > 0 ? Math.round((submittedCount / effectiveTotal) * 100) : 0;

  const totalBytes = useMemo(() => {
    return submissionsList.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  }, [submissionsList]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleToggleLock = () => {
    onSendIntent({
      type: 'toggle_lock',
      isLocked: !state.isLocked,
    });
  };

  const handleRemoveMaterial = (materialId: string) => {
    onSendIntent({
      type: 'remove_material',
      materialId,
    });
  };

  const handleOpenFolder = () => {
    if (state.targetDirectory) {
      if (onOpenFolderInOs) {
        onOpenFolderInOs(state.targetDirectory);
      } else {
        void fetch('/api/system/open-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: state.targetDirectory }),
        });
      }
    }
  };

  const handleOpenFile = (path: string) => {
    if (onOpenFileInOs) {
      onOpenFileInOs(path);
    } else {
      void fetch('/api/system/open-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    }
  };

  const handleUploadMaterialFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMaterial(true);
    setMaterialUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch(`/api/sessions/active/activities/current/assignment/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              mime: file.type || 'application/octet-stream',
              base64: base64Data,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            setMaterialUploadError(err.error || 'Lỗi khi tải file tài liệu');
            return;
          }

          const material = (await res.json()) as MaterialFile;
          onSendIntent({
            type: 'add_material',
            material,
          });
        } catch (err) {
          setMaterialUploadError(err instanceof Error ? err.message : 'Lỗi kết nối tải file');
        } finally {
          setIsUploadingMaterial(false);
          e.target.value = '';
        }
      };
      reader.onerror = () => {
        setMaterialUploadError('Không thể đọc file từ máy tính');
        setIsUploadingMaterial(false);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingMaterial(false);
      e.target.value = '';
    }
  };

  const filteredSubmissions = useMemo(() => {
    let list = submissionsList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        s => s.studentName.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [submissionsList, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 md:p-6 space-y-5 overflow-auto">
      {/* Top Banner Control */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📁</span>
            <h2 className="text-xl font-bold text-gray-800">
              {state.title || 'Thu - phát bài tập'}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                state.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {state.isLocked ? '🔒 Đã khóa cổng' : '🟢 Đang mở cổng nộp'}
            </span>
          </div>
          {state.instructions && (
            <p className="text-xs text-gray-500 max-w-2xl line-clamp-2">{state.instructions}</p>
          )}
          {state.targetDirectory && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 max-w-fit">
              <span className="font-semibold text-gray-700">📂 Thư mục lưu:</span>
              <span className="font-mono text-gray-800 truncate max-w-md">
                {state.targetDirectory}
              </span>
              <button
                type="button"
                onClick={handleOpenFolder}
                className="text-blue-600 hover:text-blue-800 font-semibold underline ml-1 cursor-pointer"
                title="Mở thư mục này trong Windows Explorer"
              >
                Mở thư mục
              </button>
            </div>
          )}
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
              state.isLocked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {state.isLocked ? '🔓 Mở lại cổng nộp' : '🔒 Khóa cổng nộp bài'}
          </button>

          <button
            type="button"
            onClick={onEndActivity}
            className="min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            🏁 Kết thúc thu bài
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Học sinh đã nộp</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-600">{submittedCount}</span>
            <span className="text-xs text-gray-400">/ {effectiveTotal}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Tỷ lệ nộp bài</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{completionRate}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Tổng dung lượng thu</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-600">
              {formatFileSize(totalBytes)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">Tài liệu đã phát</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-600">
              {state.materials?.length || 0}
            </span>
            <span className="text-xs text-gray-400">tệp</span>
          </div>
        </div>
      </div>

      {/* Materials Distribution Section */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h3 className="text-sm font-bold text-gray-800">Tài liệu phát xuống cho học sinh</h3>
            {state.materials && state.materials.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                {state.materials.length} tệp
              </span>
            )}
          </div>

          <label className="min-h-[38px] px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
            <span>➕</span>{' '}
            {isUploadingMaterial
              ? 'Đang tải lên...'
              : state.materials && state.materials.length > 0
                ? 'Phát thêm tài liệu'
                : 'Phát tài liệu cho học sinh'}
            <input
              type="file"
              onChange={handleUploadMaterialFile}
              disabled={isUploadingMaterial}
              className="hidden"
            />
          </label>
        </div>

        {materialUploadError && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
            {materialUploadError}
          </p>
        )}

        {state.materials && state.materials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {state.materials.map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl">📄</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate" title={m.name}>
                      {m.name}
                    </p>
                    <p className="text-[11px] text-gray-400">{formatFileSize(m.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={m.url}
                    download={m.name}
                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    title="Tải về"
                  >
                    ⬇️
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(m.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Xóa tài liệu này"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-blue-50/30 rounded-xl border border-dashed border-blue-200 text-center space-y-2.5">
            <span className="text-3xl">📤</span>
            <div>
              <p className="text-xs text-gray-700 font-semibold">
                Chưa có tài liệu nào được phát cho học sinh
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Bấm nút bên dưới để chọn file đề bài, hình ảnh hoặc tài liệu mẫu gửi ngay xuống màn
                hình tất cả học sinh.
              </p>
            </div>
            <label className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition">
              <span>➕</span>{' '}
              {isUploadingMaterial ? 'Đang tải lên...' : 'Chọn tệp phát cho học sinh'}
              <input
                type="file"
                onChange={handleUploadMaterialFile}
                disabled={isUploadingMaterial}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Submissions Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs flex-1 flex flex-col min-h-[350px] overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>📋</span> Danh sách bài nộp ({submissionsList.length})
            </h3>
            <div className="flex items-center gap-1 bg-gray-200/60 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('submitted')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === 'submitted'
                    ? 'bg-white text-gray-800 shadow-xs'
                    : 'text-gray-500'
                }`}
              >
                Đã nộp ({submittedCount})
              </button>
            </div>
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="🔍 Tìm tên học sinh hoặc tên file..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submissions Table */}
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>
              <strong>Cách xem trước bài làm:</strong> Bấm trực tiếp vào <strong>Tên tệp</strong>{' '}
              hoặc nút{' '}
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                👁️ Xem trước
              </span>{' '}
              ở cột Thao tác để xem ngay nội dung Word, Excel, PowerPoint, PDF, Ảnh.
            </span>
          </div>
          {state.targetDirectory && (
            <button
              type="button"
              onClick={handleOpenFolder}
              className="text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer shrink-0"
            >
              📂 Mở thư mục bài nộp trên máy
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-gray-100/75 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-4">Học sinh</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-4">Tên tệp nộp</th>
                <th className="py-2.5 px-3 text-right">Dung lượng</th>
                <th className="py-2.5 px-3 text-center">Thời gian nộp</th>
                <th className="py-2.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.participantId} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-gray-800">{sub.studentName}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          sub.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sub.status === 'late' ? 'Nộp trễ' : 'Đã nộp'}
                      </span>
                    </td>
                    <td
                      className="py-2.5 px-4 font-mono text-gray-700 truncate max-w-xs"
                      title={sub.fileName}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewSubmission(sub);
                          setIsPreviewOpen(true);
                        }}
                        className="text-left font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 cursor-pointer max-w-full truncate"
                        title="Bấm vào đây để xem trước bài nộp"
                      >
                        <span>📄</span>
                        <span className="truncate">{sub.fileName}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500 font-mono">
                      {formatFileSize(sub.fileSize)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-500 font-mono">
                      {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSubmission(sub);
                            setIsPreviewOpen(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          title="Xem trước nội dung file (Word, Excel, PPTX, PDF, Ảnh...)"
                        >
                          <span>👁️</span> Xem trước
                        </button>

                        {sub.storedPath && (
                          <button
                            type="button"
                            onClick={() => handleOpenFile(sub.storedPath!)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg border border-gray-300 transition-colors cursor-pointer flex items-center gap-1"
                            title="Mở bằng phần mềm trên máy tính GV (Word, Excel, PPT...)"
                          >
                            <span>🖥️</span> Mở máy
                          </button>
                        )}

                        <a
                          href={sub.downloadUrl}
                          download={sub.fileName}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors cursor-pointer"
                          title="Tải tệp này về máy tính"
                        >
                          ⬇️
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                    {searchQuery
                      ? 'Không tìm thấy học sinh nào phù hợp.'
                      : 'Chưa có học sinh nào nộp bài.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      <AssignmentPreviewModal
        submission={previewSubmission}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewSubmission(null);
        }}
        onOpenFileInOs={handleOpenFile}
      />
    </div>
  );
};
