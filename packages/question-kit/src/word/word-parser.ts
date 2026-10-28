import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { Question } from '../schemas/question.js';
import type { RichText } from '../rich-text.js';
import { Mcq4QuestionSchema } from '../schemas/mcq4.js';
import { TfQuestionSchema } from '../schemas/tf.js';
import { TfGroupQuestionSchema } from '../schemas/tf-group.js';
import { ShortQuestionSchema } from '../schemas/short.js';
import { MatchingQuestionSchema } from '../schemas/matching.js';
import { ClozeDragQuestionSchema } from '../schemas/cloze-drag.js';
import { replaceOmmlInXml } from './omml-to-latex.js';

export interface ParsedWordQuestionWarning {
  questionIndex: number;
  questionNumberStr?: string | undefined;
  rawText: string;
  reason: string;
}

export interface ExtractedDocxAsset {
  sha256: string;
  mime: string;
  base64: string;
}

export interface ParsedWordExamResult {
  questions: Question[];
  warnings: ParsedWordQuestionWarning[];
  assets: ExtractedDocxAsset[];
  totalDetected: number;
  successCount: number;
  detectedChapter?: string | undefined;
  detectedLesson?: string | undefined;
}

function cleanHtmlToTextAndImages(html: string): RichText {
  const images: string[] = [];

  // 1. Trích xuất tất cả ảnh nhúng trong khối html (data-asset, /api/assets/..., data:image/...)
  const imgTagRegex = /<img\b[^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgTagRegex.exec(html)) !== null) {
    const tag = imgMatch[0];
    const dataAsset = tag.match(/data-asset="([^"]+)"/i)?.[1];
    const srcAsset = tag.match(/src="(?:\/api\/assets\/)?([a-f0-9]{32,64})"/i)?.[1];
    const dataUrl = tag.match(/src="(data:image\/[^"]+)"/i)?.[1];
    const genericSrc = tag.match(/src="([^"]+)"/i)?.[1];

    const found = dataAsset || srcAsset || dataUrl || genericSrc;
    if (found) {
      images.push(found.trim());
    }
  }

  // 2. Loại bỏ các thẻ HTML nhưng giữ lại text và $latex$
  let text = html
    .replace(/<img\b[^>]*\/?>/gi, ' ')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

  // Chuẩn hóa khoảng trắng thừa
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n');

  return {
    text,
    images: Array.from(new Set(images)),
  };
}

/**
 * Trích xuất mức độ nhận thức (NB, TH, VD, VDC / M1, M2, M3, M4) từ văn bản
 */
function extractDifficulty(htmlOrText: string): {
  difficulty?: 'nb' | 'th' | 'vd' | 'vdc' | undefined;
  cleanedText: string;
} {
  const diffRegex =
    /(?:\[|\()\s*(VDC|M4|Vận dụng cao|VD|M3|Vận dụng|TH|M2|Thông hiểu|NB|M1|Nhận biết)\s*(?:\]|\))/i;
  const match = htmlOrText.match(diffRegex);
  if (!match || !match[1]) {
    return { cleanedText: htmlOrText };
  }

  const raw = match[1].toUpperCase().trim();
  let difficulty: 'nb' | 'th' | 'vd' | 'vdc' | undefined;

  if (raw === 'VDC' || raw === 'M4' || raw.includes('CAO')) {
    difficulty = 'vdc';
  } else if (raw === 'VD' || raw === 'M3' || raw.includes('DỤNG')) {
    difficulty = 'vd';
  } else if (raw === 'TH' || raw === 'M2' || raw.includes('HIỂU')) {
    difficulty = 'th';
  } else if (raw === 'NB' || raw === 'M1' || raw.includes('BIẾT')) {
    difficulty = 'nb';
  }

  const cleanedText = htmlOrText.replace(match[0], ' ');
  return { difficulty, cleanedText };
}

/**
 * Phân tích cú pháp chuỗi HTML đã chuyển đổi từ Word thành danh sách câu hỏi
 */
export function parseWordHtmlContent(
  html: string,
  existingAssets: ExtractedDocxAsset[] = []
): ParsedWordExamResult {
  const questions: Question[] = [];
  const warnings: ParsedWordQuestionWarning[] = [];

  // 1. Phân tách thành các khối câu hỏi dựa vào regex "Câu X:" hoặc "[NB] Câu X:" hoặc "Bài X:"
  const questionRegex =
    /(?:<p[^>]*>|^|\n)\s*(?:<(?:strong|b|span|p|u)[^>]*>)*\s*(?:(?:\[|\()\s*(?:VDC|M4|Vận dụng cao|VD|M3|Vận dụng|TH|M2|Thông hiểu|NB|M1|Nhận biết)\s*(?:\]|\))\s*)?(?:<(?:strong|b|span|u)[^>]*>)*\s*(?:Câu|Bài|Question)\s*(\d+)\s*(?:<\/(?:strong|b|span|u)>)*\s*(?:(?:\[|\()\s*(?:VDC|M4|Vận dụng cao|VD|M3|Vận dụng|TH|M2|Thông hiểu|NB|M1|Nhận biết)\s*(?:\]|\))\s*)?(?:<\/(?:strong|b|span|u)>)*[\s.:\-–—)]/gi;

  const matches: Array<{ index: number; questionNum: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = questionRegex.exec(html)) !== null) {
    matches.push({
      index: m.index,
      questionNum: m[1] ?? String(matches.length + 1),
    });
  }

  // Quét toàn bộ các lần xuất hiện của thẻ [Chương: ...] và [Bài: ...] trong tài liệu
  const chapterMatches: Array<{ index: number; name: string }> = [];
  const chapRegexAll =
    /(?:<p[^>]*>|^|\n)?\s*\[\s*(?:Chương|Chuong|Chapter)\s*[:\s-]?\s*([^\]\n]+)\s*\](?:\s*<\/p>)?/gi;
  let cm: RegExpExecArray | null;
  while ((cm = chapRegexAll.exec(html)) !== null) {
    if (cm[1]) {
      chapterMatches.push({
        index: cm.index,
        name: cm[1].replace(/<[^>]+>/g, '').trim(),
      });
    }
  }

  const lessonMatches: Array<{ index: number; name: string }> = [];
  const lesRegexAll =
    /(?:<p[^>]*>|^|\n)?\s*\[\s*(?:Bài|Bai|Lesson)\s*[:\s-]?\s*([^\]\n]+)\s*\](?:\s*<\/p>)?/gi;
  let lm: RegExpExecArray | null;
  while ((lm = lesRegexAll.exec(html)) !== null) {
    if (lm[1]) {
      lessonMatches.push({
        index: lm.index,
        name: lm[1].replace(/<[^>]+>/g, '').trim(),
      });
    }
  }

  const detectedChapter = chapterMatches[0]?.name;
  const detectedLesson = lessonMatches[0]?.name;

  const chunks: Array<{ raw: string; qNum: string; chunkIndex: number; startIndex: number }> = [];
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i]!;
      const next = matches[i + 1];
      const chunkText = next ? html.slice(cur.index, next.index) : html.slice(cur.index);
      chunks.push({
        raw: chunkText,
        qNum: cur.questionNum,
        chunkIndex: i,
        startIndex: cur.index,
      });
    }
  } else {
    // Nếu không có "Câu 1", coi toàn bộ là 1 khối duy nhất để kiểm tra
    chunks.push({
      raw: html,
      qNum: '1',
      chunkIndex: 0,
      startIndex: 0,
    });
  }

  const totalDetected = chunks.length;

  for (const chunk of chunks) {
    let block = chunk.raw;
    const qNum = chunk.qNum;
    const qId = `q_import_${qNum}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Xác định Chương và Bài có hiệu lực tại vị trí của câu hỏi này
    let currentChapter: string | undefined = undefined;
    for (const c of chapterMatches) {
      if (c.index <= chunk.startIndex) {
        currentChapter = c.name;
      }
    }
    let currentLesson: string | undefined = undefined;
    for (const l of lessonMatches) {
      if (l.index <= chunk.startIndex) {
        currentLesson = l.name;
      }
    }

    // Làm sạch mọi thẻ [Chương] và [Bài] còn sót lại trong nội dung khối
    block = block
      .replace(
        /(?:<p[^>]*>|^|\n)?\s*\[\s*(?:Chương|Chuong|Chapter)\s*[:\s-]?\s*([^\]\n]+)\s*\](?:\s*<\/p>)?/gi,
        ' '
      )
      .replace(
        /(?:<p[^>]*>|^|\n)?\s*\[\s*(?:Bài|Bai|Lesson)\s*[:\s-]?\s*([^\]\n]+)\s*\](?:\s*<\/p>)?/gi,
        ' '
      );

    // Trích xuất mức độ nhận thức (nếu [NB] đứng trước Câu X)
    let difficulty: 'nb' | 'th' | 'vd' | 'vdc' | undefined = undefined;
    const preDiffInfo = extractDifficulty(block);
    if (preDiffInfo.difficulty) {
      difficulty = preDiffInfo.difficulty;
      block = preDiffInfo.cleanedText;
    }

    // Bỏ phần đầu "Câu X:"
    block = block.replace(
      /(?:<p[^>]*>|^|\n)\s*(?:<(?:strong|b|span|u)[^>]*>)*\s*(?:Câu|Bài|Question)\s*\d+\s*(?:<\/(?:strong|b|span|u)>)*[\s.:\-–—)]\s*(?:<\/(?:strong|b|span|u)>)?/i,
      ''
    );

    // Trích xuất mức độ nhận thức (nếu [NB] đứng sau Câu X)
    if (!difficulty) {
      const postDiffInfo = extractDifficulty(block);
      if (postDiffInfo.difficulty) {
        difficulty = postDiffInfo.difficulty;
        block = postDiffInfo.cleanedText;
      }
    }

    // Trích xuất lời giải / hướng dẫn giải thích nếu có
    let explanation: RichText | undefined;
    const expRegex =
      /(?:<p[^>]*>|^|\n)\s*(?:<strong>|<b>)?\s*(?:Hướng dẫn giải|Lời giải|Giải thích|HDG)[:\s]([\s\S]*)$/i;
    const expMatch = block.match(expRegex);
    if (expMatch && expMatch[1]) {
      explanation = cleanHtmlToTextAndImages(expMatch[1]);
      block = block.slice(0, expMatch.index);
    }

    // Trích xuất điểm số nếu có: (X điểm) hoặc (X đ)
    let points = 10;
    const pointMatch = block.match(/\((\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\)/i);
    if (pointMatch && pointMatch[1]) {
      points = Number(pointMatch[1].replace(',', '.'));
      block = block.replace(/\((\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\)/i, '');
    }

    // Trích xuất đáp án cuối câu nếu có: "Đáp án: X", "Chọn: A"
    let trailingAnswer: string | null = null;
    const trailingAnsRegex =
      /(?:<p[^>]*>|^|\n)\s*(?:<strong>|<b>)?\s*(?:(?:Đáp\s*án|Đ\/A|ĐA|Key|Answer)\s*[:=]\s*([^\n<]+)|(?:Chọn)\s*[:=]\s*([A-Da-d0-9]|Đúng|Sai|True|False)\b[^\n<]*)(?:<\/strong>|<\/b>)?(?:<\/p>)?/i;

    const trailingAnsMatch = block.match(trailingAnsRegex);
    if (trailingAnsMatch) {
      const matchIndex = trailingAnsMatch.index ?? 0;
      const afterMatch = block.slice(matchIndex + trailingAnsMatch[0].length);

      // Nếu phía sau vị trí match vẫn còn chứa các phương án trắc nghiệm A, B, C, D thì dòng này thuộc về đề bài (stem), không phải đáp án cuối câu
      const hasOptionsAfter =
        /(?:<p[^>]*>|<td[^>]*>|^|\n)\s*\*?\s*(?:<(?:strong|b|u|span|mark|font|em)[^>]*>)*\s*\*?\s*[A-D]\s*\*?\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*[\s.):\-–]/i.test(
          afterMatch
        );

      if (!hasOptionsAfter) {
        trailingAnswer = (trailingAnsMatch[1] ?? trailingAnsMatch[2])?.trim() ?? null;
        block = block.slice(0, matchIndex);
      }
    }

    // A. Kiểm tra TF Group (4 ý a, b, c, d thường)
    const tfGroupOptionRegex =
      /(?:<p[^>]*>|^|\n)\s*\*?\s*(?:<(?:strong|b|u|span|mark|font|em)[^>]*>)*\s*(\*?\s*[a-d]\s*\*?)\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*[\s.):\-–]\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*\s*([\s\S]*?)(?=(?:<p[^>]*>|^|\n)\s*\*?\s*(?:<(?:strong|b|u|span|mark|font|em)[^>]*>)*\s*\*?\s*[a-d]\s*\*?\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*[\s.):\-–]|$)/g;
    const tfGroupItems: Array<{
      key: string;
      rawKey: string;
      fullMatch: string;
      rawContent: string;
    }> = [];
    let tfGroupStemRaw = block;
    let tgMatch: RegExpExecArray | null;

    let firstTgIndex = -1;
    while ((tgMatch = tfGroupOptionRegex.exec(block)) !== null) {
      if (firstTgIndex === -1) firstTgIndex = tgMatch.index;
      const rawKey = tgMatch[1]!;
      const cleanKey = rawKey.replace(/[^\w]/g, '').toLowerCase();
      tfGroupItems.push({
        key: cleanKey,
        rawKey,
        fullMatch: tgMatch[0],
        rawContent: tgMatch[2]!.trim(),
      });
    }

    if (tfGroupItems.length === 4) {
      if (firstTgIndex !== -1) {
        tfGroupStemRaw = block.slice(0, firstTgIndex);
      }
      const stemRichText = cleanHtmlToTextAndImages(tfGroupStemRaw);

      const parsedItems: Array<{ text: RichText; correct: boolean }> = [];
      for (const item of tfGroupItems) {
        let isCorrect = true;
        let content = item.rawContent;

        // Nhận diện đánh dấu [Đúng], [Sai], (Đ), (S), [Đ], [S] hoặc - Đúng, - Sai
        const checkCorrectRegex =
          /(?:\[|\()\s*(Đúng|Sai|Đ|S|True|False)\s*(?:\]|\))|(?:^|\s|-|:)\s*(Đúng|Sai|True|False)(?:\s|$|\.)/i;
        const markMatch = content.match(checkCorrectRegex);
        if (markMatch) {
          const val = (markMatch[1] ?? markMatch[2])!.toLowerCase().trim();
          if (val === 'sai' || val === 's' || val === 'false') {
            isCorrect = false;
          }
          content = content.replace(checkCorrectRegex, ' ').trim();
        } else if (item.rawKey.includes('*') || /^\s*\*+/.test(item.fullMatch)) {
          // Đánh dấu bằng dấu sao '*' ở ý đúng
          isCorrect = true;
        }

        const rich = cleanHtmlToTextAndImages(content);
        rich.text = rich.text.replace(/^\s*\*\s*/, '').trim();

        parsedItems.push({
          text: rich,
          correct: isCorrect,
        });
      }

      const qObj = {
        id: qId,
        type: 'tf_group' as const,
        stem: stemRichText,
        items: [parsedItems[0]!, parsedItems[1]!, parsedItems[2]!, parsedItems[3]!] as const,
        scale: { 0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 },
        points,
        explanation,
        difficulty,
        chapter: currentChapter,
        lesson: currentLesson,
      };

      const validateRes = TfGroupQuestionSchema.safeParse(qObj);
      if (validateRes.success) {
        questions.push(validateRes.data);
        continue;
      }
    }

    // B. Kiểm tra MCQ4 (4 lựa chọn A, B, C, D in hoa)
    const mcqOptionRegex =
      /(?:<p[^>]*>|<td[^>]*>|^|\n)\s*\*?\s*(?:<(?:strong|b|u|span|mark|font|em)[^>]*>)*\s*(\*?\s*[A-D]\s*\*?)\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*[\s.):\-–]\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*\s*([\s\S]*?)(?=(?:<p[^>]*>|<td[^>]*>|^|\n)\s*\*?\s*(?:<(?:strong|b|u|span|mark|font|em)[^>]*>)*\s*\*?\s*[A-D]\s*\*?\s*(?:<\/(?:strong|b|u|span|mark|font|em)>)*[\s.):\-–]|$)/g;
    const mcqItems: Array<{
      key: string;
      rawKey: string;
      fullMatch: string;
      prefixPart: string;
      content: string;
    }> = [];
    let mcqFirstIndex = -1;
    let moMatch: RegExpExecArray | null;

    while ((moMatch = mcqOptionRegex.exec(block)) !== null) {
      if (mcqFirstIndex === -1) mcqFirstIndex = moMatch.index;
      const rawKey = moMatch[1]!;
      const cleanKey = rawKey.replace(/[^\w]/g, '').toUpperCase();
      const fullMatch = moMatch[0];
      const content = moMatch[2]!.trim();
      const prefixPart = fullMatch.slice(
        0,
        fullMatch.indexOf(content) > 0 ? fullMatch.indexOf(content) : 35
      );
      mcqItems.push({
        key: cleanKey,
        rawKey,
        fullMatch,
        prefixPart,
        content,
      });
    }

    if (mcqItems.length === 4) {
      const stemRaw = mcqFirstIndex !== -1 ? block.slice(0, mcqFirstIndex) : block;
      const stemRichText = cleanHtmlToTextAndImages(stemRaw);

      let correctIndex = 0; // Mặc định A

      // 1. Kiểm tra trailing answer: "Đáp án: B"
      if (trailingAnswer) {
        const cleanAns = trailingAnswer.toUpperCase().trim();
        const mapIdx: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        if (mapIdx[cleanAns] !== undefined) {
          correctIndex = mapIdx[cleanAns]!;
        }
      } else {
        // 2. Kiểm tra dấu sao '*' đằng trước hoặc sau phương án
        let starIndex = -1;
        for (let i = 0; i < mcqItems.length; i++) {
          const opt = mcqItems[i]!;
          if (
            opt.rawKey.includes('*') ||
            opt.prefixPart.includes('*') ||
            /^\s*\*+/.test(opt.fullMatch) ||
            /\*[A-D]/i.test(opt.prefixPart) ||
            /\*\s*[A-D]/i.test(opt.prefixPart) ||
            /[A-D]\s*\*/i.test(opt.prefixPart)
          ) {
            starIndex = i;
            break;
          }
        }

        // 3. Kiểm tra gạch chân (underline)
        let underlineIndex = -1;
        for (let i = 0; i < mcqItems.length; i++) {
          const opt = mcqItems[i]!;
          if (
            /<u\b[^>]*>/i.test(opt.prefixPart) ||
            /<u\b[^>]*>[A-D]/i.test(opt.fullMatch) ||
            /text-decoration\s*:\s*underline/i.test(opt.prefixPart)
          ) {
            underlineIndex = i;
            break;
          }
        }
        if (underlineIndex === -1) {
          const contentUnderlineIndices: number[] = [];
          for (let i = 0; i < mcqItems.length; i++) {
            if (/<u\b[^>]*>/i.test(mcqItems[i]!.content)) {
              contentUnderlineIndices.push(i);
            }
          }
          if (contentUnderlineIndices.length === 1) {
            underlineIndex = contentUnderlineIndices[0]!;
          }
        }

        // 4. Kiểm tra bôi màu highlight / nền (mark, background-color, highlight, màu chữ)
        let highlightIndex = -1;
        for (let i = 0; i < mcqItems.length; i++) {
          const opt = mcqItems[i]!;
          if (
            /<mark\b[^>]*>/i.test(opt.fullMatch) ||
            /background(?:-color)?\s*:\s*(?!transparent|none)[^"';]+/i.test(opt.fullMatch) ||
            /class="[^"]*highlight[^"]*"/i.test(opt.fullMatch) ||
            /style="[^"]*color\s*:\s*(?:red|#f00|#ff0000|green|blue)/i.test(opt.fullMatch)
          ) {
            highlightIndex = i;
            break;
          }
        }

        // 5. Kiểm tra bôi đậm (bold/strong) - nếu chỉ DUY NHẤT 1 phương án có nhãn hoặc nội dung được in đậm
        let boldIndex = -1;
        const boldIndices: number[] = [];
        for (let i = 0; i < mcqItems.length; i++) {
          const opt = mcqItems[i]!;
          const hasBoldPrefix = /<(?:strong|b)\b[^>]*>[^<]*[A-D]/i.test(opt.prefixPart);
          const trimmedContent = opt.content.trim();
          const hasBoldEntireContent = /^<(?:strong|b)\b[^>]*>[\s\S]+<\/(?:strong|b)>$/i.test(
            trimmedContent
          );
          if (hasBoldPrefix || hasBoldEntireContent) {
            boldIndices.push(i);
          }
        }
        if (boldIndices.length === 1) {
          boldIndex = boldIndices[0]!;
        }

        // Ưu tiên: Dấu sao '*' -> Gạch chân -> Bôi màu/Highlight -> Bôi đậm duy nhất
        if (starIndex !== -1) {
          correctIndex = starIndex;
        } else if (underlineIndex !== -1) {
          correctIndex = underlineIndex;
        } else if (highlightIndex !== -1) {
          correctIndex = highlightIndex;
        } else if (boldIndex !== -1) {
          correctIndex = boldIndex;
        }
      }

      const options: [RichText, RichText, RichText, RichText] = [
        cleanHtmlToTextAndImages(mcqItems[0]!.content),
        cleanHtmlToTextAndImages(mcqItems[1]!.content),
        cleanHtmlToTextAndImages(mcqItems[2]!.content),
        cleanHtmlToTextAndImages(mcqItems[3]!.content),
      ];

      // Loại bỏ dấu * thừa ở đầu nội dung chữ của các phương án nếu có
      for (let i = 0; i < 4; i++) {
        options[i]!.text = options[i]!.text.replace(/^\s*\*\s*/, '').trim();
      }

      const qObj = {
        id: qId,
        type: 'mcq4' as const,
        stem: stemRichText,
        options,
        correct: correctIndex,
        points,
        explanation,
        difficulty,
        chapter: currentChapter,
        lesson: currentLesson,
      };

      const validateRes = Mcq4QuestionSchema.safeParse(qObj);
      if (validateRes.success) {
        questions.push(validateRes.data);
        continue;
      }
    }

    // C. Kiểm tra TF đơn lẻ
    if (
      trailingAnswer &&
      /^(?:Đúng|Sai|True|False|Đ|S)$/i.test(trailingAnswer) &&
      mcqItems.length === 0
    ) {
      const isCorrect = /^(?:Đúng|True|Đ)$/i.test(trailingAnswer);
      const stemRichText = cleanHtmlToTextAndImages(block);

      const qObj = {
        id: qId,
        type: 'tf' as const,
        stem: stemRichText,
        correct: isCorrect,
        points,
        explanation,
        difficulty,
        chapter: currentChapter,
        lesson: currentLesson,
      };

      const validateRes = TfQuestionSchema.safeParse(qObj);
      if (validateRes.success) {
        questions.push(validateRes.data);
        continue;
      }
    }

    // D. Kiểm tra Short answer
    if (trailingAnswer && mcqItems.length === 0 && tfGroupItems.length === 0) {
      const stemRichText = cleanHtmlToTextAndImages(block);
      const qObj = {
        id: qId,
        type: 'short' as const,
        stem: stemRichText,
        accepted: [trailingAnswer],
        points,
        explanation,
        difficulty,
        chapter: currentChapter,
        lesson: currentLesson,
      };

      const validateRes = ShortQuestionSchema.safeParse(qObj);
      if (validateRes.success) {
        questions.push(validateRes.data);
        continue;
      }
    }

    // E. Kiểm tra Matching (Ghép nối)
    const isMatchingDeclared = /(?:\[|\()\s*(?:Ghép nối|Matching|Nối cột)\s*(?:\]|\))/i.test(block);
    const matchingPairsFound: Record<string, string> = {};
    const pairRegex = /(\d+)\s*(?:->|=>|-|:)\s*([a-zA-Z])/g;
    let pm: RegExpExecArray | null;

    if (trailingAnswer) {
      while ((pm = pairRegex.exec(trailingAnswer)) !== null) {
        if (pm[1] && pm[2]) {
          matchingPairsFound[pm[1]] = pm[2].toLowerCase();
        }
      }
    }
    if (Object.keys(matchingPairsFound).length < 2) {
      const endBlockMatch = block.match(/(?:Đáp án|Cặp ghép|Nối)[:\s]*([^\n<]+)/i);
      if (endBlockMatch && endBlockMatch[1]) {
        while ((pm = pairRegex.exec(endBlockMatch[1])) !== null) {
          if (pm[1] && pm[2]) {
            matchingPairsFound[pm[1]] = pm[2].toLowerCase();
          }
        }
      }
    }

    if (isMatchingDeclared || Object.keys(matchingPairsFound).length >= 2) {
      const leftMatches: Array<{ id: string; text: RichText }> = [];
      const rightMatches: Array<{ id: string; text: RichText }> = [];

      const leftItemRegex =
        /(?:<p[^>]*>|^|\n)\s*(\d+)[\s.):\-–]\s*([\s\S]*?)(?=(?:<p[^>]*>|^|\n)\s*(?:\d+|[a-zA-Z])[\s.):\-–]|$)/g;
      let lim: RegExpExecArray | null;
      while ((lim = leftItemRegex.exec(block)) !== null) {
        if (lim[1] && lim[2]) {
          const itemText = cleanHtmlToTextAndImages(lim[2]);
          if (itemText.text.trim()) {
            leftMatches.push({ id: lim[1], text: itemText });
          }
        }
      }

      const rightItemRegex =
        /(?:<p[^>]*>|^|\n)\s*([a-zA-Z])[\s.):\-–]\s*([\s\S]*?)(?=(?:<p[^>]*>|^|\n)\s*(?:\d+|[a-zA-Z])[\s.):\-–]|$)/g;
      let rim: RegExpExecArray | null;
      while ((rim = rightItemRegex.exec(block)) !== null) {
        if (rim[1] && rim[2]) {
          const itemText = cleanHtmlToTextAndImages(rim[2]);
          if (itemText.text.trim()) {
            rightMatches.push({ id: rim[1].toLowerCase(), text: itemText });
          }
        }
      }

      if (
        leftMatches.length >= 2 &&
        rightMatches.length >= 2 &&
        Object.keys(matchingPairsFound).length >= 2
      ) {
        let stemText = block
          .replace(/(?:\[|\()\s*(?:Ghép nối|Matching|Nối cột)\s*(?:\]|\))/gi, ' ')
          .replace(/(?:<p[^>]*>|^|\n)\s*(?:Cột [AB12]|Nhóm [12])[:\s]*/gi, ' ');
        const firstItemIdx = block.search(/(?:<p[^>]*>|^|\n)\s*(?:1|[a-zA-Z])[\s.):\-–]/);
        if (firstItemIdx > 0) {
          stemText = stemText.slice(0, firstItemIdx);
        }
        const stemRichText = cleanHtmlToTextAndImages(
          stemText.trim() || 'Hãy ghép từng mục ở Cột A với mục tương ứng ở Cột B:'
        );

        const qObj = {
          id: qId,
          type: 'matching' as const,
          stem: stemRichText,
          leftItems: leftMatches,
          rightItems: rightMatches,
          correctPairs: matchingPairsFound,
          points,
          explanation,
          difficulty,
          chapter: currentChapter,
          lesson: currentLesson,
        };

        const validateRes = MatchingQuestionSchema.safeParse(qObj);
        if (validateRes.success) {
          questions.push(validateRes.data);
          continue;
        }
      }
    }

    // F. Kiểm tra Cloze Drag (Điền từ vào ô trống)
    const isClozeDeclared = /(?:\[|\()\s*(?:Điền từ|Kéo thả|Cloze|Kéo từ)\s*(?:\]|\))/i.test(block);
    let cleanedBlockForCloze = block.replace(
      /(?:\[|\()\s*(?:Điền từ|Kéo thả|Cloze|Kéo từ)\s*(?:\]|\))/gi,
      ' '
    );

    let extraWordBank: string[] = [];
    const wordBankMatch = cleanedBlockForCloze.match(
      /(?:<p[^>]*>|^|\n)\s*(?:Từ khóa|Ngân hàng từ|Word bank)[:\s]*([^\n<]+)/i
    );
    if (wordBankMatch && wordBankMatch[1]) {
      extraWordBank = wordBankMatch[1]
        .split(/[,;/|]/)
        .map(w => w.replace(/<[^>]+>/g, '').trim())
        .filter(w => w.length > 0);
      cleanedBlockForCloze = cleanedBlockForCloze.replace(wordBankMatch[0], ' ');
    }

    const blankMatches: Array<{ full: string; answer: string }> = [];
    const clozeBlankRegex = /\[([^\]\n<>]{1,60})\]/g;
    let cbm: RegExpExecArray | null;
    while ((cbm = clozeBlankRegex.exec(cleanedBlockForCloze)) !== null) {
      const rawWord = cbm[1]!.trim();
      if (!/^(?:NB|TH|VD|VDC|M1|M2|M3|M4|Chương|Bài|Lesson|Chapter)$/i.test(rawWord)) {
        blankMatches.push({
          full: cbm[0],
          answer: rawWord,
        });
      }
    }

    if (
      blankMatches.length >= 1 &&
      (isClozeDeclared || blankMatches.length >= 2 || extraWordBank.length > 0)
    ) {
      let templateText = cleanHtmlToTextAndImages(cleanedBlockForCloze).text;
      const blanks = blankMatches.map((bm, bIdx) => {
        const blankId = `blank_${bIdx + 1}`;
        templateText = templateText.replace(bm.full, `[${blankId}]`);
        return {
          id: blankId,
          answer: bm.answer,
        };
      });

      const wordBank = Array.from(new Set([...blanks.map(b => b.answer), ...extraWordBank]));

      const qObj = {
        id: qId,
        type: 'cloze_drag' as const,
        stem: cleanHtmlToTextAndImages(
          isClozeDeclared
            ? 'Hãy chọn từ thích hợp điền vào các ô trống sau:'
            : 'Điền từ thích hợp vào ô trống:'
        ),
        template: templateText.trim(),
        blanks,
        wordBank,
        points,
        explanation,
        difficulty,
        chapter: currentChapter,
        lesson: currentLesson,
      };

      const validateRes = ClozeDragQuestionSchema.safeParse(qObj);
      if (validateRes.success) {
        questions.push(validateRes.data);
        continue;
      }
    }

    // Nếu không khớp loại nào hoặc thiếu dữ liệu, ghi warning
    warnings.push({
      questionIndex: chunk.chunkIndex,
      questionNumberStr: qNum,
      rawText: cleanHtmlToTextAndImages(block).text,
      reason:
        mcqItems.length > 0 && mcqItems.length < 4
          ? `Câu hỏi chỉ tìm thấy ${mcqItems.length}/4 phương án lựa chọn.`
          : 'Không thể nhận diện định dạng câu hỏi hoặc thiếu đáp án.',
    });
  }

  return {
    questions,
    warnings,
    assets: existingAssets,
    totalDetected,
    successCount: questions.length,
    detectedChapter,
    detectedLesson,
  };
}

/**
 * Phân tích trực tiếp tập tin Word (.docx) nhị phân
 */
export async function parseWordDocx(
  docxBuffer: Buffer | ArrayBuffer | Uint8Array
): Promise<ParsedWordExamResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(docxBuffer);

  // 1. Tìm và thay thế công thức toán OMML trong word/document.xml
  const docXmlFile = loadedZip.file('word/document.xml');
  if (docXmlFile) {
    const rawXml = await docXmlFile.async('string');
    const processedXml = replaceOmmlInXml(rawXml);
    loadedZip.file('word/document.xml', processedXml);
  }

  // 2. Tạo buffer đã xử lý OMML
  const modifiedDocxBuffer = await loadedZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  // 3. Trích xuất hình ảnh nhúng qua custom image handler của mammoth
  const extractedAssets: ExtractedDocxAsset[] = [];

  const conversion = await mammoth.convertToHtml(
    { buffer: modifiedDocxBuffer },
    {
      convertImage: mammoth.images.imgElement(async element => {
        const imageBuffer = await element.read();
        const sha256 = createHash('sha256').update(imageBuffer).digest('hex');
        const base64 = imageBuffer.toString('base64');
        const mime = element.contentType ?? 'image/jpeg';

        extractedAssets.push({
          sha256,
          mime,
          base64,
        });

        return {
          src: `/api/assets/${sha256}`,
        };
      }),
    }
  );

  let html = conversion.value;

  // Đảm bảo các thẻ img có thêm thuộc tính data-asset
  html = html.replace(
    /<img([^>]*?)src="\/api\/assets\/([a-f0-9]+)"([^>]*?)>/gi,
    '<img$1src="/api/assets/$2" data-asset="$2"$3>'
  );

  return parseWordHtmlContent(html, extractedAssets);
}

/**
 * Render tệp Word (.docx) sang HTML để xem trước nhanh
 */
export async function renderDocxToHtml(docxBuffer: Buffer): Promise<string> {
  const conversion = await mammoth.convertToHtml({ buffer: docxBuffer });
  return conversion.value;
}

/**
 * Trích xuất tóm tắt các slide của tệp PowerPoint (.pptx)
 */
export async function extractPptxSummary(
  pptxBuffer: Buffer
): Promise<Array<{ title?: string; text: string }>> {
  try {
    const zip = await JSZip.loadAsync(pptxBuffer);
    const slideFiles = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f));
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    const slides: Array<{ title?: string; text: string }> = [];

    for (const file of slideFiles) {
      const entry = zip.file(file);
      if (!entry) continue;
      const xml = await entry.async('string');
      // Trích xuất các đoạn văn bản trong thẻ <a:t>
      const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
      const texts = matches
        .map(m => m.replace(/<\/?a:t[^>]*>/g, '').trim())
        .filter(t => t.length > 0);

      const title = texts.length > 0 ? texts[0] : undefined;
      const text = texts.length > 1 ? texts.slice(1).join('\n') : texts[0] || '';

      if (title !== undefined) {
        slides.push({ title, text });
      } else {
        slides.push({ text });
      }
    }

    return slides;
  } catch {
    return [];
  }
}
