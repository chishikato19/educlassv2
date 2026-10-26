// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Banner } from '../components/Banner.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { Input } from '../components/Input.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

describe('UI Kit Components', () => {
  describe('Button', () => {
    it('renders with label and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Vào lớp</Button>);
      const btn = screen.getByRole('button', { name: /Vào lớp/i });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders Kahoot variants with geometric shapes', () => {
      render(
        <div>
          <Button variant="kahoot_red">Đáp án A</Button>
          <Button variant="kahoot_blue">Đáp án B</Button>
          <Button variant="kahoot_yellow">Đáp án C</Button>
          <Button variant="kahoot_green">Đáp án D</Button>
        </div>
      );

      expect(screen.getByText('▲')).toBeDefined();
      expect(screen.getByText('◆')).toBeDefined();
      expect(screen.getByText('●')).toBeDefined();
      expect(screen.getByText('■')).toBeDefined();
    });

    it('disables button when loading or disabled prop is set', () => {
      const handleClick = vi.fn();
      render(
        <Button loading disabled onClick={handleClick}>
          Đang nộp bài...
        </Button>
      );
      const btn = screen.getByRole('button');
      expect(btn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('renders title and content', () => {
      render(
        <Card title="Thông tin học sinh">
          <p>Điểm EXP: 150</p>
        </Card>
      );
      expect(screen.getByText('Thông tin học sinh')).toBeDefined();
      expect(screen.getByText('Điểm EXP: 150')).toBeDefined();
    });
  });

  describe('Input', () => {
    it('renders input with label and handles change', () => {
      const handleChange = vi.fn();
      render(<Input label="Mã vào lớp" placeholder="Nhập 6 ký tự" onChange={handleChange} />);
      expect(screen.getByText('Mã vào lớp')).toBeDefined();
      const input = screen.getByPlaceholderText('Nhập 6 ký tự');
      fireEvent.change(input, { target: { value: 'ABC123' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('displays Vietnamese error message when error prop is provided', () => {
      render(<Input label="Mã PIN" error="Mã PIN không chính xác. Vui lòng thử lại." />);
      expect(screen.getByText('Mã PIN không chính xác. Vui lòng thử lại.')).toBeDefined();
    });
  });

  describe('Modal', () => {
    it('renders modal content when isOpen is true and triggers onClose', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} title="Xác nhận nộp bài" onClose={handleClose}>
          <p>Bạn có chắc chắn muốn nộp bài thi?</p>
        </Modal>
      );

      expect(screen.getByText('Xác nhận nộp bài')).toBeDefined();
      expect(screen.getByText('Bạn có chắc chắn muốn nộp bài thi?')).toBeDefined();

      const closeBtn = screen.getByRole('button', { name: /Đóng/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render modal when isOpen is false', () => {
      render(
        <Modal isOpen={false} title="Ẩn" onClose={() => {}}>
          <p>Nội dung ẩn</p>
        </Modal>
      );
      expect(screen.queryByText('Nội dung ẩn')).toBeNull();
    });
  });

  describe('Toast', () => {
    it('renders toast with message and triggers onClose', () => {
      const handleClose = vi.fn();
      render(<Toast type="success" message="Bạn đã nhận được +20 EXP!" onClose={handleClose} />);

      expect(screen.getByText('Bạn đã nhận được +20 EXP!')).toBeDefined();
      const closeBtn = screen.getByRole('button', { name: /Tắt/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Banner', () => {
    it('renders connection banner with Vietnamese message and action button', () => {
      const handleRetry = vi.fn();
      render(
        <Banner
          type="warning"
          message="Đang kết nối lại… Dữ liệu làm bài vẫn được giữ nguyên."
          actionText="Thử lại ngay"
          onAction={handleRetry}
        />
      );

      expect(
        screen.getByText('Đang kết nối lại… Dữ liệu làm bài vẫn được giữ nguyên.')
      ).toBeDefined();

      const retryBtn = screen.getByRole('button', { name: /Thử lại ngay/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
