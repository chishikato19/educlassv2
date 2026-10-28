// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentAvatar } from '../components/StudentAvatar.js';
import { ExpLevelBar } from '../components/ExpLevelBar.js';
import { TitleBadge } from '../components/TitleBadge.js';
import { AvatarCustomizer } from '../components/AvatarCustomizer.js';

describe('Gamification UI Components', () => {
  describe('StudentAvatar', () => {
    it('renders vector avatar with default configuration', () => {
      const { container } = render(<StudentAvatar />);
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
      expect(svg).not.toBeNull();
    });

    it('renders customized avatar with accessories and specific base', () => {
      const { container } = render(
        <StudentAvatar
          config={{
            base: 'dragon',
            color: '#FFB020',
            headwear: 'crown',
            glasses: 'sunglasses',
            outfit: 'wizard_robe',
          }}
          size="2xl"
        />
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });

  describe('ExpLevelBar', () => {
    it('renders level badge and progress bar with calculated percentage', () => {
      render(<ExpLevelBar level={3} currentExp={50} maxExp={100} />);

      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText('50 / 100 EXP')).toBeDefined();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('50');
    });

    it('handles explicit progress percent', () => {
      render(<ExpLevelBar level={5} progressPercent={85} showExpLabel={false} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('85');
    });
  });

  describe('TitleBadge', () => {
    it('renders title badge with name and unlocked state', () => {
      const handleClick = vi.fn();
      render(
        <TitleBadge name="Học sinh chăm chỉ" iconKey="star" unlocked={true} onClick={handleClick} />
      );

      const badge = screen.getByText('Học sinh chăm chỉ');
      expect(badge).toBeDefined();
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders locked title badge with lock indicator', () => {
      const { container } = render(
        <TitleBadge
          name="Thủ khoa trường thi"
          iconKey="crown"
          unlocked={false}
          description="Đạt điểm cao nhất 3 bài thi"
          showDescription={true}
        />
      );

      expect(screen.getByText('Thủ khoa trường thi')).toBeDefined();
      expect(screen.getByText('(Đạt điểm cao nhất 3 bài thi)')).toBeDefined();
      const rect = container.querySelector('rect');
      expect(rect).not.toBeNull(); // Biểu tượng ổ khóa
    });
  });

  describe('AvatarCustomizer', () => {
    it('allows changing items and saving custom avatar', () => {
      const handleSave = vi.fn();
      render(
        <AvatarCustomizer
          studentLevel={3}
          currentConfig={{ base: 'cat', color: '#4F8CFF' }}
          onSave={handleSave}
        />
      );

      // Xem trước diện mạo
      expect(screen.getByText('Xem trước diện mạo')).toBeDefined();

      // Đổi sang tab Màu sắc
      const colorTab = screen.getByText('Màu sắc');
      fireEvent.click(colorTab);
      expect(screen.getByText('Cam vàng')).toBeDefined();

      // Bấm nút Lưu diện mạo
      const saveBtn = screen.getByText('Lưu diện mạo');
      fireEvent.click(saveBtn);
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    it('restricts locked items based on level', () => {
      render(<AvatarCustomizer studentLevel={1} currentConfig={{ base: 'cat' }} />);

      // Rồng thần cần level 5 nên bị khóa ở level 1
      const dragonBtn = screen.getByTitle('Cần đạt Cấp độ 5');
      expect(dragonBtn.hasAttribute('disabled')).toBe(true);
    });
  });
});
