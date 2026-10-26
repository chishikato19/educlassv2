import React, { useId, useMemo, useRef, useState } from 'react';
import type { EduclassPackage } from '@educlass/protocol';
import type { Question } from '@educlass/question-kit';
import { WordImportModal } from './WordImportModal.js';
import { MatrixImportModal } from './MatrixImportModal.js';
import type { QuestionSetItem } from '../api/client.js';
export type { QuestionSetItem };

export interface QuestionBankTabProps {
  questionSets: QuestionSetItem[];
  isLoading?: boolean | undefined;
  onRefresh?: (() => void) | undefined;
  onCreateQuestionSet: (data: {
    title: string;
    subject: string;
    grade: number;
    tags: string[];
  }) => Promise<void> | void;
  onUpdateQuestionSet?: (
    id: string,
    data: { title?: string; subject?: string; grade?: number; tags?: string[] },
  ) => Promise<void> | void;
  onDeleteQuestionSet: (id: string) => Promise<void> | void;
  onCloneQuestionSet: (id: string, newTitle?: string) => Promise<void> | void;
  onExportQuestionSet: (id: string) => Promise<void> | void;
  onImportQuestionSet: (pkg: EduclassPackage) => Promise<void> | void;
  onOpenQuestionEditor?: ((questionSet: QuestionSetItem) => void) | undefined;
  onImportWordQuestions?: ((data: {
    setInfo: { title: string; subject: string; grade: number; tags: string[] };
    questions: Question[];
  }) => Promise<void> | void) | undefined;
}


export const QuestionBankTab: React.FC<QuestionBankTabProps> = ({
  questionSets,
  isLoading = false,
  onRefresh,
  onCreateQuestionSet,
  onDeleteQuestionSet,
  onCloneQuestionSet,
  onExportQuestionSet,
  onImportQuestionSet,
  onOpenQuestionEditor,
  onImportWordQuestions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form tạo bộ đề
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Toán');
  const [formGrade, setFormGrade] = useState<number>(12);
  const [formTags, setFormTags] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();
  const fileInputId = useId();

  // Danh sách tags duy nhất
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const qs of questionSets) {
      for (const t of qs.tags) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set);
  }, [questionSets]);

  // Bộ lọc
  const filteredSets = useMemo(() => {
    return questionSets.filter((qs) => {
      // Tìm kiếm theo từ khóa
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchTitle = qs.title.toLowerCase().includes(term);
        const matchSubject = qs.subject.toLowerCase().includes(term);
        if (!matchTitle && !matchSubject) return false;
      }
      // Lọc theo tag
      if (selectedTag) {
        if (!qs.tags.includes(selectedTag)) return false;
      }
      return true;
    });
  }, [questionSets, searchTerm, selectedTag]);

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormSubject('Toán');
    setFormGrade(12);
    setFormTags('');
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setErrorMessage(null);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề bộ đề');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await onCreateQuestionSet({
        title: formTitle.trim(),
        subject: formSubject.trim(),
        grade: formGrade,
        tags: tagsArray,
      });
      handleCloseCreateModal();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi tạo bộ đề');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as EduclassPackage;
      await onImportQuestionSet(parsed);
    } catch (err: unknown) {
      alert(
        'Không thể nhập file .educlass: ' +
          (err instanceof Error ? err.message : 'Định dạng file không đúng'),
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadWordTemplate = async () => {
    try {
      const res = await fetch('/api/question-sets/templates/word');
      if (!res.ok) {
        throw new Error(`Máy chủ báo lỗi ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'de-thi-mau-educlass.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open('/api/question-sets/templates/word', '_blank');
    }
  };

  const handleSaveWordQuestions = async (data: {
    setInfo: { title: string; subject: string; grade: number; tags: string[] };
    questions: Question[];
  }) => {
    if (onImportWordQuestions) {
      await onImportWordQuestions(data);
    } else {
      await onCreateQuestionSet(data.setInfo);
    }
    setIsWordModalOpen(false);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Tiêu đề & thanh công cụ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ngân hàng đề thi & Bộ câu hỏi</h1>
          <p className="text-sm text-gray-500">
            Quản lý, tạo mới, phân loại theo thẻ, xuất/nhập gói .educlass ngoại tuyến 100%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút nhập file .educlass */}
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept=".educlass,application/json"
            style={{ display: 'none' }}
            data-testid="input-import-educlass"
            onChange={handleFileChange}
          />
          <label
            htmlFor={fileInputId}
            data-testid="btn-import-educlass"
            className="cursor-pointer inline-flex items-center justify-center min-h-[48px] px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            📥 Nhập file .educlass
          </label>

          {/* Nút nhập file Word */}
          <button
            type="button"
            data-testid="btn-open-word-import"
            onClick={() => setIsWordModalOpen(true)}
            className="min-h-[48px] px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 inline-flex items-center gap-1.5"
          >
            📄 Nhập từ Word (.docx)
          </button>

          {/* Nút bốc từ Ngân hàng (Ma trận) */}
          <button
            type="button"
            data-testid="btn-open-matrix-import"
            onClick={() => setIsMatrixModalOpen(true)}
            className="min-h-[48px] px-4 py-2 border border-purple-600 rounded-md shadow-sm text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            🎯 Bốc từ Ngân hàng (Ma trận)
          </button>

          {/* Nút tạo bộ đề mới */}
          <button
            type="button"
            data-testid="btn-open-create-set"
            onClick={handleOpenCreateModal}
            className="min-h-[48px] px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            ➕ Tạo bộ đề mới
          </button>
        </div>
      </div>

      {/* Tìm kiếm & Thẻ phân loại */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              id={searchInputId}
              type="text"
              placeholder="Tìm kiếm bộ đề, môn học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-question-sets"
              className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="min-h-[48px] px-3 text-sm text-gray-500 hover:text-gray-700"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Thanh lọc theo Tag */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Thẻ:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`min-h-[40px] px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTag === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                data-testid={`tag-filter-${tag}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`min-h-[40px] px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏷️ {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trạng thái tải danh sách */}
      {isLoading && (
        <div className="py-12 text-center text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full mb-2" />
          <p>Đang tải danh sách bộ đề...</p>
        </div>
      )}

      {/* Trạng thái danh sách rỗng */}
      {!isLoading && filteredSets.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-lg p-8 bg-white">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="text-base font-semibold text-gray-900">
            {questionSets.length === 0
              ? 'Chưa có bộ câu hỏi nào'
              : 'Không tìm thấy bộ đề phù hợp với bộ lọc'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto mb-5">
            {questionSets.length === 0
              ? 'Bắt đầu bằng cách tạo bộ đề mới hoặc nhập gói đề từ file Word hay .educlass.'
              : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn thẻ phân loại khác.'}
          </p>
          {questionSets.length === 0 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsWordModalOpen(true)}
                className="min-h-[44px] px-4 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 inline-flex items-center gap-1.5 shadow-sm"
              >
                📄 Nhập từ Word (.docx)
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="min-h-[44px] px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm inline-flex items-center gap-1.5"
              >
                ➕ Tạo bộ đề mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lưới danh sách các bộ đề */}
      {!isLoading && filteredSets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((qs) => (
            <div
              key={qs.id}
              className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {qs.subject} • Lớp {qs.grade}
                    </span>
                    {qs.tags.some((t) => t.toLowerCase().includes('ma trận')) && (
                      <span
                        data-testid={`badge-matrix-${qs.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200"
                      >
                        🎯 Ma trận
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {qs.questionCount} câu hỏi
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={qs.title}>
                  {qs.title}
                </h3>

                {/* Danh sách Tags */}
                {qs.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {qs.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Các nút hành động */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid={`btn-edit-questions-${qs.id}`}
                  onClick={() => onOpenQuestionEditor?.(qs)}
                  className="min-h-[44px] px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
                  title="Chỉnh sửa danh sách câu hỏi và đáp án"
                >
                  ✏️ Soạn / Chỉnh sửa câu hỏi
                </button>

                <div className="flex items-center gap-1">
                  {/* Nhân bản */}
                  <button
                    type="button"
                    data-testid={`btn-clone-${qs.id}`}
                    onClick={() => onCloneQuestionSet(qs.id)}
                    title="Nhân bản bộ đề"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded"
                  >
                    📋
                  </button>

                  {/* Xuất file */}
                  <button
                    type="button"
                    data-testid={`btn-export-${qs.id}`}
                    onClick={() => onExportQuestionSet(qs.id)}
                    title="Xuất file .educlass"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded"
                  >
                    💾
                  </button>

                  {/* Xóa */}
                  <button
                    type="button"
                    data-testid={`btn-delete-${qs.id}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Bạn có chắc chắn muốn xóa bộ đề "${qs.title}" không?\nTất cả câu hỏi và hình ảnh trong bộ đề này sẽ bị xóa khỏi hệ thống.`,
                        )
                      ) {
                        onDeleteQuestionSet(qs.id);
                      }
                    }}
                    title="Xóa bộ đề"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal tạo mới bộ đề */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCreateModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              boxSizing: 'border-box',
            }}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Tạo bộ câu hỏi mới</h2>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề bộ đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiểm tra 1 tiết Học kỳ 1"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  data-testid="input-set-title"
                  className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                  <input
                    type="text"
                    required
                    placeholder="Toán, Vật lý..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    data-testid="input-set-subject"
                    className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(Number(e.target.value))}
                    data-testid="select-set-grade"
                    className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thẻ phân loại (cách nhau bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Giải tích, Chương 1, Khảo sát hàm số"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  data-testid="input-set-tags"
                  className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="min-h-[48px] px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-create-set"
                  className="min-h-[48px] px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Tạo bộ đề
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nhập câu hỏi từ Word */}
      <WordImportModal
        isOpen={isWordModalOpen}
        onClose={() => setIsWordModalOpen(false)}
        onDownloadTemplate={handleDownloadWordTemplate}
        onSaveQuestions={handleSaveWordQuestions}
      />

      {/* Modal bốc câu hỏi theo Ma trận */}
      {isMatrixModalOpen && (
        <MatrixImportModal
          isOpen={isMatrixModalOpen}
          onClose={() => setIsMatrixModalOpen(false)}
          onSuccess={async () => {
            if (onRefresh) {
              await onRefresh();
            }
          }}
        />
      )}
    </div>
  );
};
