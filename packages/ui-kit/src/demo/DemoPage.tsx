import React, { useState } from 'react';
import { Banner } from '../components/Banner.js';
import { Button } from '../components/Button.js';
import { Card } from '../components/Card.js';
import { Input } from '../components/Input.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';
import { KAHOOT_SHAPES, UI_COLORS, UI_TYPOGRAPHY } from '../tokens/index.js';

export const DemoPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  return (
    <div
      style={{
        backgroundColor: UI_COLORS.background,
        minHeight: '100vh',
        padding: '24px',
        fontFamily: UI_TYPOGRAPHY.fontFamily,
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Banner mất kết nối / thông báo */}
      <div style={{ marginBottom: '24px' }}>
        <Banner
          type="warning"
          message="Đang kết nối lại… Dữ liệu làm bài thi vẫn được lưu trên máy chủ."
          actionText="Thử lại ngay"
          onAction={() => setToastMessage('Đã gửi yêu cầu kết nối lại!')}
        />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: UI_TYPOGRAPHY.titleSizeLarge, color: UI_COLORS.text }}>
          EduClass v2 — UI Kit Demo
        </h1>
        <p style={{ fontSize: UI_TYPOGRAPHY.bodySizeStudent, color: UI_COLORS.textMuted }}>
          Thiết kế tươi sáng, bo góc thân thiện, đảm bảo vùng chạm ≥ 48px và hỗ trợ học sinh mù màu.
        </p>

        {/* 2. Toast preview nếu có */}
        {toastMessage && (
          <div style={{ marginBottom: '16px' }}>
            <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
          </div>
        )}

        {/* 3. Card Button Showcase */}
        <Card title="1. Nút bấm (Buttons) & Đáp án Kahoot">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <Button variant="primary" onClick={() => setToastMessage('Bấm nút Chính')}>
              Nút Chính
            </Button>
            <Button variant="secondary" onClick={() => setToastMessage('Bấm nút Phụ')}>
              Nút Phụ
            </Button>
            <Button variant="success" onClick={() => setToastMessage('Đúng rồi!')}>
              Chính xác (+10 EXP)
            </Button>
            <Button variant="danger" onClick={() => setToastMessage('Rất tiếc, sai rồi!')}>
              Báo lỗi
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(true)}>
              Mở Hộp thoại (Modal)
            </Button>
          </div>

          <h4 style={{ margin: '16px 0 8px 0', color: UI_COLORS.text }}>
            4 Màu đáp án Kahoot kèm Hình khối (▲◆●■):
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            <Button
              variant="kahoot_red"
              fullWidth
              onClick={() => setToastMessage(`Chọn ${KAHOOT_SHAPES.red.label}`)}
            >
              Đáp án A
            </Button>
            <Button
              variant="kahoot_blue"
              fullWidth
              onClick={() => setToastMessage(`Chọn ${KAHOOT_SHAPES.blue.label}`)}
            >
              Đáp án B
            </Button>
            <Button
              variant="kahoot_yellow"
              fullWidth
              onClick={() => setToastMessage(`Chọn ${KAHOOT_SHAPES.yellow.label}`)}
            >
              Đáp án C
            </Button>
            <Button
              variant="kahoot_green"
              fullWidth
              onClick={() => setToastMessage(`Chọn ${KAHOOT_SHAPES.green.label}`)}
            >
              Đáp án D
            </Button>
          </div>
        </Card>

        {/* 4. Card Form Input */}
        <div style={{ marginTop: '24px' }}>
          <Card title="2. Ô nhập liệu (Input) tiếng Việt">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Mã vào lớp (6 ký tự)"
                placeholder="Ví dụ: K6X9Z2"
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  if (e.target.value.length > 0 && e.target.value.length < 6) {
                    setInputError('Mã vào lớp phải đủ 6 ký tự.');
                  } else {
                    setInputError('');
                  }
                }}
                error={inputError || undefined}
                helperText="Nhập mã do thầy/cô cung cấp trên màn hình chiếu"
              />

              <Button
                variant="primary"
                onClick={() => {
                  if (inputValue.length !== 6) {
                    setInputError('Mã vào lớp phải gồm đúng 6 ký tự.');
                  } else {
                    setToastMessage(`Đã vào lớp với mã ${inputValue}!`);
                  }
                }}
              >
                Vào lớp học ngay
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. Modal Popup */}
      <Modal
        isOpen={modalOpen}
        title="Xác nhận nộp bài thi"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Làm tiếp
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setModalOpen(false);
                setToastMessage('Đã nộp bài thi thành công!');
              }}
            >
              Xác nhận nộp bài
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Bạn đã hoàn thành <strong>25/25</strong> câu hỏi. Sau khi nộp bài, bạn sẽ không thể thay
          đổi câu trả lời.
        </p>
      </Modal>
    </div>
  );
};
