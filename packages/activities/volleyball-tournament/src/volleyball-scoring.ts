import type { VolleyballMatchupResult, VolleyballQuestion } from './volleyball-schemas.js';

export function toOptionIndex(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, '0': 0, '1': 1, '2': 2, '3': 3 };
    if (s in map) return map[s]!;
    const n = Number(s);
    if (!isNaN(n)) return n;
  }
  return -1;
}

export function shuffleList<T>(array: T[], rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function shuffleQuestionOptions(
  question: VolleyballQuestion,
  rng: () => number = Math.random
): VolleyballQuestion {
  if (question.type !== 'mcq4' || !question.options || question.options.length <= 1) {
    return question;
  }

  const origIdx = toOptionIndex(question.correctAnswer);
  const origText =
    typeof question.correctAnswer === 'string'
      ? question.correctAnswer.trim().toLowerCase()
      : undefined;

  const paired = question.options.map((text, index) => {
    const isCorrect =
      origIdx >= 0
        ? index === origIdx
        : origText !== undefined && text.trim().toLowerCase() === origText;
    return { text, isCorrect };
  });

  for (let i = paired.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = paired[i]!;
    paired[i] = paired[j]!;
    paired[j] = temp;
  }

  const shuffledOptions = paired.map(p => p.text);
  const newCorrectIdx = paired.findIndex(p => p.isCorrect);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : question.correctAnswer,
  };
}

function toBooleanVal(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === 'đúng' || s === 't' || s === '1') return true;
    if (s === 'false' || s === 'sai' || s === 'f' || s === '0') return false;
  }
  return Boolean(val);
}

export function checkVolleyballAnswerCorrectness(
  question: VolleyballQuestion,
  studentAnswer: unknown
): boolean {
  if (studentAnswer === undefined || studentAnswer === null) {
    return false;
  }

  switch (question.type) {
    case 'mcq4': {
      const studentIdx = toOptionIndex(studentAnswer);
      const correctIdx = toOptionIndex(question.correctAnswer);
      return studentIdx >= 0 && studentIdx === correctIdx;
    }
    case 'tf': {
      return toBooleanVal(studentAnswer) === toBooleanVal(question.correctAnswer);
    }
    case 'short': {
      const cleanStudent = String(studentAnswer).trim().toLowerCase();
      if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer.some(
          ans => String(ans).trim().toLowerCase() === cleanStudent
        );
      }
      return String(question.correctAnswer).trim().toLowerCase() === cleanStudent;
    }
    default:
      return false;
  }
}

export function evaluateMatchupResult(
  player1Correct: number,
  player2Correct: number
): VolleyballMatchupResult {
  if (player1Correct > player2Correct) {
    return 'player1_win';
  }
  if (player2Correct > player1Correct) {
    return 'player2_win';
  }
  return 'draw';
}
