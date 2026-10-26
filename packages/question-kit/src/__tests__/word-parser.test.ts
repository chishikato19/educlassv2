import { describe, expect, it } from 'vitest';
import { parseWordHtmlContent } from '../word/word-parser.js';

describe('Word Exam Parser (Task 2.4)', () => {
  it('parses MCQ4 question with 4 options and underlined/bold correct answer', () => {
    const html = `
      <p><strong>Câu 1:</strong> Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$. Tìm đạo hàm của $f(x) = x^2$.</p>
      <p>A. $f'(x) = x$</p>
      <p><u>B.</u> $f'(x) = 2x$</p>
      <p>C. $f'(x) = 3x$</p>
      <p>D. $f'(x) = 4x$</p>
      <p><strong>Lời giải:</strong> Áp dụng công thức đạo hàm cơ bản ta có $(x^2)' = 2x$.</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('mcq4');
    if (q?.type === 'mcq4') {
      expect(q.stem.text).toContain('Cho hàm số');
      expect(q.options).toHaveLength(4);
      expect(q.options[1]?.text).toContain('2x');
      expect(q.correct).toBe(1); // B is index 1
      expect(q.explanation?.text).toContain('Áp dụng công thức đạo hàm');
    }
  });

  it('parses MCQ4 question with trailing "Đáp án: C"', () => {
    const html = `
      <p><strong>Câu 2:</strong> Kim loại nào sau đây dẫn điện tốt nhất?</p>
      <p>A. Đồng</p>
      <p>B. Nhôm</p>
      <p>C. Bạc</p>
      <p>D. Vàng</p>
      <p>Đáp án: C</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('mcq4');
    if (q?.type === 'mcq4') {
      expect(q.correct).toBe(2); // C is index 2
    }
  });

  it('parses TF_Group question with 4 sub-items a, b, c, d (BGD 2025 standard)', () => {
    const html = `
      <p><strong>Câu 3:</strong> Cho chất điểm dao động điều hòa với phương trình $x = 5\\cos(2\\pi t)$ (cm). Xét tính đúng sai của các nhận định sau:</p>
      <p>a) Biên độ dao động của chất điểm là $A = 5$ cm. [Đúng]</p>
      <p>b) Chu kỳ dao động của chất điểm là $T = 2$ s. [Sai]</p>
      <p>c) Tần số góc của dao động là $\\omega = 2\\pi$ rad/s. (Đúng)</p>
      <p>d) Vận tốc cực đại của chất điểm là $v_{max} = 10\\pi$ cm/s. (Đúng)</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('tf_group');
    if (q?.type === 'tf_group') {
      expect(q.items).toHaveLength(4);
      expect(q.items[0]?.correct).toBe(true);
      expect(q.items[1]?.correct).toBe(false);
      expect(q.items[2]?.correct).toBe(true);
      expect(q.items[3]?.correct).toBe(true);
    }
  });

  it('parses Short Answer question with numeric or text accepted answers', () => {
    const html = `
      <p><strong>Câu 4:</strong> Cho tam giác vuông có hai cạnh góc vuông lần lượt là 3 cm và 4 cm. Độ dài cạnh huyền là bao nhiêu cm?</p>
      <p>Đáp án: 5</p>
      <p>Lời giải: Áp dụng định lý Pytago $\\sqrt{3^2 + 4^2} = 5$.</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('short');
    if (q?.type === 'short') {
      expect(q.accepted).toContain('5');
      expect(q.explanation?.text).toContain('định lý Pytago');
    }
  });

  it('parses single TF question', () => {
    const html = `
      <p><strong>Câu 5:</strong> Nước sôi ở $100^\\circ\\text{C}$ dưới áp suất tiêu chuẩn 1 atm.</p>
      <p>Đáp án: Đúng</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('tf');
    if (q?.type === 'tf') {
      expect(q.correct).toBe(true);
    }
  });

  it('extracts embedded images as SHA-256 asset hashes', () => {
    const fakeSha = 'a69f73ccd356db7c5e819d758d34bb30c9ec4201';
    const html = `
      <p><strong>Câu 6:</strong> Quan sát sơ đồ thí nghiệm bên dưới và chọn hiện tượng đúng:</p>
      <p><img data-asset="${fakeSha}" src="/api/assets/${fakeSha}" /></p>
      <p><u>A.</u> Có kết tủa trắng xuất hiện</p>
      <p>B. Có khí màu nâu đỏ thoát ra</p>
      <p>C. Dung dịch chuyển sang màu xanh</p>
      <p>D. Không có hiện tượng gì</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('mcq4');
    if (q?.type === 'mcq4') {
      expect(q.stem.images).toContain(fakeSha);
    }
  });

  it('reports warnings when a question is incomplete or ambiguous', () => {
    const html = `
      <p><strong>Câu 7:</strong> Câu hỏi bị thiếu phương án D</p>
      <p>A. Phương án 1</p>
      <p>B. Phương án 2</p>
      <p>C. Phương án 3</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('correctly handles stem containing "Chọn phương án SAI:" without cutting stem or mistaking as trailing answer', () => {
    const html = `
      <p><strong>Câu 8:</strong> Chọn phương án SAI: Thiết bị vào gồm:</p>
      <p>*A. Bàn phím, chuột, màn hình.</p>
      <p>B. Bàn phím, chuột, máy quét.</p>
      <p>C. Bàn phím, chuột, máy ảnh số.</p>
      <p>D. Bàn phím, màn hình cảm ứng, micro.</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(1);
    const q = result.questions[0];
    expect(q?.type).toBe('mcq4');
    if (q?.type === 'mcq4') {
      expect(q.stem.text).toContain('Chọn phương án SAI: Thiết bị vào gồm:');
      expect(q.options).toHaveLength(4);
      expect(q.correct).toBe(0); // *A is index 0
    }
  });
});
