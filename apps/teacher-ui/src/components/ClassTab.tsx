import React, { useEffect, useRef, useState } from 'react';
import { parseClipboardText, validateAndPreviewStudents } from '@educlass/core';
import type {
  ClassDto,
  CreateClassRequest,
  CreateStudentRequest,
  StudentDto,
  StudentImportPreviewResponse,
  AcademicPerformance,
} from '@educlass/protocol';
import { Button, Card, Input, Modal, Toast, UI_COLORS } from '@educlass/ui-kit';
import { ClassGroupsView } from './ClassGroupsView.js';

export interface ClassTabProps {
  classes: ClassDto[];
  selectedClassId?: string | undefined;
  students: StudentDto[];
  onSelectClass: (classId: string) => void;
  onCreateClass: (data: CreateClassRequest) => Promise<void>;
  onUpdateClass?: ((classId: string, name: string) => Promise<void>) | undefined;
  onDeleteClass?: ((classId: string) => Promise<void>) | undefined;
  onCreateStudent: (classId: string, data: CreateStudentRequest) => Promise<void>;
  onUpdateStudent?:
    | ((
        studentId: string,
        fullName: string,
        code?: string,
        academicPerformance?: AcademicPerformance
      ) => Promise<void>)
    | undefined;
  onSetStudentPin: (studentId: string, pin: string | null) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onImportStudents: (
    classId: string,
    students: CreateStudentRequest[],
    skipDuplicates: boolean
  ) => Promise<void>;
}

export const ClassTab: React.FC<ClassTabProps> = ({
  classes,
  selectedClassId,
  students,
  onSelectClass,
  onCreateClass,
  onDeleteClass,
  onCreateStudent,
  onUpdateStudent,
  onSetStudentPin,
  onDeleteStudent,
  onImportStudents,
}) => {
  // Modal states
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassYear, setNewClassYear] = useState<number>(new Date().getFullYear());
  const classNameInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreateClassModal = () => {
    setNewClassName('');
    setNewClassYear(new Date().getFullYear());
    setIsCreateClassOpen(true);
  };

  const handleCloseCreateClassModal = () => {
    setIsCreateClassOpen(false);
    setNewClassName('');
  };

  // Tự động focus con trỏ vào ô nhập tên lớp ngay khi mở modal
  useEffect(() => {
    if (!isCreateClassOpen) {
      return () => {};
    }
    classNameInputRef.current?.focus();
    const timer = setTimeout(() => {
      classNameInputRef.current?.focus();
      classNameInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, [isCreateClassOpen]);

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentPin, setNewStudentPin] = useState('');
  const [newStudentAcademic, setNewStudentAcademic] = useState<AcademicPerformance>('dat');

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [targetStudentForPin, setTargetStudentForPin] = useState<StudentDto | null>(null);
  const [pinInput, setPinInput] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [previewResult, setPreviewResult] = useState<StudentImportPreviewResponse | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'students' | 'groups'>('students');

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Xử lý tạo lớp học
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await onCreateClass({ name: newClassName.trim(), year: newClassYear });
      setNewClassName('');
      setIsCreateClassOpen(false);
      setToastMessage('Tạo lớp học thành công!');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Lỗi khi tạo lớp học');
    }
  };

  // Xử lý thêm học sinh tay
  const handleAddStudent = async () => {
    if (!selectedClassId) {
      setToastMessage('Vui lòng chọn một lớp học trước.');
      return;
    }
    const trimmedName = newStudentName.trim();
    if (!trimmedName) {
      setToastMessage('Vui lòng nhập họ và tên học sinh.');
      return;
    }
    const trimmedPin = newStudentPin.trim();
    if (trimmedPin.length > 0 && trimmedPin.length < 4) {
      setToastMessage('Mã PIN phải có tối thiểu 4 ký tự số.');
      return;
    }

    const req: CreateStudentRequest = {
      fullName: trimmedName,
      academicPerformance: newStudentAcademic,
    };
    if (newStudentCode.trim()) req.code = newStudentCode.trim();
    if (trimmedPin.length >= 4) req.pin = trimmedPin;

    setIsSubmittingStudent(true);
    try {
      await onCreateStudent(selectedClassId, req);
      setNewStudentName('');
      setNewStudentCode('');
      setNewStudentPin('');
      setNewStudentAcademic('dat');
      setIsAddStudentOpen(false);
      setToastMessage('Thêm học sinh thành công!');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Lỗi khi thêm học sinh.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Xử lý đổi/reset PIN
  const handleSavePin = async () => {
    if (!targetStudentForPin) return;
    try {
      await onSetStudentPin(targetStudentForPin.id, pinInput.trim() ? pinInput.trim() : null);
      setIsPinModalOpen(false);
      setTargetStudentForPin(null);
      setPinInput('');
      setToastMessage('Cập nhật mã PIN thành công!');
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Lỗi khi cập nhật mã PIN');
    }
  };

  // Xử lý xem trước khi dán từ clipboard
  const handlePreviewPaste = () => {
    if (!pasteText.trim()) return;
    const rows = parseClipboardText(pasteText);
    const existing = students.map(s => ({ fullName: s.fullName, code: s.code ?? null }));
    const preview = validateAndPreviewStudents(rows, existing);
    setPreviewResult(preview);
  };

  // Xử lý commit import học sinh
  const handleCommitImport = async () => {
    if (!selectedClassId) {
      setToastMessage('Vui lòng chọn một lớp học trước.');
      return;
    }
    if (!previewResult) return;

    const importableItems = previewResult.items.filter(item => item.status !== 'error');
    if (importableItems.length === 0) {
      setToastMessage('Không có dòng dữ liệu hợp lệ nào để nhập.');
      return;
    }

    const validRowsToImport: CreateStudentRequest[] = importableItems.map(item => {
      const req: CreateStudentRequest = { fullName: item.fullName };
      if (item.code) req.code = item.code;
      // Chỉ gửi PIN nếu >= 4 ký tự để tránh lỗi validation Zod schema
      if (item.pin && item.pin.trim().length >= 4) {
        req.pin = item.pin.trim();
      }
      return req;
    });

    setIsImporting(true);
    try {
      await onImportStudents(selectedClassId, validRowsToImport, skipDuplicates);
      setIsImportModalOpen(false);
      setPasteText('');
      setPreviewResult(null);
      setToastMessage(`Đã nhập thành công học sinh vào lớp!`);
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : 'Lỗi khi nhập danh sách học sinh.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Thanh tiêu đề và danh sách lớp học */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Danh sách Lớp học</h2>
        <Button variant="primary" onClick={handleOpenCreateClassModal} data-testid="btn-add-class">
          + Thêm lớp học
        </Button>
      </div>

      {/* Thanh chọn lớp */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {classes.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: `2px dashed ${UI_COLORS.border}`,
            }}
          >
            <p style={{ color: UI_COLORS.textMuted, margin: '0 0 16px 0', fontSize: '15px' }}>
              Chưa có lớp học nào. Hãy bấm &quot;Thêm lớp học&quot; để bắt đầu tạo danh sách lớp.
            </p>
            <Button variant="primary" onClick={handleOpenCreateClassModal}>
              + Thêm lớp học ngay
            </Button>
          </div>
        ) : (
          classes.map(cls => {
            const isSelected = cls.id === selectedClassId;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => onSelectClass(cls.id)}
                data-testid={`class-item-${cls.id}`}
                style={{
                  padding: '12px 20px',
                  borderRadius: '16px',
                  border: `2px solid ${isSelected ? UI_COLORS.primary : UI_COLORS.border}`,
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  color: isSelected ? UI_COLORS.primary : UI_COLORS.text,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                {cls.name} ({cls.year})
              </button>
            );
          })
        )}
      </div>

      {/* Nội dung danh sách học sinh của lớp đang chọn */}
      {selectedClass && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '20px' }}>Lớp: {selectedClass.name}</h3>
              <span style={{ fontSize: '14px', color: UI_COLORS.textMuted }}>
                Sĩ số: {students.length} học sinh
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {subTab === 'students' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setIsImportModalOpen(true)}
                    data-testid="btn-import-excel"
                  >
                    📋 Nhập từ Excel / Dán
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsAddStudentOpen(true)}
                    data-testid="btn-add-student"
                  >
                    + Thêm học sinh
                  </Button>
                </>
              )}
              {onDeleteClass && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp ${selectedClass.name}?`)) {
                      void onDeleteClass(selectedClass.id);
                    }
                  }}
                >
                  Xóa lớp
                </Button>
              )}
            </div>
          </div>

          {/* Thanh chuyển chế độ xem: Danh sách học sinh vs Tổ / Nhóm học tập */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: `2px solid ${UI_COLORS.border}`,
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setSubTab('students')}
              data-testid="subtab-students"
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: `3px solid ${subTab === 'students' ? UI_COLORS.primary : 'transparent'}`,
                backgroundColor: 'transparent',
                color: subTab === 'students' ? UI_COLORS.primary : UI_COLORS.textMuted,
                fontWeight: subTab === 'students' ? 700 : 500,
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              📋 Danh sách học sinh ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('groups')}
              data-testid="subtab-groups"
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: `3px solid ${subTab === 'groups' ? UI_COLORS.primary : 'transparent'}`,
                backgroundColor: 'transparent',
                color: subTab === 'groups' ? UI_COLORS.primary : UI_COLORS.textMuted,
                fontWeight: subTab === 'groups' ? 700 : 500,
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              👥 Tổ / Nhóm học tập
            </button>
          </div>

          {subTab === 'groups' ? (
            <ClassGroupsView
              classId={selectedClass.id}
              className={selectedClass.name}
              students={students}
              onShowToast={msg => setToastMessage(msg)}
            />
          ) : students.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: UI_COLORS.textMuted }}>
              Lớp học chưa có học sinh. Bấm &quot;Thêm học sinh&quot; hoặc &quot;Nhập từ Excel /
              Dán&quot; để thêm.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${UI_COLORS.border}` }}>
                    <th style={{ padding: '12px' }}>STT</th>
                    <th style={{ padding: '12px' }}>Mã HS</th>
                    <th style={{ padding: '12px' }}>Họ và tên</th>
                    <th style={{ padding: '12px' }}>Học lực</th>
                    <th style={{ padding: '12px' }}>Mã PIN</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr
                      key={student.id}
                      style={{ borderBottom: `1px solid ${UI_COLORS.border}` }}
                      data-testid={`student-row-${student.id}`}
                    >
                      <td style={{ padding: '12px' }}>{idx + 1}</td>
                      <td style={{ padding: '12px' }}>{student.code ?? '—'}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{student.fullName}</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={student.academicPerformance || 'dat'}
                          onChange={e => {
                            const val = e.target.value as AcademicPerformance;
                            if (onUpdateStudent) {
                              void onUpdateStudent(
                                student.id,
                                student.fullName,
                                student.code ?? undefined,
                                val
                              );
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: '1px solid #CBD5E1',
                            backgroundColor:
                              student.academicPerformance === 'tot'
                                ? '#DCFCE7'
                                : student.academicPerformance === 'kha'
                                  ? '#DBEAFE'
                                  : student.academicPerformance === 'chua_dat'
                                    ? '#FEE2E2'
                                    : '#FEF3C7',
                            color:
                              student.academicPerformance === 'tot'
                                ? '#15803D'
                                : student.academicPerformance === 'kha'
                                  ? '#1D4ED8'
                                  : student.academicPerformance === 'chua_dat'
                                    ? '#B91C1C'
                                    : '#B45309',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="tot">🌟 Tốt</option>
                          <option value="kha">👍 Khá</option>
                          <option value="dat">👌 Đạt</option>
                          <option value="chua_dat">⚠️ Chưa đạt</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            backgroundColor: student.hasPin ? '#DCFCE7' : '#F1F5F9',
                            color: student.hasPin ? '#15803D' : '#64748B',
                          }}
                        >
                          {student.hasPin ? 'Đã đặt PIN' : 'Chưa có PIN'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setTargetStudentForPin(student);
                              setPinInput('');
                              setIsPinModalOpen(true);
                            }}
                            data-testid={`btn-set-pin-${student.id}`}
                          >
                            {student.hasPin ? 'Đổi PIN' : 'Đặt PIN'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              if (window.confirm(`Xóa học sinh ${student.fullName}?`)) {
                                void onDeleteStudent(student.id);
                              }
                            }}
                            data-testid={`btn-delete-student-${student.id}`}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal Thêm lớp học */}
      <Modal
        isOpen={isCreateClassOpen}
        onClose={handleCloseCreateClassModal}
        title="Thêm lớp học mới"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" onClick={handleCloseCreateClassModal}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateClass()}
              data-testid="btn-save-class"
            >
              Lưu lớp học
            </Button>
          </div>
        }
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleCreateClass();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Input
            ref={classNameInputRef}
            id="new-class-name-input"
            label="Tên lớp học (ví dụ: 12A1)"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            placeholder="Nhập tên lớp..."
            autoFocus
            required
            autoComplete="off"
            data-testid="input-class-name"
          />
          <Input
            id="new-class-year-input"
            label="Năm học"
            type="number"
            value={newClassYear.toString()}
            onChange={e => setNewClassYear(Number(e.target.value) || new Date().getFullYear())}
            data-testid="input-class-year"
          />
        </form>
      </Modal>

      {/* Modal Thêm học sinh tay */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Thêm học sinh mới"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsAddStudentOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleAddStudent()}
              disabled={isSubmittingStudent}
              loading={isSubmittingStudent}
              data-testid="btn-submit-add-student"
            >
              {isSubmittingStudent ? 'Đang thêm...' : 'Thêm học sinh'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Họ và tên học sinh *"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn An"
            autoFocus
          />
          <Input
            label="Mã học sinh (tùy chọn)"
            value={newStudentCode}
            onChange={e => setNewStudentCode(e.target.value)}
            placeholder="Ví dụ: HS001"
          />
          <Input
            label="Mã PIN đăng nhập (tùy chọn, tối thiểu 4 số)"
            value={newStudentPin}
            onChange={e => setNewStudentPin(e.target.value)}
            placeholder="Ví dụ: 1234"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Học lực</label>
            <select
              value={newStudentAcademic}
              onChange={e => setNewStudentAcademic(e.target.value as AcademicPerformance)}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                fontSize: '15px',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
              }}
            >
              <option value="tot">🌟 Tốt</option>
              <option value="kha">👍 Khá</option>
              <option value="dat">👌 Đạt (Mặc định)</option>
              <option value="chua_dat">⚠️ Chưa đạt</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal Đặt / Reset PIN */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title={`Đặt mã PIN cho ${targetStudentForPin?.fullName ?? ''}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {targetStudentForPin?.hasPin ? (
              <Button
                variant="danger"
                onClick={() => {
                  setPinInput('');
                  void handleSavePin();
                }}
              >
                Xóa mã PIN
              </Button>
            ) : (
              <span />
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" onClick={() => setIsPinModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={() => void handleSavePin()}>
                Lưu PIN
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: UI_COLORS.textMuted }}>
            Mã PIN dùng để học sinh đăng nhập vào lớp và bảo lưu vĩnh viễn điểm EXP, danh hiệu (cấp
            account theo D6).
          </p>
          <Input
            label="Mã PIN mới (tối thiểu 4 số)"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            placeholder="Nhập PIN mới..."
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal Dán từ Excel / Import */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập danh sách học sinh từ Excel"
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
              />
              Tự động bỏ qua học sinh bị trùng lặp
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>
                Hủy
              </Button>
              {(() => {
                const importableCount =
                  previewResult?.items.filter(item => item.status !== 'error').length ?? 0;
                return (
                  <Button
                    variant="primary"
                    onClick={() => void handleCommitImport()}
                    disabled={!previewResult || importableCount === 0 || isImporting}
                    loading={isImporting}
                    data-testid="btn-confirm-import"
                  >
                    {isImporting ? 'Đang nhập...' : `Xác nhận nhập (${importableCount} học sinh)`}
                  </Button>
                );
              })()}
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: UI_COLORS.textMuted }}>
            Sao chép các cột từ Excel (STT, Mã HS, Họ và tên, Mã PIN) rồi dán trực tiếp vào ô bên
            dưới, sau đó bấm &quot;Xem trước&quot;:
          </p>
          <textarea
            rows={5}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Dán dữ liệu từ Excel vào đây (Ctrl+V)..."
            data-testid="textarea-paste-excel"
            style={{
              width: '100%',
              borderRadius: '12px',
              border: `2px solid ${UI_COLORS.border}`,
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />

          <Button variant="secondary" onClick={handlePreviewPaste} data-testid="btn-preview-paste">
            🔍 Xem trước dữ liệu & phát hiện trùng/thiếu
          </Button>

          {/* Bảng xem trước (Preview) */}
          {previewResult && (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}
            >
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: 600 }}>
                <span style={{ color: UI_COLORS.success }}>
                  ✓ Hợp lệ: {previewResult.validCount}
                </span>
                <span style={{ color: UI_COLORS.warning }}>
                  ⚠ Cảnh báo/Trùng: {previewResult.warningCount}
                </span>
                <span style={{ color: UI_COLORS.error }}>✕ Lỗi: {previewResult.errorCount}</span>
              </div>

              <div
                style={{
                  maxHeight: '240px',
                  overflowY: 'auto',
                  border: `1px solid ${UI_COLORS.border}`,
                  borderRadius: '12px',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px' }}>Dòng</th>
                      <th style={{ padding: '8px' }}>Mã HS</th>
                      <th style={{ padding: '8px' }}>Họ và tên</th>
                      <th style={{ padding: '8px' }}>Mã PIN</th>
                      <th style={{ padding: '8px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.items.map(item => {
                      const isError = item.status === 'error';
                      const isWarning = item.status === 'warning';
                      const bgColor = isError ? '#FEF2F2' : isWarning ? '#FFFBEB' : '#F0FDF4';
                      const textColor = isError
                        ? UI_COLORS.error
                        : isWarning
                          ? '#B45309'
                          : UI_COLORS.success;

                      return (
                        <tr
                          key={item.rowIndex}
                          style={{
                            backgroundColor: bgColor,
                            borderBottom: `1px solid ${UI_COLORS.border}`,
                          }}
                        >
                          <td style={{ padding: '8px' }}>{item.rowIndex}</td>
                          <td style={{ padding: '8px' }}>{item.code ?? '—'}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>
                            {item.fullName || '(Trống)'}
                          </td>
                          <td style={{ padding: '8px' }}>{item.pin ?? '—'}</td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, color: textColor }}>
                                {isError ? 'Lỗi' : isWarning ? 'Trùng lặp / Chú ý' : 'Hợp lệ'}
                              </span>
                              {item.errors.map((e, idx) => (
                                <span
                                  key={idx}
                                  style={{ fontSize: '11px', color: UI_COLORS.error }}
                                >
                                  {e}
                                </span>
                              ))}
                              {item.warnings.map((w, idx) => (
                                <span key={idx} style={{ fontSize: '11px', color: '#B45309' }}>
                                  {w}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
