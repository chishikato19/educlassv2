// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DifficultyFilterBar, getDifficultyBadgeInfo } from '../components/DifficultyFilterBar.js';

describe('DifficultyFilterBar Component (Task 3.2)', () => {
  it('renders all 4 difficulty levels and All button', () => {
    const onSelect = vi.fn();
    render(
      <DifficultyFilterBar
        selectedDifficulty="all"
        onSelectDifficulty={onSelect}
        counts={{ nb: 5, th: 3, vd: 2, vdc: 1 }}
      />
    );

    expect(screen.getByText('Tất cả')).toBeDefined();
    expect(screen.getByText('Nhận biết')).toBeDefined();
    expect(screen.getByText('Thông hiểu')).toBeDefined();
    expect(screen.getByText('Vận dụng')).toBeDefined();
    expect(screen.getByText('Vận dụng cao')).toBeDefined();

    // Kiểm tra tổng số câu: 5 + 3 + 2 + 1 = 11
    expect(screen.getByText('11')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('triggers onSelectDifficulty callback when button clicked', () => {
    const onSelect = vi.fn();
    render(<DifficultyFilterBar selectedDifficulty="all" onSelectDifficulty={onSelect} />);

    const nbBtn = screen.getByTitle('Nhận biết (NB)');
    fireEvent.click(nbBtn);
    expect(onSelect).toHaveBeenCalledWith('nb');

    const vdcBtn = screen.getByTitle('Vận dụng cao (VDC)');
    fireEvent.click(vdcBtn);
    expect(onSelect).toHaveBeenCalledWith('vdc');
  });

  it('returns valid config from getDifficultyBadgeInfo', () => {
    const infoNb = getDifficultyBadgeInfo('nb');
    expect(infoNb.label).toBe('Nhận biết');
    expect(infoNb.shortLabel).toBe('NB');
    expect(infoNb.shapeIcon).toBe('●');

    const infoVdc = getDifficultyBadgeInfo('vdc');
    expect(infoVdc.label).toBe('Vận dụng cao');
    expect(infoVdc.shapeIcon).toBe('◆');
  });
});
