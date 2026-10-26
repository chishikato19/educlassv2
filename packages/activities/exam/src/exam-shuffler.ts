import {
  stripAnswerKey,
  type Question,
  type QuestionPublic,
  type RichText,
  type StudentAnswer,
} from '@educlass/question-kit';

/**
 * Thuật toán sinh số ngẫu nhiên xác định Mulberry32 dựa trên seed (chuỗi hoặc số)
 */
export function createSeededRandom(seedInput: string | number): () => number {
  let s: number;
  if (typeof seedInput === 'number') {
    s = seedInput >>> 0;
  } else {
    // Hash chuỗi thành số 32-bit (djb2 hash)
    let hash = 5381;
    for (let i = 0; i < seedInput.length; i++) {
      hash = ((hash << 5) + hash + seedInput.charCodeAt(i)) >>> 0;
    }
    s = hash;
  }

  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Xáo trộn một mảng bằng thuật toán Fisher-Yates với PRNG tùy chỉnh
 */
export function shuffleArray<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export interface StudentExamVariant {
  /** Danh sách câu hỏi công khai đã được xáo trộn thứ tự và xáo đáp án theo từng học sinh */
  publicQuestions: QuestionPublic[];
  /** Danh sách questionId theo thứ tự câu hỏi riêng của học sinh này */
  questionOrder: string[];
  /** Ánh xạ hoán vị các lựa chọn cho từng câu mcq4: questionId -> [chỉ số gốc của vị trí 0, 1, 2, 3] */
  optionOrders: Record<string, number[]>;
}

export interface GenerateVariantOptions {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  seed: string | number;
}

/**
 * Tạo một đề thi riêng biệt cho từng học sinh:
 * - Xáo câu hỏi nếu shuffleQuestions = true
 * - Xáo thứ tự 4 đáp án cho các câu mcq4 nếu shuffleOptions = true
 * - Đảm bảo strip toàn bộ đáp án đúng trước khi trả về
 */
export function generateStudentExamVariant(
  originalQuestions: Question[],
  options: GenerateVariantOptions
): StudentExamVariant {
  const rng = createSeededRandom(options.seed);

  // 1. Xáo thứ tự các câu hỏi nếu được bật
  let orderedQuestions = [...originalQuestions];
  if (options.shuffleQuestions && orderedQuestions.length > 1) {
    orderedQuestions = shuffleArray(orderedQuestions, rng);
  }

  const questionOrder = orderedQuestions.map(q => q.id);
  const optionOrders: Record<string, number[]> = {};
  const publicQuestions: QuestionPublic[] = [];

  // 2. Duyệt qua từng câu hỏi và tạo bản QuestionPublic
  for (const q of orderedQuestions) {
    const stripped = stripAnswerKey(q);

    if (stripped.type === 'mcq4' && options.shuffleOptions) {
      // Hoán vị các chỉ số [0, 1, 2, 3]
      const originalIndices = [0, 1, 2, 3];
      const shuffledIndices = shuffleArray(originalIndices, rng);
      optionOrders[q.id] = shuffledIndices;

      // Xếp lại các lựa chọn theo thứ tự đã xáo
      const newOptions: [RichText, RichText, RichText, RichText] = [
        stripped.options[shuffledIndices[0]!]!,
        stripped.options[shuffledIndices[1]!]!,
        stripped.options[shuffledIndices[2]!]!,
        stripped.options[shuffledIndices[3]!]!,
      ];

      publicQuestions.push({
        ...stripped,
        options: newOptions,
      });
    } else {
      publicQuestions.push(stripped);
    }
  }

  return {
    publicQuestions,
    questionOrder,
    optionOrders,
  };
}

/**
 * Ánh xạ ngược đáp án học sinh đã chọn trên đề xáo về đáp án tương ứng của câu hỏi gốc:
 * - Với mcq4: optionOrders[q.id][studentSelected] -> chỉ số option gốc
 * - Giúp server chấm điểm chính xác theo câu hỏi gốc mà học sinh không thể biết đáp án
 */
export function unmapStudentAnswer(
  originalQuestion: Question,
  rawStudentAnswer: unknown,
  optionOrder?: number[]
): StudentAnswer | null {
  if (rawStudentAnswer === undefined || rawStudentAnswer === null) {
    return null;
  }

  switch (originalQuestion.type) {
    case 'mcq4': {
      let selectedIndex: number | null = null;
      if (typeof rawStudentAnswer === 'number') {
        selectedIndex = rawStudentAnswer;
      } else if (
        typeof rawStudentAnswer === 'object' &&
        rawStudentAnswer !== null &&
        'selected' in rawStudentAnswer
      ) {
        selectedIndex = Number((rawStudentAnswer as { selected: unknown }).selected);
      }

      if (selectedIndex === null || isNaN(selectedIndex)) {
        return null;
      }

      // Nếu có bảng hoán vị optionOrders: ánh xạ ngược lại vị trí gốc
      let originalSelected = selectedIndex;
      if (optionOrder && optionOrder.length === 4 && selectedIndex >= 0 && selectedIndex < 4) {
        originalSelected = optionOrder[selectedIndex]!;
      }

      return {
        type: 'mcq4',
        questionId: originalQuestion.id,
        selected: originalSelected,
      };
    }

    case 'tf': {
      let selectedBool: boolean | null = null;
      if (typeof rawStudentAnswer === 'boolean') {
        selectedBool = rawStudentAnswer;
      } else if (
        typeof rawStudentAnswer === 'object' &&
        rawStudentAnswer !== null &&
        'selected' in rawStudentAnswer
      ) {
        selectedBool = Boolean((rawStudentAnswer as { selected: unknown }).selected);
      }

      if (selectedBool === null) return null;

      return {
        type: 'tf',
        questionId: originalQuestion.id,
        selected: selectedBool,
      };
    }

    case 'tf_group': {
      // rawStudentAnswer có thể là mảng 4 boolean [true, false, true, true]
      // hoặc object { items: [{ selected: true }, ...] }
      let selections: Array<boolean | null> = [null, null, null, null];
      if (Array.isArray(rawStudentAnswer)) {
        selections = rawStudentAnswer.map(v => (typeof v === 'boolean' ? v : null));
      } else if (
        typeof rawStudentAnswer === 'object' &&
        rawStudentAnswer !== null &&
        'items' in rawStudentAnswer
      ) {
        const items = (rawStudentAnswer as { items: Array<{ selected?: unknown }> }).items;
        if (Array.isArray(items)) {
          selections = items.map(it => (typeof it?.selected === 'boolean' ? it.selected : null));
        }
      }

      return {
        type: 'tf_group',
        questionId: originalQuestion.id,
        selected: [
          selections[0] ?? null,
          selections[1] ?? null,
          selections[2] ?? null,
          selections[3] ?? null,
        ],
      };
    }

    case 'short': {
      let text = '';
      if (typeof rawStudentAnswer === 'string') {
        text = rawStudentAnswer;
      } else if (
        typeof rawStudentAnswer === 'object' &&
        rawStudentAnswer !== null &&
        'text' in rawStudentAnswer
      ) {
        text = String((rawStudentAnswer as { text: unknown }).text ?? '');
      }

      return {
        type: 'short',
        questionId: originalQuestion.id,
        text,
      };
    }

    case 'matching': {
      let pairs: Record<string, string | null> = {};
      if (typeof rawStudentAnswer === 'object' && rawStudentAnswer !== null) {
        if ('pairs' in rawStudentAnswer) {
          pairs = (rawStudentAnswer as { pairs: Record<string, string | null> }).pairs || {};
        } else {
          pairs = rawStudentAnswer as Record<string, string | null>;
        }
      }
      return {
        type: 'matching',
        questionId: originalQuestion.id,
        pairs,
      };
    }

    case 'cloze_drag': {
      let filled: Record<string, string | null> = {};
      if (typeof rawStudentAnswer === 'object' && rawStudentAnswer !== null) {
        if ('filled' in rawStudentAnswer) {
          filled = (rawStudentAnswer as { filled: Record<string, string | null> }).filled || {};
        } else {
          filled = rawStudentAnswer as Record<string, string | null>;
        }
      }
      return {
        type: 'cloze_drag',
        questionId: originalQuestion.id,
        filled,
      };
    }

    default:
      return null;
  }
}
