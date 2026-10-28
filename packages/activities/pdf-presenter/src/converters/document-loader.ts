import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { paginateHtmlContent, createSampleExerciseDocument } from './docx-converter.js';

export interface LoadedDocumentResult {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx';
  fileUrl: string;
  totalPages: number;
  pageImages: string[];
  docxHtml?: string;
  pageSize?: { width: number; height: number };
}

export const BASE_PAGE_WIDTH = 800;
export const BASE_PAGE_HEIGHT = 1130;

/**
 * Thiết lập workerSrc cho PDF.js chạy hoàn toàn offline trên origin hiện tại
 */
function ensurePdfWorkerConfigured(): void {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const basePath = pathname.includes('/teacher') ? `${origin}/teacher/` : `${origin}/`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}pdf.worker.mjs`;
      }
    } catch {
      // Giữ nguyên nếu không thể lấy origin
    }
  }
}

/**
 * Render chuỗi HTML của một trang tài liệu Word hoặc đề mẫu trực tiếp lên Canvas 2D
 * Hoàn toàn KHÔNG dùng SVG foreignObject (tránh lỗi Canvas Tainting / SecurityError trong Chromium)
 */
export async function renderHtmlToCanvas(
  html: string,
  width = BASE_PAGE_WIDTH,
  height = BASE_PAGE_HEIGHT
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Nền trắng A4
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Viền trang nhạt
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  const paddingX = 48;
  const paddingTop = 44;
  const paddingBottom = 48;
  const contentWidth = width - paddingX * 2; // 800 - 96 = 704px
  let cursorY = paddingTop;

  // Phân tích HTML bằng DOMParser
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  if (!parser) return canvas;

  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild || doc.body;

  const context = ctx;

  // Hàm ngắt dòng và vẽ văn bản đa dòng
  function drawWrappedText(
    text: string,
    font: string,
    color: string,
    lineHeight: number,
    indent = 0,
    align: 'left' | 'center' = 'left'
  ) {
    if (!text.trim()) return;
    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'top';

    const maxLineW = contentWidth - indent;
    const paragraphs = text.split('\n');

    for (const p of paragraphs) {
      if (!p.trim()) {
        cursorY += lineHeight * 0.5;
        continue;
      }

      const words = p.split(/\s+/);
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i] ?? '';
        if (!word) continue;

        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = context.measureText(testLine).width;

        if (testWidth > maxLineW && currentLine) {
          const drawX =
            align === 'center'
              ? paddingX + indent + (maxLineW - context.measureText(currentLine).width) / 2
              : paddingX + indent;

          if (cursorY + lineHeight <= height - paddingBottom) {
            context.fillText(currentLine, drawX, cursorY);
          }
          cursorY += lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        const drawX =
          align === 'center'
            ? paddingX + indent + (maxLineW - context.measureText(currentLine).width) / 2
            : paddingX + indent;

        if (cursorY + lineHeight <= height - paddingBottom) {
          context.fillText(currentLine, drawX, cursorY);
        }
        cursorY += lineHeight;
      }
    }
  }

  // Duyệt qua các node con
  const nodes = Array.from(root.children);
  const elements = nodes.length > 0 ? nodes : [root];

  for (const el of elements) {
    if (cursorY >= height - paddingBottom) break;

    const tag = el.tagName ? el.tagName.toLowerCase() : 'p';
    const text = el.textContent || '';

    if (tag === 'h1') {
      cursorY += 8;
      drawWrappedText(
        text,
        'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '#0F172A',
        28,
        0,
        'center'
      );
      cursorY += 10;
    } else if (tag === 'h2') {
      cursorY += 6;
      drawWrappedText(
        text,
        'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '#1E293B',
        24,
        0
      );
      cursorY += 6;
    } else if (tag === 'h3') {
      cursorY += 4;
      drawWrappedText(
        text,
        'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '#334155',
        22,
        0
      );
      cursorY += 4;
    } else if (tag === 'img') {
      const src = (el as HTMLImageElement).getAttribute('src') || '';
      if (src) {
        try {
          const img = new Image();
          await new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          });

          if (img.width > 0 && img.height > 0) {
            const maxW = contentWidth * 0.85;
            const maxH = 260;
            const scale = Math.min(1, maxW / img.width, maxH / img.height);
            const renderW = Math.round(img.width * scale);
            const renderH = Math.round(img.height * scale);

            if (cursorY + renderH <= height - paddingBottom) {
              const imgX = paddingX + Math.round((contentWidth - renderW) / 2);
              ctx.drawImage(img, imgX, cursorY, renderW, renderH);
              cursorY += renderH + 12;
            }
          }
        } catch {
          // Bỏ qua nếu ảnh lỗi
        }
      }
    } else if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length > 0) {
        cursorY += 6;
        for (const row of rows) {
          if (cursorY >= height - paddingBottom) break;
          const cells = Array.from(row.querySelectorAll('td, th'));
          if (cells.length === 0) continue;

          const colW = contentWidth / cells.length;
          const rowH = 30;

          for (let cIdx = 0; cIdx < cells.length; cIdx++) {
            const cell = cells[cIdx];
            if (!cell) continue;
            const cellX = paddingX + cIdx * colW;
            const isTh = cell.tagName.toLowerCase() === 'th';

            ctx.fillStyle = isTh ? '#F1F5F9' : '#FFFFFF';
            ctx.fillRect(cellX, cursorY, colW, rowH);

            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 1;
            ctx.strokeRect(cellX, cursorY, colW, rowH);

            ctx.fillStyle = isTh ? '#0F172A' : '#1E293B';
            ctx.font = isTh ? 'bold 12.5px system-ui' : '12.5px system-ui';
            ctx.textBaseline = 'middle';
            const cellText = (cell.textContent || '').trim();
            ctx.fillText(cellText, cellX + 8, cursorY + rowH / 2, colW - 16);
          }
          cursorY += rowH;
        }
        cursorY += 8;
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const lis = Array.from(el.querySelectorAll('li'));
      for (let lIdx = 0; lIdx < lis.length; lIdx++) {
        if (cursorY >= height - paddingBottom) break;
        const li = lis[lIdx];
        if (!li) continue;
        const liText = li.textContent || '';
        const bullet = tag === 'ol' ? `${lIdx + 1}. ` : '• ';

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText(bullet, paddingX + 8, cursorY);

        drawWrappedText(
          liText,
          '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '#1E293B',
          22,
          24
        );
        cursorY += 4;
      }
    } else {
      const childImg = el.querySelector('img');
      if (childImg) {
        const src = childImg.getAttribute('src') || '';
        if (src) {
          try {
            const img = new Image();
            await new Promise<void>(resolve => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            });
            if (img.width > 0 && img.height > 0) {
              const maxW = contentWidth * 0.85;
              const maxH = 260;
              const scale = Math.min(1, maxW / img.width, maxH / img.height);
              const renderW = Math.round(img.width * scale);
              const renderH = Math.round(img.height * scale);
              if (cursorY + renderH <= height - paddingBottom) {
                const imgX = paddingX + Math.round((contentWidth - renderW) / 2);
                ctx.drawImage(img, imgX, cursorY, renderW, renderH);
                cursorY += renderH + 12;
              }
            }
          } catch {
            // Bỏ qua lỗi vẽ ảnh nhúng
          }
        }
      }

      const isBold = el.querySelector('strong, b') !== null || text.trim().startsWith('Câu ');
      const font = isBold
        ? '600 14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      drawWrappedText(text, font, '#1E293B', 22, 0);
      cursorY += 6;
    }
  }

  // Đường kẻ Footer A4 mảnh
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, height - 32);
  ctx.lineTo(width - paddingX, height - 32);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('EduClass v2 • Chiếu & Chữa bài', paddingX, height - 24);

  return canvas;
}

/**
 * Đọc file PDF thực tế qua PDF.js và kết xuất ảnh bitmap từng trang A4
 */
export async function loadPdfPages(
  data: ArrayBuffer | Uint8Array,
  title: string
): Promise<LoadedDocumentResult> {
  ensurePdfWorkerConfigured();

  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = Math.max(1, pdfDoc.numPages);
  const pageImages: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = BASE_PAGE_WIDTH / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = BASE_PAGE_WIDTH;
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
    }
  }

  return {
    id: `doc-${Date.now()}`,
    title,
    fileType: 'pdf',
    fileUrl: '#pdf',
    totalPages: numPages,
    pageImages,
    pageSize: { width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT },
  };
}

/**
 * Đọc file Word (.docx) thực tế qua Mammoth và chuyển đổi thành các trang chuẩn
 */
export async function loadDocxPages(
  data: ArrayBuffer,
  title: string
): Promise<LoadedDocumentResult> {
  let html = '';
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: data });
    html = result.value;
  } catch (err) {
    console.error('Lỗi khi đọc file docx qua mammoth:', err);
    html = `<p>Không thể trích xuất nội dung file Word. Vui lòng kiểm tra lại file.</p>`;
  }

  const pagination = paginateHtmlContent(html);
  const pageImages: string[] = [];

  for (const page of pagination.pages) {
    const canvas = await renderHtmlToCanvas(page.htmlContent, BASE_PAGE_WIDTH, BASE_PAGE_HEIGHT);
    pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
  }

  return {
    id: `doc-${Date.now()}`,
    title,
    fileType: 'docx',
    fileUrl: '#docx',
    totalPages: pagination.totalPages,
    pageImages,
    docxHtml: html,
    pageSize: { width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT },
  };
}

/**
 * Nạp đề thi/bài tập mẫu
 */
export async function loadSampleDocumentPages(): Promise<LoadedDocumentResult> {
  const sample = createSampleExerciseDocument();
  const pageImages: string[] = [];

  for (const pageHtml of sample.pagesHtml) {
    const canvas = await renderHtmlToCanvas(pageHtml, BASE_PAGE_WIDTH, BASE_PAGE_HEIGHT);
    pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
  }

  return {
    id: `doc-sample-${Date.now()}`,
    title: sample.title,
    fileType: 'docx',
    fileUrl: '#sample',
    totalPages: sample.totalPages,
    pageImages,
    docxHtml: sample.pagesHtml.join('<!--PAGE_BREAK-->'),
    pageSize: { width: BASE_PAGE_WIDTH, height: BASE_PAGE_HEIGHT },
  };
}
