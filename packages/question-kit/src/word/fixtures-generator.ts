import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

// 1x1 Pixel PNG Base64
function getPixelPng(): Uint8Array {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64');
  }
  const binary = typeof atob !== 'undefined' ? atob(base64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Tạo XML chuẩn OpenXML DrawingML cho hình ảnh nhúng inline trong Word .docx
 * Tuân thủ nghiêm ngặt chuẩn ECMA-376 để Microsoft Word mở không bị lỗi XML schema
 */
export function createInlineDrawingXml(
  docPrId: number,
  name: string,
  rId = 'rIdImg1',
  cx = 952500,
  cy = 952500,
): string {
  return `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
      `<wp:docPr id="${docPrId}" name="${name}"/>` +
      `<wp:cNvGraphicFramePr>` +
        `<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>` +
      `</wp:cNvGraphicFramePr>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
        `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
          `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
            `<pic:nvPicPr>` +
              `<pic:cNvPr id="0" name="${name}"/>` +
              `<pic:cNvPicPr>` +
                `<a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>` +
              `</pic:cNvPicPr>` +
            `</pic:nvPicPr>` +
            `<pic:blipFill>` +
              `<a:blip r:embed="${rId}"/>` +
              `<a:srcRect/>` +
              `<a:stretch><a:fillRect/></a:stretch>` +
            `</pic:blipFill>` +
            `<pic:spPr bwMode="auto">` +
              `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
              `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
              `<a:noFill/>` +
              `<a:ln><a:noFill/></a:ln>` +
            `</pic:spPr>` +
          `</pic:pic>` +
        `</a:graphicData>` +
      `</a:graphic>` +
    `</wp:inline>` +
  `</w:drawing>`;
}

export async function createDocxBuffer(bodyXml: string, includeImage = false): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', ROOT_RELS_XML);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;
  zip.file('word/document.xml', documentXml);

  if (includeImage) {
    zip.file('word/_rels/document.xml.rels', DOC_RELS_XML);
    zip.file('word/media/image1.png', getPixelPng());
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buf as Buffer;
}

export async function generateAllFixtures(targetDir: string): Promise<string[]> {
  fs.mkdirSync(targetDir, { recursive: true });

  const generatedFiles: string[] = [];

  // Mẫu 1: Toán MCQ4 kèm công thức OMML
  const mathBody = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Tìm nguyên hàm của hàm số </w:t></w:r><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath><w:r><w:t> trên R.</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. </w:t></w:r><m:oMath><m:f><m:num><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>3</m:t></m:r></m:den></m:f><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>B. </w:t></w:r><m:oMath><m:f><m:num><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>C. </w:t></w:r><m:oMath><m:r><m:t>2x+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>D. </w:t></w:r><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Giá trị của biểu thức căn bậc hai </w:t></w:r><m:oMath><m:rad><m:radPr><m:degHide m:val="on"/></m:radPr><m:deg/><m:e><m:r><m:t>16</m:t></m:r></m:e></m:rad></m:oMath><w:r><w:t> là?</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. 2</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. 8</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>C. 4</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. 16</w:t></w:r></w:p>
  `;
  const file1 = path.join(targetDir, 'sample-1-math-mcq.docx');
  fs.writeFileSync(file1, await createDocxBuffer(mathBody));
  generatedFiles.push(file1);

  // Mẫu 2: Vật lý THPT Đúng/Sai 4 ý
  const physicsBody = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Một con lắc lò xo dao động điều hòa. Các nhận định sau:</w:t></w:r></w:p>
    <w:p><w:r><w:t>a) Cơ năng bảo toàn khi bỏ qua ma sát. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>b) Thế năng đạt cực đại ở vị trí cân bằng. [Sai]</w:t></w:r></w:p>
    <w:p><w:r><w:t>c) Động năng đạt cực đại ở vị trí cân bằng. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>d) Chu kỳ phụ thuộc vào biên độ dao động. [Sai]</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Xét sóng cơ truyền trong môi trường đàn hồi:</w:t></w:r></w:p>
    <w:p><w:r><w:t>a) Bước sóng là quãng đường sóng truyền trong 1 chu kỳ. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>b) Vận tốc truyền sóng phụ thuộc vào bản chất môi trường. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>c) Tần số sóng thay đổi khi truyền qua các môi trường khác nhau. [Sai]</w:t></w:r></w:p>
    <w:p><w:r><w:t>d) Sóng âm truyền được trong chân không. [Sai]</w:t></w:r></w:p>
  `;
  const file2 = path.join(targetDir, 'sample-2-physics-tf-group.docx');
  fs.writeFileSync(file2, await createDocxBuffer(physicsBody));
  generatedFiles.push(file2);

  // Mẫu 3: Hóa học trả lời ngắn
  const chemBody = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Khối lượng mol của khí Oxi (O2) tính theo g/mol là bao nhiêu?</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: 32</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Công thức phân tử của axit sunfuric là gì?</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: H2SO4</w:t></w:r></w:p>
  `;
  const file3 = path.join(targetDir, 'sample-3-chemistry-short.docx');
  fs.writeFileSync(file3, await createDocxBuffer(chemBody));
  generatedFiles.push(file3);

  // Mẫu 4: Sinh học hỗn hợp
  const bioBody = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Bào quan nào là trung tâm năng lượng của tế bào?</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. </w:t></w:r><w:r><w:t>Ty thể</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Riboxom</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Nhân tế bào</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Không bào</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Ở sinh vật nhân thực, quá trình quang hợp diễn ra ở đâu?</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: Lục lạp</w:t></w:r></w:p>
  `;
  const file4 = path.join(targetDir, 'sample-4-biology-mixed.docx');
  fs.writeFileSync(file4, await createDocxBuffer(bioBody));
  generatedFiles.push(file4);

  // Mẫu 5: Địa lý / Lịch sử kèm hình ảnh
  const geoBody = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Quan sát lược đồ sau và xác định hướng dòng hải lưu nóng:</w:t></w:r></w:p>
    <w:p><w:r>${createInlineDrawingXml(1, 'Lược đồ hải lưu')}</w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. </w:t></w:r><w:r><w:t>Từ vĩ độ thấp lên vĩ độ cao</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Từ vĩ độ cao về vĩ độ thấp</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Chảy quanh cực</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Không xác định</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Việt Nam nằm trong vùng khí hậu nhiệt đới gió mùa.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: Đúng</w:t></w:r></w:p>
  `;
  const file5 = path.join(targetDir, 'sample-5-geography-images.docx');
  fs.writeFileSync(file5, await createDocxBuffer(geoBody, true));
  generatedFiles.push(file5);

  // File Mẫu Chuẩn EduClass v2: Đầy đủ 4 dạng câu hỏi (MCQ4, TF Group, TF, Short)
  const templateBuf = await generateStandardExamTemplateDocx();
  const fileTemplate = path.join(targetDir, 'de-thi-mau-educlass.docx');
  fs.writeFileSync(fileTemplate, templateBuf);
  generatedFiles.push(fileTemplate);

  return generatedFiles;
}

/**
 * Tạo tập tin Word (.docx) mẫu chuẩn đầy đủ 4 dạng câu hỏi:
 * 1. Trắc nghiệm 4 lựa chọn (MCQ4) — minh họa gạch chân, dấu *, bôi đậm, hình ảnh ở câu hỏi & đáp án
 * 2. Đúng / Sai theo nhóm câu hỏi (TF Group 4 ý a, b, c, d chuẩn BGD 2025)
 * 3. Đúng / Sai đơn lẻ (TF)
 * 4. Trả lời ngắn (Short Answer)
 */
export async function generateStandardExamTemplateDocx(): Promise<Buffer> {
  const templateBody = `
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E40AF"/></w:rPr><w:t>BỘ ĐỀ THI MẪU CHUẨN — EDUCLASS V2</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="64748B"/></w:rPr><w:t>(Tài liệu mẫu hướng dẫn soạn đề thi từ Microsoft Word .docx)</w:t></w:r></w:p>
    <w:p/>

    <!-- PHẦN 1: TRẮC NGHIỆM 4 LỰA CHỌN -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t>I. PHẦN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</w:t></w:r></w:p>

    <!-- Câu 1: Gạch chân đáp án đúng + Công thức Toán học OMML -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r><w:r><w:t>Tìm nguyên hàm của hàm số </w:t></w:r><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath><w:r><w:t> trên R (Đánh dấu bằng gạch chân đáp án đúng):</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. </w:t></w:r><m:oMath><m:f><m:num><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>3</m:t></m:r></m:den></m:f><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>B. </w:t></w:r><m:oMath><m:f><m:num><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>C. </w:t></w:r><m:oMath><m:r><m:t>2x+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>D. </w:t></w:r><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>3</m:t></m:r></m:sup></m:sSup><m:r><m:t>+C</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Hướng dẫn giải: </w:t></w:r><w:r><w:t>Áp dụng công thức nguyên hàm cơ bản ta có nguyên hàm của x^2 là x^3/3 + C.</w:t></w:r></w:p>

    <!-- Câu 2: Đánh dấu bằng dấu sao * đằng trước phương án đúng -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r><w:r><w:t>Trong hệ Mặt Trời, hành tinh nào có kích thước lớn nhất? (Đánh dấu bằng dấu sao * trước phương án đúng):</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Trái Đất</w:t></w:r></w:p>
    <w:p><w:r><w:t>*B. Sao Mộc</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Sao Hỏa</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Sao Thổ</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Hướng dẫn giải: </w:t></w:r><w:r><w:t>Sao Mộc (Jupiter) là hành tinh lớn nhất trong hệ Mặt Trời.</w:t></w:r></w:p>

    <!-- Câu 3: Đánh dấu bằng bôi đậm phương án đúng -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 3: </w:t></w:r><w:r><w:t>Đơn vị đo cường độ dòng điện trong hệ đo lường quốc tế (SI) là gì? (Đánh dấu bằng bôi đậm phương án đúng):</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Vôn (V)</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Oát (W)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>C. Ampe (A)</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Ôm (Ω)</w:t></w:r></w:p>

    <!-- Câu 4: Có hình ảnh minh họa đính kèm ở câu hỏi và đáp án -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 4: </w:t></w:r><w:r><w:t>Quan sát hình ảnh sau và xác định hướng của dòng hải lưu nóng (Hỗ trợ chèn ảnh ở cả câu hỏi và đáp án):</w:t></w:r></w:p>
    <w:p><w:r>${createInlineDrawingXml(1, 'Hải lưu nóng')}</w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>*A. </w:t></w:r><w:r>${createInlineDrawingXml(2, 'Phương án A')}</w:r><w:r><w:t>Từ vĩ độ thấp lên vĩ độ cao</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Từ vĩ độ cao về vĩ độ thấp</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Chảy quanh cực</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Không xác định</w:t></w:r></w:p>

    <!-- PHẦN 2: ĐÚNG / SAI THEO NHÓM -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t>II. PHẦN ĐÚNG / SAI THEO NHÓM CÂU HỎI (BGD 2025)</w:t></w:r></w:p>

    <!-- Câu 5: TF Group -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 5: </w:t></w:r><w:r><w:t>Cho một vật dao động điều hòa với phương trình x = 4cos(2πt) (cm). Xét tính đúng/sai của các nhận định sau:</w:t></w:r></w:p>
    <w:p><w:r><w:t>a) Biên độ dao động của vật là A = 4 cm. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>b) Chu kỳ dao động của vật là T = 2 s. [Sai]</w:t></w:r></w:p>
    <w:p><w:r><w:t>c) Tần số góc của dao động là ω = 2π rad/s. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:t>d) Vận tốc cực đại của vật là vmax = 8π cm/s. [Đúng]</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Lời giải: </w:t></w:r><w:r><w:t>Chu kỳ dao động T = 2π/ω = 1 s, do đó nhận định b sai.</w:t></w:r></w:p>

    <!-- PHẦN 3: ĐÚNG / SAI ĐƠN LẺ -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t>III. PHẦN ĐÚNG / SAI ĐƠN LẺ</w:t></w:r></w:p>

    <!-- Câu 6: TF đơn -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 6: </w:t></w:r><w:r><w:t>Nước tinh khiết sôi ở 100°C dưới áp suất khí quyển tiêu chuẩn 1 atm.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: Đúng</w:t></w:r></w:p>

    <!-- PHẦN 4: TRẢ LỜI NGẮN -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t>IV. PHẦN CÂU HỎI TRẢ LỜI NGẮN</w:t></w:r></w:p>

    <!-- Câu 7: Short Answer -->
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Câu 7: </w:t></w:r><w:r><w:t>Khối lượng mol phân tử của khí Oxi (O2) tính theo g/mol là bao nhiêu?</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp án: 32</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Hướng dẫn giải: </w:t></w:r><w:r><w:t>Oxi có nguyên tử khối 16, phân tử O2 gồm 2 nguyên tử nên có khối lượng mol là 16 x 2 = 32 g/mol.</w:t></w:r></w:p>
  `;

  return createDocxBuffer(templateBody, true);
}
