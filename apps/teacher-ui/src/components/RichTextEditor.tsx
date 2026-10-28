import React, { useRef, useState } from 'react';
import type { RichText } from '@educlass/question-kit';
import {
  compressImage,
  extractImagesFromDataTransfer,
  fileToDataUrl,
  renderLatexInText,
  resolveAssetUrl,
} from '@educlass/question-kit';

export interface RichTextEditorProps {
  label?: string;
  value: RichText;
  onChange: (value: RichText) => void;
  placeholder?: string;
  testIdPrefix?: string;
  minRows?: number;
  required?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập văn bản, hỗ trợ KaTeX ($...$ hoặc $$...$$)...',
  testIdPrefix = 'richtext',
  minRows = 3,
  required = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = value.images ?? [];

  // Helper xử lý nén file ảnh và thêm vào danh sách
  const handleAddImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsCompressing(true);
    try {
      const newImages: string[] = [...images];
      for (const file of files) {
        const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
        const dataUrl = await fileToDataUrl(compressed.blob);
        newImages.push(dataUrl);
      }
      onChange({
        ...value,
        images: newImages,
      });
    } catch (err) {
      console.error('Lỗi khi xử lý nén ảnh:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Xử lý dán (Paste Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImagesFromDataTransfer(e.clipboardData);
    if (files.length > 0) {
      e.preventDefault();
      await handleAddImageFiles(files);
    }
  };

  // Xử lý kéo thả (Drag and drop)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = extractImagesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      await handleAddImageFiles(files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedImages = images.filter((_, idx) => idx !== indexToRemove);
    onChange({
      ...value,
      images: updatedImages,
    });
  };

  const hasMath =
    value.text.includes('$') || value.text.includes('\\(') || value.text.includes('\\[');

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`container-${testIdPrefix}`}
    >
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Ô nhập Text */}
      <textarea
        data-testid={`input-${testIdPrefix}-text`}
        value={value.text}
        rows={minRows}
        onChange={e => onChange({ ...value, text: e.target.value })}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 text-sm"
      />

      {/* KaTeX Live Preview */}
      {value.text.trim().length > 0 && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-2">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
            <span>Xem trước {hasMath && '(KaTeX)'}:</span>
          </div>
          <div
            data-testid={`preview-${testIdPrefix}-katex`}
            className="text-sm text-gray-800 break-words rich-content"
            dangerouslySetInnerHTML={{
              __html:
                renderLatexInText(value.text) || '<span class="text-gray-400 italic">Rỗng</span>',
            }}
          />
        </div>
      )}

      {/* Vùng đính kèm ảnh & Danh sách ảnh */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            data-testid={`file-input-${testIdPrefix}`}
            onChange={async e => {
              if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                await handleAddImageFiles(files);
              }
            }}
          />
          <button
            type="button"
            data-testid={`btn-upload-image-${testIdPrefix}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors min-h-[48px]"
          >
            <span>📷 {isCompressing ? 'Đang nén ảnh...' : 'Thêm / Dán ảnh'}</span>
          </button>
          <span className="text-xs text-gray-400 hidden sm:inline">
            (Có thể dán Ctrl+V hoặc kéo thả ảnh vào đây)
          </span>
        </div>

        {images.length > 0 && (
          <span className="text-xs text-gray-500">Đã đính kèm {images.length} ảnh</span>
        )}
      </div>

      {/* Danh sách ảnh đính kèm */}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((imgSrc, idx) => (
            <div
              key={idx}
              data-testid="image-thumbnail"
              className="relative group border border-gray-200 rounded-md overflow-hidden w-20 h-20 bg-gray-50 flex items-center justify-center"
            >
              <img
                src={resolveAssetUrl(imgSrc)}
                alt={`Ảnh ${idx + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              <button
                type="button"
                data-testid={`btn-remove-image-${testIdPrefix}-${idx}`}
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-1 text-xs min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-red-700 transition-colors"
                title="Xóa ảnh"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
