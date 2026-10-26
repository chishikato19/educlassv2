import { describe, expect, it } from 'vitest';
import { parseWordHtmlContent } from '../word/word-parser.js';

describe('Word Exam Parser - Difficulty & Chapter/Lesson Detection (Task 2.1)', () => {
  it('parses questions with chapter, lesson tags and difficulty prefixes [NB], [TH], [VD], [VDC]', () => {
    const html = `
      <p>[Chương: Chương 1. Khảo sát hàm số]</p>
      <p>[Bài: Bài 1. Tính đơn điệu của hàm số]</p>
      
      <p>[NB] <strong>Câu 1:</strong> Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = x^2 + 1$. Khẳng định nào sau đây đúng?</p>
      <p><u>A.</u> Hàm số đồng biến trên R</p>
      <p>B. Hàm số nghịch biến trên R</p>
      <p>C. Hàm số đồng biến trên (0; +∞)</p>
      <p>D. Hàm số nghịch biến trên (-∞; 0)</p>
      
      <p><strong>Câu 2</strong> [TH]: Tìm các khoảng đồng biến của hàm số $y = -x^3 + 3x$.</p>
      <p>A. $(-\\infty; -1)$</p>
      <p><u>B.</u> $(-1; 1)$</p>
      <p>C. $(1; +\\infty)$</p>
      <p>D. $(-\\infty; 1)$</p>

      <p>[VD] <strong>Câu 3:</strong> Cho hàm số bậc ba có đồ thị như hình vẽ. Xét tính đúng sai của các khẳng định sau:</p>
      <p>a) Hàm số đồng biến trên khoảng $(0; 2)$. [Đúng]</p>
      <p>b) Giá trị cực tiểu bằng $-2$. [Đúng]</p>
      <p>c) Đồ thị có 3 điểm cực trị. [Sai]</p>
      <p>d) Phương trình $f(x) = 0$ có 3 nghiệm phân biệt. [Đúng]</p>

      <p><strong>Câu 4:</strong> [VDC] Có bao nhiêu giá trị nguyên của tham số $m$ để hàm số đồng biến trên $\\mathbb{R}$?</p>
      <p>Đáp án: 5</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(4);
    expect(result.detectedChapter).toBe('Chương 1. Khảo sát hàm số');
    expect(result.detectedLesson).toBe('Bài 1. Tính đơn điệu của hàm số');

    // Câu 1: mcq4, difficulty = nb
    const q1 = result.questions[0];
    expect(q1?.type).toBe('mcq4');
    if (q1?.type === 'mcq4') {
      expect(q1.difficulty).toBe('nb');
      expect(q1.chapter).toBe('Chương 1. Khảo sát hàm số');
      expect(q1.lesson).toBe('Bài 1. Tính đơn điệu của hàm số');
      expect(q1.stem.text).not.toContain('[NB]');
      expect(q1.correct).toBe(0);
    }

    // Câu 2: mcq4, difficulty = th
    const q2 = result.questions[1];
    expect(q2?.type).toBe('mcq4');
    if (q2?.type === 'mcq4') {
      expect(q2.difficulty).toBe('th');
      expect(q2.chapter).toBe('Chương 1. Khảo sát hàm số');
      expect(q2.lesson).toBe('Bài 1. Tính đơn điệu của hàm số');
      expect(q2.stem.text).not.toContain('[TH]');
      expect(q2.correct).toBe(1);
    }

    // Câu 3: tf_group, difficulty = vd
    const q3 = result.questions[2];
    expect(q3?.type).toBe('tf_group');
    if (q3?.type === 'tf_group') {
      expect(q3.difficulty).toBe('vd');
      expect(q3.chapter).toBe('Chương 1. Khảo sát hàm số');
      expect(q3.lesson).toBe('Bài 1. Tính đơn điệu của hàm số');
      expect(q3.stem.text).not.toContain('[VD]');
    }

    // Câu 4: short, difficulty = vdc
    const q4 = result.questions[3];
    expect(q4?.type).toBe('short');
    if (q4?.type === 'short') {
      expect(q4.difficulty).toBe('vdc');
      expect(q4.chapter).toBe('Chương 1. Khảo sát hàm số');
      expect(q4.lesson).toBe('Bài 1. Tính đơn điệu của hàm số');
      expect(q4.stem.text).not.toContain('[VDC]');
      expect(q4.accepted).toContain('5');
    }
  });

  it('updates currentChapter and currentLesson when encountering new tags mid-document', () => {
    const html = `
      <p>[Chương: Chương 1. Hàm số]</p>
      <p>[Bài: Bài 1. Đồng biến nghịch biến]</p>
      <p>[NB] <strong>Câu 1:</strong> Câu hỏi bài 1.</p>
      <p><u>A.</u> Đúng</p>
      <p>B. Sai</p>
      <p>C. Chưa rõ</p>
      <p>D. Không xác định</p>

      <p>[Bài: Bài 2. Cực trị]</p>
      <p>[TH] <strong>Câu 2:</strong> Câu hỏi bài 2.</p>
      <p>A. Phương án 1</p>
      <p><u>B.</u> Phương án 2</p>
      <p>C. Phương án 3</p>
      <p>D. Phương án 4</p>
    `;

    const result = parseWordHtmlContent(html);
    expect(result.questions).toHaveLength(2);

    expect(result.questions[0]?.lesson).toBe('Bài 1. Đồng biến nghịch biến');
    expect(result.questions[0]?.difficulty).toBe('nb');

    expect(result.questions[1]?.lesson).toBe('Bài 2. Cực trị');
    expect(result.questions[1]?.difficulty).toBe('th');
  });
});
