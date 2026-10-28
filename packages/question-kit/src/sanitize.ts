import type { Question, QuestionPublic } from './schemas/question.js';

/**
 * Loại bỏ toàn bộ đáp án đúng, barem điểm và lời giải chi tiết
 * để tạo đối tượng QuestionPublic an toàn tuyệt đối khi gửi xuống cho học sinh
 */
export function stripAnswerKey(question: Question): QuestionPublic {
  switch (question.type) {
    case 'mcq4':
      return {
        id: question.id,
        type: 'mcq4',
        stem: question.stem,
        options: question.options,
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };

    case 'tf':
      return {
        id: question.id,
        type: 'tf',
        stem: question.stem,
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };

    case 'tf_group':
      return {
        id: question.id,
        type: 'tf_group',
        stem: question.stem,
        items: [
          { text: question.items[0].text },
          { text: question.items[1].text },
          { text: question.items[2].text },
          { text: question.items[3].text },
        ],
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };

    case 'short':
      return {
        id: question.id,
        type: 'short',
        stem: question.stem,
        ...(question.placeholder ? { placeholder: question.placeholder } : {}),
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };

    case 'matching':
      return {
        id: question.id,
        type: 'matching',
        stem: question.stem,
        leftItems: question.leftItems,
        rightItems: question.rightItems,
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };

    case 'cloze_drag':
      return {
        id: question.id,
        type: 'cloze_drag',
        stem: question.stem,
        template: question.template,
        blanks: question.blanks.map(b => ({
          id: b.id,
          ...(b.hint !== undefined ? { hint: b.hint } : {}),
        })),
        wordBank: question.wordBank,
        points: question.points,
        ...(question.orderIndex !== undefined ? { orderIndex: question.orderIndex } : {}),
      };
  }
}
