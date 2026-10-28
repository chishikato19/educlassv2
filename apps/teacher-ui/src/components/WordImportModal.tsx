import React, { useId, useState } from 'react';
import { renderLatexInText, resolveAssetUrl, type Question } from '@educlass/question-kit';
import { api } from '../api/client.js';

export interface WordImportWarning {
  questionIndex: number;
  questionNumberStr?: string | undefined;
  rawText: string;
  reason: string;
}

export interface WordParsedData {
  questions: Question[];
  warnings: WordImportWarning[];
  totalDetected: number;
  successCount: number;
}

export interface WordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadTemplate?: () => void;
  onParseDocx?: (file: File) => Promise<WordParsedData>;
  initialParsedResult?: WordParsedData | undefined;
  onSaveQuestions: (data: {
    setInfo: { title: string; subject: string; grade: number; tags: string[] };
    questions: Question[];
  }) => Promise<void> | void;
}

export const WordImportModal: React.FC<WordImportModalProps> = ({
  isOpen,
  onClose,
  onDownloadTemplate,
  onParseDocx,
  initialParsedResult,
  onSaveQuestions,
}) => {
  const [parsedData, setParsedData] = useState<WordParsedData | null>(initialParsedResult ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form thông tin bộ đề khi lưu
  const [setTitle, setSetTitle] = useState('Đề thi nhập từ Word');
  const [setSubject, setSetSubject] = useState('Toán');
  const [setGrade, setSetGrade] = useState(12);
  const [setTags, setSetTags] = useState('Nhập từ Word');

  const fileInputId = useId();

  if (!isOpen) return null;

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64 ?? '');
        };
        reader.onerror = () => reject(new Error('Không thể đọc file từ thiết bị'));
        reader.readAsDataURL(file);
      } else {
        // Fallback môi trường Node / Vitest
        file
          .arrayBuffer()
          .then(buf => {
            if (typeof Buffer !== 'undefined') {
              resolve(Buffer.from(buf).toString('base64'));
            } else {
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]!);
              }
              resolve(window.btoa(binary));
            }
          })
          .catch(reject);
      }
    });
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMessage('Vui lòng chọn tập tin Microsoft Word định dạng .docx');
      return;
    }

    const rawName = file.name.replace(/\.[^/.]+$/, '');
    setSetTitle(rawName);

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (onParseDocx) {
        const result = await onParseDocx(file);
        setParsedData(result);
      } else {
        await api.ensureAuthenticated?.();
        const base64 = await readFileAsBase64(file);
        const data = await api.importWord<WordParsedData>(base64);
        setParsedData(data);
      }
    } catch (err: unknown) {
      let msg = 'Có lỗi khi đọc và phân tích file Word. Vui lòng kiểm tra lại định dạng file.';
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message);
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleUpdateMcqCorrect = (qIndex: number, correctOptionIndex: number) => {
    if (!parsedData) return;
    const updated = [...parsedData.questions];
    const targetQ = updated[qIndex];
    if (targetQ && targetQ.type === 'mcq4') {
      updated[qIndex] = {
        ...targetQ,
        correct: correctOptionIndex as 0 | 1 | 2 | 3,
      };
      setParsedData({ ...parsedData, questions: updated });
    }
  };

  const handleUpdateTfGroupItemCorrect = (
    qIndex: number,
    itemIndex: number,
    newCorrect: boolean
  ) => {
    if (!parsedData) return;
    const updated = [...parsedData.questions];
    const targetQ = updated[qIndex];
    if (targetQ && targetQ.type === 'tf_group') {
      const itemsCopy = [...targetQ.items] as typeof targetQ.items;
      const curItem = itemsCopy[itemIndex];
      if (curItem) {
        itemsCopy[itemIndex] = {
          ...curItem,
          correct: newCorrect,
        };
        updated[qIndex] = {
          ...targetQ,
          items: itemsCopy,
        };
        setParsedData({ ...parsedData, questions: updated });
      }
    }
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (!parsedData) return;
    const updated = parsedData.questions.filter((_, idx) => idx !== qIndex);
    setParsedData({
      ...parsedData,
      questions: updated,
      successCount: updated.length,
    });
  };

  const handleSave = async () => {
    if (!parsedData || parsedData.questions.length === 0) {
      setErrorMessage('Không có câu hỏi nào để lưu.');
      return;
    }

    const tagsArray = setTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      await onSaveQuestions({
        setInfo: {
          title: setTitle.trim() || 'Đề thi nhập từ Word',
          subject: setSubject.trim() || 'Toán',
          grade: setGrade,
          tags: tagsArray,
        },
        questions: parsedData.questions,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi khi lưu câu hỏi');
    }
  };

  const handleDownloadTemplate = () => {
    if (onDownloadTemplate) {
      onDownloadTemplate();
      return;
    }
    fetch('/api/question-sets/templates/word')
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải file mẫu');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'de-thi-mau-educlass.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open('/api/question-sets/templates/word', '_blank');
      });
  };

  return (
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
        overflowY: 'auto',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '960px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
              Nhập đề thi từ file Word (.docx)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
              Hỗ trợ tự động chuyển công thức toán OMML sang LaTeX, trích xuất hình ảnh CAS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              fontWeight: 700,
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                color: '#B91C1C',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Giai đoạn 1: Chưa tải file */}
          {!parsedData && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Hướng dẫn & Tải file mẫu */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '13px', color: '#1E293B' }}>
                  <p style={{ fontWeight: 700, color: '#1E40AF', margin: '0 0 8px 0' }}>
                    Quy ước định dạng Word chuẩn:
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '18px',
                      color: '#475569',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <li>
                      Câu hỏi bắt đầu bằng: <code>Câu 1:</code>, <code>Câu 2.</code>,{' '}
                      <code>Question 1:</code>...
                    </li>
                    <li>
                      <strong>Trắc nghiệm 4 lựa chọn (A, B, C, D):</strong> Đánh dấu đáp án đúng
                      bằng một trong các cách:
                      <ul style={{ paddingLeft: '16px', margin: '2px 0', listStyleType: 'circle' }}>
                        <li>
                          Gạch chân đáp án đúng:{' '}
                          <code>
                            <u>A.</u>
                          </code>{' '}
                          hoặc{' '}
                          <code>
                            <u>Nội dung</u>
                          </code>
                        </li>
                        <li>
                          Đánh dấu sao đằng trước: <code>*B.</code> hoặc <code>* B.</code>
                        </li>
                        <li>
                          Bôi đậm phương án đúng:{' '}
                          <code>
                            <b>C.</b>
                          </code>
                        </li>
                        <li>
                          Bôi màu / Highlight phương án đúng bằng công cụ bút nhớ dòng trong Word
                        </li>
                        <li>
                          Kèm dòng <code>Đáp án: D</code> ở cuối câu hỏi
                        </li>
                      </ul>
                    </li>
                    <li>
                      <strong>Đúng/Sai theo nhóm (4 ý a, b, c, d chuẩn BGD 2025):</strong> các ý{' '}
                      <code>a)</code>, <code>b)</code>, <code>c)</code>, <code>d)</code> kèm nhãn{' '}
                      <code>[Đúng]</code> hoặc <code>[Sai]</code> (hoặc <code>(Đ)</code>,{' '}
                      <code>(S)</code>).
                    </li>
                    <li>
                      <strong>Đúng/Sai đơn lẻ:</strong> câu phát biểu kèm dòng{' '}
                      <code>Đáp án: Đúng</code> hoặc <code>Đáp án: Sai</code>.
                    </li>
                    <li>
                      <strong>Trả lời ngắn:</strong> câu hỏi kèm dòng{' '}
                      <code>Đáp án: [kết quả số hoặc chữ]</code>.
                    </li>
                    <li>
                      <strong>Hình ảnh &amp; Công thức:</strong> Hỗ trợ chèn hình ảnh minh họa trực
                      tiếp ở câu hỏi và đáp án; hỗ trợ công thức toán học Word (OMML/Equation).
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  data-testid="btn-download-word-template"
                  onClick={handleDownloadTemplate}
                  style={{
                    minHeight: '44px',
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #2563EB',
                    borderRadius: '8px',
                    color: '#2563EB',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  📥 Tải file Word mẫu
                </button>
              </div>

              {/* Khung tải file */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragOver ? '2px dashed #3B82F6' : '2px dashed #CBD5E1',
                  backgroundColor: isDragOver ? '#EFF6FF' : '#F8FAFC',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                <input
                  id={fileInputId}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  data-testid="input-file-word"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor={fileInputId}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '48px', lineHeight: 1 }}>📄</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#2563EB' }}>
                    Bấm để chọn file .docx hoặc kéo thả file vào đây
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>
                    Chỉ hỗ trợ file định dạng Microsoft Word (.docx)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Trạng thái Loading */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
              <p className="text-gray-700 font-medium">
                Đang đọc tài liệu Word, chuyển đổi công thức toán OMML sang LaTeX và trích xuất hình
                ảnh...
              </p>
            </div>
          )}

          {/* Giai đoạn 2: Màn xem trước & Sửa lỗi */}
          {parsedData && !isLoading && (
            <div className="space-y-6">
              {/* Thống kê kết quả */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">Kết quả phân tích:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Hợp lệ: {parsedData.successCount}/{parsedData.totalDetected} câu (
                      {Math.round(
                        (parsedData.successCount / (parsedData.totalDetected || 1)) * 100
                      )}
                      %)
                    </span>
                    {parsedData.warnings.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        {parsedData.warnings.length} cảnh báo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Thầy/cô có thể kiểm tra và sửa nhanh đáp án trực tiếp bên dưới trước khi bấm
                    lưu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="min-h-[44px] px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border rounded bg-white hover:bg-gray-50"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Danh sách cảnh báo nếu có */}
              {parsedData.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase">
                    ⚠️ Các câu hỏi cần lưu ý / không thể tự động nhận diện:
                  </h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    {parsedData.warnings.map((w, idx) => (
                      <li key={idx}>
                        • <strong>Câu {w.questionNumberStr ?? idx + 1}:</strong> {w.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form thông tin bộ đề */}
              <div className="p-4 border rounded-lg bg-white space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800">Thông tin bộ đề thi mới:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tiêu đề bộ đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={setTitle}
                      onChange={e => setSetTitle(e.target.value)}
                      data-testid="input-word-set-title"
                      className="w-full min-h-[44px] px-3 py-2 border rounded-md text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Môn học
                      </label>
                      <input
                        type="text"
                        value={setSubject}
                        onChange={e => setSetSubject(e.target.value)}
                        className="w-full min-h-[44px] px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Khối lớp
                      </label>
                      <select
                        value={setGrade}
                        onChange={e => setSetGrade(Number(e.target.value))}
                        className="w-full min-h-[44px] px-3 py-2 border rounded-md text-sm bg-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <option key={g} value={g}>
                            Lớp {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Thẻ phân loại
                  </label>
                  <input
                    type="text"
                    value={setTags}
                    onChange={e => setSetTags(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Danh sách câu hỏi xem trước và sửa lỗi */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-800">
                  Danh sách câu hỏi hợp lệ ({parsedData.questions.length} câu):
                </h3>

                {parsedData.questions.map((q, qIndex) => (
                  <div
                    key={q.id ?? qIndex}
                    className="p-4 border rounded-lg bg-white shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-blue-800">Câu {qIndex + 1}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {q.type === 'mcq4'
                            ? 'Trắc nghiệm 4 lựa chọn'
                            : q.type === 'tf_group'
                              ? 'Đúng/Sai 4 ý (BGD)'
                              : q.type === 'short'
                                ? 'Trả lời ngắn'
                                : 'Đúng/Sai đơn'}
                        </span>
                        <span className="text-xs text-gray-500">{q.points} điểm</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="text-xs text-red-600 hover:text-red-800 p-1"
                        title="Xóa câu này"
                      >
                        Xóa câu
                      </button>
                    </div>

                    {/* Nội dung câu dẫn */}
                    <div
                      className="text-sm text-gray-800 leading-relaxed font-medium overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: renderLatexInText(q.stem.text),
                      }}
                    />

                    {/* Hình ảnh đính kèm câu hỏi dẫn nếu có */}
                    {q.stem.images && q.stem.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 my-2">
                        {q.stem.images.map((img, i) => (
                          <img
                            key={i}
                            src={resolveAssetUrl(img)}
                            alt={`Ảnh minh họa câu ${qIndex + 1}`}
                            className="max-h-52 rounded-lg border border-gray-200 object-contain bg-white shadow-xs"
                          />
                        ))}
                      </div>
                    )}

                    {/* Câu hỏi MCQ4: chọn đáp án đúng */}
                    {q.type === 'mcq4' && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-gray-500">Chọn đáp án đúng:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIndex) => (
                            <label
                              key={optIndex}
                              className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-sm ${
                                q.correct === optIndex
                                  ? 'border-green-500 bg-green-50/50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correct === optIndex}
                                onChange={() => handleUpdateMcqCorrect(qIndex, optIndex)}
                                data-testid={`radio-correct-${qIndex}-${optIndex}`}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-1">
                                  <span className="font-bold">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  {opt.text && (
                                    <span
                                      className="overflow-x-auto"
                                      dangerouslySetInnerHTML={{
                                        __html: renderLatexInText(opt.text),
                                      }}
                                    />
                                  )}
                                </div>
                                {opt.images && opt.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-1.5 ml-4">
                                    {opt.images.map((img, imgIdx) => (
                                      <img
                                        key={imgIdx}
                                        src={resolveAssetUrl(img)}
                                        alt={`Ảnh phương án ${String.fromCharCode(65 + optIndex)}`}
                                        className="max-h-36 rounded border border-gray-200 object-contain bg-white shadow-xs"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Câu hỏi TF Group: 4 ý a, b, c, d */}
                    {q.type === 'tf_group' && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-gray-500">
                          Xét tính Đúng/Sai của từng ý:
                        </p>
                        <div className="space-y-2">
                          {q.items.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded border border-gray-100 bg-gray-50/50 text-sm"
                            >
                              <div className="flex-1">
                                <span className="font-bold mr-1">
                                  {String.fromCharCode(97 + itemIndex)})
                                </span>
                                <span
                                  className="overflow-x-auto"
                                  dangerouslySetInnerHTML={{
                                    __html: renderLatexInText(item.text.text),
                                  }}
                                />
                                {item.text.images && item.text.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-1.5 ml-4">
                                    {item.text.images.map((img, imgIdx) => (
                                      <img
                                        key={imgIdx}
                                        src={resolveAssetUrl(img)}
                                        alt={`Ảnh ý ${String.fromCharCode(97 + itemIndex)}`}
                                        className="max-h-32 rounded border border-gray-200 object-contain bg-white shadow-xs"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateTfGroupItemCorrect(qIndex, itemIndex, true)
                                  }
                                  className={`px-3 py-1 rounded text-xs font-bold min-h-[36px] ${
                                    item.correct
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Đúng
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateTfGroupItemCorrect(qIndex, itemIndex, false)
                                  }
                                  className={`px-3 py-1 rounded text-xs font-bold min-h-[36px] ${
                                    !item.correct
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Sai
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Câu hỏi Short Answer */}
                    {q.type === 'short' && (
                      <div className="pt-2 text-sm">
                        <span className="text-xs font-semibold text-gray-500 mr-2">
                          Đáp án chấp nhận:
                        </span>
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-900 font-mono font-bold">
                          {q.accepted.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Đóng
          </button>
          {parsedData && (
            <button
              type="button"
              data-testid="btn-save-word-questions"
              onClick={handleSave}
              className="min-h-[48px] px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              Lưu vào Ngân hàng đề ({parsedData.questions.length} câu)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
