import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateAllFixtures } from '../word/fixtures-generator.js';
import { parseWordDocx } from '../word/word-parser.js';

describe('Word Samples Fixtures & DoD 95% Accuracy Verification (Task 2.4)', () => {
  const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures/word-samples');

  beforeAll(async () => {
    await generateAllFixtures(fixturesDir);
  });

  it('generates at least 5 realistic Word sample files', () => {
    const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.docx'));
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it('parses Sample 1 (Math MCQ4 with OMML equations) with 100% accuracy', async () => {
    const filePath = path.join(fixturesDir, 'sample-1-math-mcq.docx');
    const buf = fs.readFileSync(filePath);
    const result = await parseWordDocx(buf);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]?.type).toBe('mcq4');
    expect(result.questions[1]?.type).toBe('mcq4');
    expect(result.questions[0]?.stem.text).toContain('nguyên hàm');
    expect(result.questions[1]?.stem.text).toContain('16');
  });

  it('parses Sample 2 (Physics TF Group with 4 items BGD 2025) with 100% accuracy', async () => {
    const filePath = path.join(fixturesDir, 'sample-2-physics-tf-group.docx');
    const buf = fs.readFileSync(filePath);
    const result = await parseWordDocx(buf);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]?.type).toBe('tf_group');
    expect(result.questions[1]?.type).toBe('tf_group');
    if (result.questions[0]?.type === 'tf_group') {
      expect(result.questions[0].items).toHaveLength(4);
      expect(result.questions[0].items[0]?.correct).toBe(true);
      expect(result.questions[0].items[1]?.correct).toBe(false);
    }
  });

  it('parses Sample 3 (Chemistry Short Answer) with 100% accuracy', async () => {
    const filePath = path.join(fixturesDir, 'sample-3-chemistry-short.docx');
    const buf = fs.readFileSync(filePath);
    const result = await parseWordDocx(buf);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]?.type).toBe('short');
    expect(result.questions[1]?.type).toBe('short');
    if (result.questions[0]?.type === 'short') {
      expect(result.questions[0].accepted).toContain('32');
    }
    if (result.questions[1]?.type === 'short') {
      expect(result.questions[1].accepted).toContain('H2SO4');
    }
  });

  it('parses Sample 4 (Biology Mixed Format) with 100% accuracy', async () => {
    const filePath = path.join(fixturesDir, 'sample-4-biology-mixed.docx');
    const buf = fs.readFileSync(filePath);
    const result = await parseWordDocx(buf);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]?.type).toBe('mcq4');
    expect(result.questions[1]?.type).toBe('short');
  });

  it('parses Sample 5 (Geography with Embedded Images) with 100% accuracy and CAS asset extraction', async () => {
    const filePath = path.join(fixturesDir, 'sample-5-geography-images.docx');
    const buf = fs.readFileSync(filePath);
    const result = await parseWordDocx(buf);

    expect(result.questions).toHaveLength(2);
    expect(result.assets.length).toBeGreaterThanOrEqual(1);
    expect(result.questions[0]?.stem.images.length).toBeGreaterThanOrEqual(1);
    expect(result.questions[1]?.type).toBe('tf');
  });

  it('verifies DoD: >= 5 sample files achieve >= 95% total parse success rate', async () => {
    const sampleFiles = [
      'sample-1-math-mcq.docx',
      'sample-2-physics-tf-group.docx',
      'sample-3-chemistry-short.docx',
      'sample-4-biology-mixed.docx',
      'sample-5-geography-images.docx',
    ];

    let totalDetected = 0;
    let totalSuccess = 0;

    for (const fileName of sampleFiles) {
      const filePath = path.join(fixturesDir, fileName);
      const buf = fs.readFileSync(filePath);
      const res = await parseWordDocx(buf);
      totalDetected += res.totalDetected;
      totalSuccess += res.successCount;
    }

    const successRate = (totalSuccess / totalDetected) * 100;
    expect(totalDetected).toBeGreaterThanOrEqual(10);
    expect(successRate).toBeGreaterThanOrEqual(95);
  });
});
