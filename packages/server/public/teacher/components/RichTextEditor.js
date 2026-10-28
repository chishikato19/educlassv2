import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { compressImage, extractImagesFromDataTransfer, fileToDataUrl, renderLatexInText, resolveAssetUrl, } from '@educlass/question-kit';
export const RichTextEditor = ({ label, value, onChange, placeholder = 'Nhập văn bản, hỗ trợ KaTeX ($...$ hoặc $$...$$)...', testIdPrefix = 'richtext', minRows = 3, required = false, }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef(null);
    const images = value.images ?? [];
    // Helper xử lý nén file ảnh và thêm vào danh sách
    const handleAddImageFiles = async (files) => {
        if (files.length === 0)
            return;
        setIsCompressing(true);
        try {
            const newImages = [...images];
            for (const file of files) {
                const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
                const dataUrl = await fileToDataUrl(compressed.blob);
                newImages.push(dataUrl);
            }
            onChange({
                ...value,
                images: newImages,
            });
        }
        catch (err) {
            console.error('Lỗi khi xử lý nén ảnh:', err);
        }
        finally {
            setIsCompressing(false);
        }
    };
    // Xử lý dán (Paste Ctrl+V)
    const handlePaste = async (e) => {
        const files = extractImagesFromDataTransfer(e.clipboardData);
        if (files.length > 0) {
            e.preventDefault();
            await handleAddImageFiles(files);
        }
    };
    // Xử lý kéo thả (Drag and drop)
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = extractImagesFromDataTransfer(e.dataTransfer);
        if (files.length > 0) {
            await handleAddImageFiles(files);
        }
    };
    const handleRemoveImage = (indexToRemove) => {
        const updatedImages = images.filter((_, idx) => idx !== indexToRemove);
        onChange({
            ...value,
            images: updatedImages,
        });
    };
    const hasMath = value.text.includes('$') || value.text.includes('\\(') || value.text.includes('\\[');
    return (_jsxs("div", { className: `border rounded-lg p-3 transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 bg-white'}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, "data-testid": `container-${testIdPrefix}`, children: [label && (_jsxs("label", { className: "block text-sm font-semibold text-gray-700 mb-1", children: [label, " ", required && _jsx("span", { className: "text-red-500", children: "*" })] })), _jsx("textarea", { "data-testid": `input-${testIdPrefix}-text`, value: value.text, rows: minRows, onChange: e => onChange({ ...value, text: e.target.value }), onPaste: handlePaste, placeholder: placeholder, className: "w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 text-sm" }), value.text.trim().length > 0 && (_jsxs("div", { className: "mt-2 bg-gray-50 border border-gray-200 rounded-md p-2", children: [_jsx("div", { className: "flex items-center justify-between text-xs font-medium text-gray-500 mb-1", children: _jsxs("span", { children: ["Xem tr\u01B0\u1EDBc ", hasMath && '(KaTeX)', ":"] }) }), _jsx("div", { "data-testid": `preview-${testIdPrefix}-katex`, className: "text-sm text-gray-800 break-words rich-content", dangerouslySetInnerHTML: {
                            __html: renderLatexInText(value.text) || '<span class="text-gray-400 italic">Rỗng</span>',
                        } })] })), _jsxs("div", { className: "mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "file", accept: "image/*", multiple: true, ref: fileInputRef, style: { display: 'none' }, "data-testid": `file-input-${testIdPrefix}`, onChange: async (e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const files = Array.from(e.target.files);
                                        await handleAddImageFiles(files);
                                    }
                                } }), _jsx("button", { type: "button", "data-testid": `btn-upload-image-${testIdPrefix}`, onClick: () => fileInputRef.current?.click(), disabled: isCompressing, className: "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors min-h-[48px]", children: _jsxs("span", { children: ["\uD83D\uDCF7 ", isCompressing ? 'Đang nén ảnh...' : 'Thêm / Dán ảnh'] }) }), _jsx("span", { className: "text-xs text-gray-400 hidden sm:inline", children: "(C\u00F3 th\u1EC3 d\u00E1n Ctrl+V ho\u1EB7c k\u00E9o th\u1EA3 \u1EA3nh v\u00E0o \u0111\u00E2y)" })] }), images.length > 0 && (_jsxs("span", { className: "text-xs text-gray-500", children: ["\u0110\u00E3 \u0111\u00EDnh k\u00E8m ", images.length, " \u1EA3nh"] }))] }), images.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: images.map((imgSrc, idx) => (_jsxs("div", { "data-testid": "image-thumbnail", className: "relative group border border-gray-200 rounded-md overflow-hidden w-20 h-20 bg-gray-50 flex items-center justify-center", children: [_jsx("img", { src: resolveAssetUrl(imgSrc), alt: `Ảnh ${idx + 1}`, className: "max-w-full max-h-full object-contain" }), _jsx("button", { type: "button", "data-testid": `btn-remove-image-${testIdPrefix}-${idx}`, onClick: () => handleRemoveImage(idx), className: "absolute top-0 right-0 bg-red-600 text-white rounded-bl p-1 text-xs min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-red-700 transition-colors", title: "X\u00F3a \u1EA3nh", children: "\u2715" })] }, idx))) }))] }));
};
//# sourceMappingURL=RichTextEditor.js.map