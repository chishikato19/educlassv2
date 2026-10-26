/**
 * Động cơ chuyển đổi tài liệu Word (.docx) sang các trang chuẩn (A4 Document Pages)
 * Hoạt động offline 100% trong trình duyệt hoặc Node.js máy giáo viên.
 */

export interface ConvertedPage {
  pageNumber: number;
  htmlContent: string;
}

export interface DocxConversionResult {
  title: string;
  totalPages: number;
  pages: ConvertedPage[];
  fullHtml: string;
}

/**
 * Phân tách nội dung HTML của file Word thành các trang A4 logic
 * Mỗi trang có dung lượng tương đương 1 trang A4 chuẩn (chiều cao ~1120px ở 96 DPI)
 */
export function paginateHtmlContent(html: string): DocxConversionResult {
  // Tách theo các đoạn p, h1, h2, table
  const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!tempDiv) {
    return {
      title: 'Tài liệu Word',
      totalPages: 1,
      pages: [{ pageNumber: 1, htmlContent: html }],
      fullHtml: html,
    };
  }

  tempDiv.innerHTML = html;
  const childNodes = Array.from(tempDiv.children);

  if (childNodes.length === 0) {
    return {
      title: 'Tài liệu Word',
      totalPages: 1,
      pages: [{ pageNumber: 1, htmlContent: html }],
      fullHtml: html,
    };
  }

  const pages: ConvertedPage[] = [];
  let currentPageNodes: string[] = [];
  let estimatedHeight = 0;
  const A4_MAX_CONTENT_HEIGHT = 900; // Chiều cao nội dung an toàn của 1 trang A4

  childNodes.forEach((node) => {
    // Ước tính chiều cao từng phần tử dựa trên loại thẻ và độ dài chữ
    const tag = node.tagName.toLowerCase();
    const textLen = (node.textContent || '').length;
    let nodeHeight = 32;

    if (tag === 'h1') nodeHeight = 60;
    else if (tag === 'h2') nodeHeight = 45;
    else if (tag === 'table') nodeHeight = Math.max(120, textLen * 1.5);
    else if (tag === 'img') nodeHeight = 220;
    else nodeHeight = Math.max(28, Math.ceil(textLen / 80) * 24);

    if (estimatedHeight + nodeHeight > A4_MAX_CONTENT_HEIGHT && currentPageNodes.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        htmlContent: currentPageNodes.join(''),
      });
      currentPageNodes = [node.outerHTML];
      estimatedHeight = nodeHeight;
    } else {
      currentPageNodes.push(node.outerHTML);
      estimatedHeight += nodeHeight;
    }
  });

  if (currentPageNodes.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      htmlContent: currentPageNodes.join(''),
    });
  }

  return {
    title: 'Tài liệu Word',
    totalPages: Math.max(1, pages.length),
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, htmlContent: html }],
    fullHtml: html,
  };
}

/**
 * Tạo một tài liệu mẫu (Đề ôn tập Toán/Vật Lý) có sẵn để giáo viên có thể thử nghiệm ngay lập tức
 */
export function createSampleExerciseDocument(): {
  title: string;
  totalPages: number;
  pagesHtml: string[];
} {
  const page1 = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6;">
      <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #1d4ed8; font-size: 18px; text-transform: uppercase;">TRƯỜNG THPT CHUYÊN EDUCLASS</h3>
        <h2 style="margin: 6px 0 0 0; color: #0f172a; font-size: 20px;">ĐỀ ÔN TẬP KIỂM TRA ĐỊNH KỲ — MÔN TOÁN HỌC</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Thời gian: 45 phút • Hãy giải chi tiết các câu hỏi bên dưới</p>
      </div>

      <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e293b;">
          Câu 1 (2.0 điểm): Cho hàm số bậc ba y = f(x) = x³ - 3x² + 2 có đồ thị (C).
        </p>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          a) Khảo sát sự biến thiên và tìm tọa độ các điểm cực trị của hàm số.<br/>
          b) Viết phương trình tiếp tuyến của đồ thị (C) tại điểm uốn I(1; 0).
        </p>
      </div>

      <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-left: 4px solid #10b981; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e293b;">
          Câu 2 (2.0 điểm): Giải phương trình lượng giác sau trên tập số thực:
        </p>
        <p style="margin: 0; font-size: 14px; color: #334155; font-style: italic;">
          sin(2x) + √3 • cos(2x) = 2 • sin(x + π/6)
        </p>
      </div>

      <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e293b;">
          Câu 3 (3.0 điểm): Trong không gian Oxyz, cho mặt phẳng (P): 2x - y + 2z - 6 = 0 và điểm A(1; 2; 3).
        </p>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          a) Tính khoảng cách từ điểm A đến mặt phẳng (P).<br/>
          b) Viết phương trình đường thẳng d đi qua A và vuông góc với mặt phẳng (P).
        </p>
      </div>
    </div>
  `;

  const page2 = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6;">
      <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e293b;">
          Câu 4 (2.0 điểm): Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD) và SA = a√3.
        </p>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          a) Chứng minh rằng mặt phẳng (SBC) vuông góc với mặt phẳng (SAB).<br/>
          b) Tính góc giữa đường thẳng SC và mặt phẳng đáy (ABCD).
        </p>
      </div>

      <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-left: 4px solid #ec4899; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e293b;">
          Câu 5 (1.0 điểm — Vận dụng cao):
        </p>
        <p style="margin: 0; font-size: 14px; color: #334155;">
          Tìm tất cả các giá trị thực của tham số m để bất phương trình:<br/>
          log₂(x² + 2) + log₃(x² + 3) ≤ m - √(4 - x²)<br/>
          có nghiệm thực x ∈ [-2; 2].
        </p>
      </div>

      <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px;">
        ——— HẾT ———<br/>
        (Giáo viên dùng công cụ ✂️ để nới rộng khoảng trống giữa các câu và viết lời giải)
      </div>
    </div>
  `;

  return {
    title: 'Đề ôn tập Toán học (Trường THPT Chuyên EduClass)',
    totalPages: 2,
    pagesHtml: [page1, page2],
  };
}
