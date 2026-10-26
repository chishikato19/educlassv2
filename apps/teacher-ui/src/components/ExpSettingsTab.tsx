import React, { useEffect, useState } from 'react';
import type { RewardRuleDto, RewardRuleItemInput } from '@educlass/protocol';
import {
  Button,
  Card,
  Modal,
  Toast,
  UI_COLORS,
  UI_RADII,
  UI_SHADOWS,
  UI_SPACING,
  UI_TYPOGRAPHY,
} from '@educlass/ui-kit';

const spacing = {
  xs: UI_SPACING.buttonGap,
  sm: UI_SPACING.sm,
  md: UI_SPACING.md,
  lg: UI_SPACING.lg,
  xl: UI_SPACING.xl,
  xxl: '48px',
};
const colors = {
  primary: UI_COLORS.primary,
  secondary: UI_COLORS.secondary,
  background: UI_COLORS.background,
  border: UI_COLORS.border,
  textPrimary: UI_COLORS.text,
  textSecondary: UI_COLORS.textMuted,
};
const borderRadius = {
  button: UI_RADII.button,
  card: UI_RADII.card,
  modal: UI_RADII.modal,
};
const shadows = UI_SHADOWS;
const typography = {
  heading2: UI_TYPOGRAPHY.titleSize,
  heading3: UI_TYPOGRAPHY.titleSizeSmall,
  body: UI_TYPOGRAPHY.bodySizeTeacher,
};

export interface ExpSettingsTabProps {
  globalRules?: RewardRuleDto[] | undefined;
  teacherRules?: RewardRuleDto[] | undefined;
  effectiveRules?: RewardRuleDto[] | undefined;
  sessionCap?: number | null | undefined;
  activityCaps?: Record<string, number> | undefined;
  isLoading?: boolean | undefined;
  onSaveRules: (rules: RewardRuleItemInput[]) => Promise<void> | void;
  onResetRules: () => Promise<void> | void;
}

interface RuleConfigRow {
  key: string;
  activityId: string | null;
  trigger: string;
  name: string;
  description: string;
  category: 'caps' | 'quiz' | 'poll' | 'exam' | 'wheel' | 'attendance';
  exp: number;
  enabled: boolean;
  isCustomized: boolean;
}

const RULE_METADATA: Array<{
  activityId: string | null;
  trigger: string;
  name: string;
  description: string;
  category: RuleConfigRow['category'];
  defaultExp: number;
}> = [
  // 1. Trần EXP (Anti-Inflation Caps)
  {
    activityId: null,
    trigger: 'session_cap',
    name: 'Trần EXP toàn phiên',
    description: 'Giới hạn tối đa EXP một học sinh có thể nhận trong cả buổi học',
    category: 'caps',
    defaultExp: 200,
  },
  {
    activityId: 'quiz_live',
    trigger: 'activity_cap',
    name: 'Trần EXP Quiz Live',
    description: 'Giới hạn tối đa EXP trong một bài Quiz',
    category: 'caps',
    defaultExp: 100,
  },
  {
    activityId: 'quick_poll',
    trigger: 'activity_cap',
    name: 'Trần EXP Bình chọn nhanh',
    description: 'Giới hạn tối đa EXP trong một lần khảo sát',
    category: 'caps',
    defaultExp: 30,
  },
  {
    activityId: 'exam',
    trigger: 'activity_cap',
    name: 'Trần EXP Kỳ thi',
    description: 'Giới hạn tối đa EXP trong một kỳ thi',
    category: 'caps',
    defaultExp: 80,
  },
  {
    activityId: 'wheel',
    trigger: 'activity_cap',
    name: 'Trần EXP Vòng quay',
    description: 'Giới hạn tối đa EXP khi quay thưởng',
    category: 'caps',
    defaultExp: 50,
  },

  // 2. Quiz Live
  {
    activityId: 'quiz_live',
    trigger: 'correct',
    name: 'Trả lời đúng 1 câu',
    description: 'Thưởng ngay khi học sinh chọn đáp án chính xác',
    category: 'quiz',
    defaultExp: 10,
  },
  {
    activityId: 'quiz_live',
    trigger: 'complete',
    name: 'Hoàn thành bài Quiz',
    description: 'Thưởng khi tham gia đủ các câu hỏi',
    category: 'quiz',
    defaultExp: 20,
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_1',
    name: 'Top 1 BXH Quiz',
    description: 'Thưởng dành cho quán quân dẫn đầu bài thi',
    category: 'quiz',
    defaultExp: 50,
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_2',
    name: 'Top 2 BXH Quiz',
    description: 'Thưởng cho á quân về nhì',
    category: 'quiz',
    defaultExp: 30,
  },
  {
    activityId: 'quiz_live',
    trigger: 'rank_3',
    name: 'Top 3 BXH Quiz',
    description: 'Thưởng cho học sinh về ba',
    category: 'quiz',
    defaultExp: 20,
  },

  // 3. Quick Poll (Bình chọn nhanh)
  {
    activityId: 'quick_poll',
    trigger: 'participate',
    name: 'Tham gia bình chọn',
    description: 'Thưởng khi học sinh bỏ phiếu ý kiến',
    category: 'poll',
    defaultExp: 10,
  },

  // 4. Kỳ thi (Exam)
  {
    activityId: 'exam',
    trigger: 'complete',
    name: 'Hoàn thành kỳ thi',
    description: 'Thưởng khi nộp bài thi đầy đủ',
    category: 'exam',
    defaultExp: 30,
  },
  {
    activityId: 'exam',
    trigger: 'score_high',
    name: 'Điểm giỏi (≥ 8.0)',
    description: 'Thưởng khích lệ khi đạt điểm cao',
    category: 'exam',
    defaultExp: 20,
  },

  // 5. Vòng quay (Wheel)
  {
    activityId: 'wheel',
    trigger: 'correct',
    name: 'Được chọn & Trả lời đúng',
    description: 'Thưởng khi học sinh may mắn được gọi và trả lời đúng',
    category: 'wheel',
    defaultExp: 15,
  },

  // 6. Chuyên cần (Attendance)
  {
    activityId: null,
    trigger: 'attendance',
    name: 'Chuyên cần vào lớp',
    description: 'Thưởng tự động khi học sinh đăng nhập vào tiết học',
    category: 'attendance',
    defaultExp: 5,
  },
];

const CATEGORY_NAMES: Record<RuleConfigRow['category'], { title: string; icon: string }> = {
  caps: { title: 'Trần EXP Chống Lạm Phát', icon: '🛡️' },
  quiz: { title: 'Trò chơi Quiz Live (Kahoot / Quizizz)', icon: '🎮' },
  poll: { title: 'Bình chọn nhanh (Quick Poll)', icon: '📊' },
  exam: { title: 'Kỳ thi & Kiểm tra (Exam)', icon: '📝' },
  wheel: { title: 'Vòng quay may mắn (Lucky Wheel)', icon: '🎡' },
  attendance: { title: 'Chuyên cần & Tham gia', icon: '🏫' },
};

const EMPTY_RULES: RewardRuleDto[] = [];

export const ExpSettingsTab: React.FC<ExpSettingsTabProps> = ({
  effectiveRules = EMPTY_RULES,
  teacherRules = EMPTY_RULES,
  isLoading = false,
  onSaveRules,
  onResetRules,
}) => {
  const [rows, setRows] = useState<RuleConfigRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Khởi tạo bảng dữ liệu khi nhận props effectiveRules và teacherRules
  useEffect(() => {
    const teacherMap = new Map<string, RewardRuleDto>();
    for (const tr of teacherRules) {
      teacherMap.set(`${tr.activityId ?? '__global__'}::${tr.trigger}`, tr);
    }

    const effectiveMap = new Map<string, RewardRuleDto>();
    for (const er of effectiveRules) {
      effectiveMap.set(`${er.activityId ?? '__global__'}::${er.trigger}`, er);
    }

    const newRows: RuleConfigRow[] = RULE_METADATA.map((meta) => {
      const key = `${meta.activityId ?? '__global__'}::${meta.trigger}`;
      const effectiveMatch = effectiveMap.get(key);
      const isCustomized = teacherMap.has(key);

      return {
        key,
        activityId: meta.activityId,
        trigger: meta.trigger,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        exp: effectiveMatch ? effectiveMatch.exp : meta.defaultExp,
        enabled: effectiveMatch ? effectiveMatch.enabled : true,
        isCustomized,
      };
    });

    setRows(newRows);
  }, [effectiveRules, teacherRules]);

  const handleExpChange = (key: string, valStr: string) => {
    const val = parseInt(valStr, 10);
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, exp: safeVal, isCustomized: true } : r))
    );
  };

  const handleToggleEnable = (key: string) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, enabled: !r.enabled, isCustomized: true } : r))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: RewardRuleItemInput[] = rows.map((r) => ({
        activityId: r.activityId,
        trigger: r.trigger,
        exp: r.exp,
        enabled: r.enabled,
      }));
      await onSaveRules(payload);
      setToastType('success');
      setToastMessage('Đã lưu cấu hình thưởng EXP thành công!');
    } catch {
      setToastType('error');
      setToastMessage('Lưu cài đặt thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetRules();
      setShowConfirmReset(false);
      setToastType('success');
      setToastMessage('Đã khôi phục cài đặt EXP về mặc định hệ thống!');
    } catch {
      setToastType('error');
      setToastMessage('Khôi phục mặc định thất bại.');
    } finally {
      setIsResetting(false);
    }
  };

  const categories: RuleConfigRow['category'][] = [
    'caps',
    'quiz',
    'poll',
    'exam',
    'wheel',
    'attendance',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg,
        maxWidth: 960,
        margin: '0 auto',
        padding: spacing.md,
      }}
    >
      {/* Toast thông báo */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
          duration={3500}
        />
      )}

      {/* Header & Thanh tác vụ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: spacing.lg,
          backgroundColor: '#FFFFFF',
          borderRadius: borderRadius.card,
          boxShadow: shadows.soft,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: typography.heading2,
              fontWeight: 800,
              color: colors.textPrimary,
              margin: '0 0 4px 0',
            }}
          >
            ⭐ Cài đặt Quy tắc & Thưởng EXP
          </h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: typography.body }}>
            Tùy biến mức thưởng cho từng hoạt động và cài đặt trần EXP chống lạm phát điểm.
          </p>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmReset(true)}
            disabled={isSaving || isResetting || isLoading}
            style={{ minHeight: 48 }}
          >
            🔄 Khôi phục mặc định
          </Button>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isResetting || isLoading}
            loading={isSaving}
            style={{ minHeight: 48 }}
          >
            💾 Lưu cài đặt
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: spacing.xxl }}>
          <p style={{ fontSize: typography.body, color: colors.textSecondary, margin: 0 }}>
            ⏳ Đang tải dữ liệu cấu hình EXP...
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {categories.map((catKey) => {
            const catRows = rows.filter((r) => r.category === catKey);
            if (catRows.length === 0) return null;
            const catInfo = CATEGORY_NAMES[catKey];

            return (
              <Card key={catKey}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginBottom: spacing.md,
                    borderBottom: `2px solid ${colors.background}`,
                    paddingBottom: spacing.sm,
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{catInfo.icon}</span>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: typography.heading3,
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    {catInfo.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {catRows.map((row) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.md,
                        padding: spacing.md,
                        backgroundColor: row.enabled ? '#FAFAFA' : '#F0F0F0',
                        borderRadius: borderRadius.button,
                        border: `1px solid ${row.enabled ? colors.border : '#E0E0E0'}`,
                        opacity: row.enabled ? 1 : 0.6,
                      }}
                    >
                      {/* Tiêu đề & Mô tả */}
                      <div style={{ flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: typography.body,
                              color: colors.textPrimary,
                            }}
                          >
                            {row.name}
                          </span>
                          {row.isCustomized ? (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                backgroundColor: colors.primary,
                                color: '#FFFFFF',
                                borderRadius: '12px',
                                fontWeight: 600,
                              }}
                            >
                              Tùy biến của bạn
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                backgroundColor: '#E2E8F0',
                                color: colors.textSecondary,
                                borderRadius: '12px',
                                fontWeight: 500,
                              }}
                            >
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '14px',
                            color: colors.textSecondary,
                          }}
                        >
                          {row.description}
                        </p>
                      </div>

                      {/* Điều khiển: Bật/Tắt & Ô nhập EXP */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                        }}
                      >
                        {/* Switch / Checkbox Bật-Tắt */}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.xs,
                            cursor: 'pointer',
                            fontSize: typography.body,
                            minHeight: 48,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={() => handleToggleEnable(row.key)}
                            aria-label={`Bật/tắt ${row.name}`}
                            style={{
                              width: 20,
                              height: 20,
                              accentColor: colors.primary,
                              cursor: 'pointer',
                            }}
                          />
                          <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                            {row.enabled ? 'Đang bật' : 'Đã tắt'}
                          </span>
                        </label>

                        {/* Ô nhập số EXP */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          <input
                            type="number"
                            min={0}
                            max={5000}
                            value={row.exp}
                            disabled={!row.enabled}
                            onChange={(e) => handleExpChange(row.key, e.target.value)}
                            aria-label={`Số EXP cho ${row.name}`}
                            style={{
                              width: 90,
                              minHeight: 48,
                              fontSize: typography.body,
                              textAlign: 'center',
                              fontWeight: 700,
                              color: colors.textPrimary,
                              borderRadius: borderRadius.button,
                              border: `2px solid ${colors.border}`,
                              padding: '0 8px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 700,
                              color: colors.textSecondary,
                              fontSize: '14px',
                            }}
                          >
                            EXP
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal xác nhận khôi phục mặc định */}
      <Modal
        isOpen={showConfirmReset}
        title="⚠️ Xác nhận khôi phục mặc định"
        onClose={() => setShowConfirmReset(false)}
      >
        <div style={{ padding: spacing.md }}>
          <p style={{ margin: '0 0 16px 0', fontSize: typography.body, color: colors.textPrimary }}>
            Bạn có chắc chắn muốn xóa tất cả cài đặt EXP riêng của mình và khôi phục về các mức thưởng
            mặc định của EduClass không?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmReset(false)}
              disabled={isResetting}
              style={{ minHeight: 48 }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReset}
              loading={isResetting}
              style={{ minHeight: 48 }}
            >
              Xác nhận khôi phục
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
