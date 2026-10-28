import type {
  StudentImportPreviewResponse,
  StudentImportRow,
  StudentPreviewItem,
} from '@educlass/protocol';

/**
 * Chuẩn hóa khoảng trắng trong chuỗi ký tự tiếng Việt
 */
export function normalizeVietnameseString(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Kiểm tra xem một dòng có phải là dòng tiêu đề (Header row) hay không
 */
function isHeaderRow(tokens: string[]): boolean {
  const headerKeywords = [
    'stt',
    'họ',
    'tên',
    'họ và tên',
    'họ tên',
    'họ đệm',
    'mã',
    'mã hs',
    'mã học sinh',
    'code',
    'pin',
    'mật khẩu',
    'full name',
    'name',
  ];

  const lower = tokens.map(t => t.toLowerCase().trim());
  return lower.some(token => headerKeywords.includes(token));
}

/**
 * Phân tích dữ liệu văn bản sao chép từ clipboard (hỗ trợ tab-separated từ Excel hoặc CSV)
 */
export function parseClipboardText(rawText: string): StudentImportRow[] {
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const rows: StudentImportRow[] = [];
  let headerIndex = -1;
  let colNameIdx = 0;
  let colCodeIdx = -1;
  let colPinIdx = -1;
  let colHoDemIdx = -1;
  let colTenIdx = -1;

  // 1. Kiểm tra dòng đầu tiên xem có phải là header không
  const firstLineTokens = lines[0]!.split(/\t|,|;/).map(t => t.trim());
  if (isHeaderRow(firstLineTokens)) {
    headerIndex = 0;
    firstLineTokens.forEach((token, idx) => {
      const lower = token.toLowerCase();
      if (
        lower.includes('họ và tên') ||
        lower.includes('họ tên') ||
        lower === 'name' ||
        lower === 'full name'
      ) {
        colNameIdx = idx;
      } else if (lower === 'họ' || lower === 'họ đệm' || lower === 'họ lót') {
        colHoDemIdx = idx;
      } else if (lower === 'tên') {
        colTenIdx = idx;
      } else if (
        lower.includes('pin') ||
        lower.includes('mật khẩu') ||
        lower.includes('password')
      ) {
        colPinIdx = idx;
      } else if (lower.includes('mã') || lower.includes('code')) {
        colCodeIdx = idx;
      }
    });
  }

  // 2. Duyệt qua từng dòng dữ liệu
  const startIndex = headerIndex >= 0 ? 1 : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]!;
    // Tách cột bằng Tab (\t), Phẩy (,), hoặc Chấm phẩy (;)
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const tokens = line.split(delimiter).map(t => t.trim());

    if (tokens.every(t => t.length === 0)) {
      continue;
    }

    let fullName = '';
    let code: string | undefined;
    let pin: string | undefined;

    if (headerIndex >= 0) {
      // Dùng chỉ số cột đã phát hiện từ header
      if (colHoDemIdx >= 0 && colTenIdx >= 0) {
        const hoDem = tokens[colHoDemIdx] ?? '';
        const ten = tokens[colTenIdx] ?? '';
        fullName = normalizeVietnameseString(`${hoDem} ${ten}`);
      } else if (colNameIdx >= 0 && tokens[colNameIdx]) {
        fullName = normalizeVietnameseString(tokens[colNameIdx]!);
      }

      if (colCodeIdx >= 0 && tokens[colCodeIdx]) {
        code = normalizeVietnameseString(tokens[colCodeIdx]!);
      }
      if (colPinIdx >= 0 && tokens[colPinIdx]) {
        pin = normalizeVietnameseString(tokens[colPinIdx]!);
      }
    } else {
      // Tự động suy luận cấu trúc (Heuristic) khi không có dòng tiêu đề
      if (tokens.length === 1) {
        fullName = normalizeVietnameseString(tokens[0]!);
      } else if (tokens.length === 2) {
        // Nếu token[0] là số (STT) -> token[1] là Họ tên
        if (/^\d+$/.test(tokens[0]!)) {
          fullName = normalizeVietnameseString(tokens[1]!);
        } else {
          // Ngược lại: token[0] là Họ tên, token[1] là Mã HS
          fullName = normalizeVietnameseString(tokens[0]!);
          code = normalizeVietnameseString(tokens[1]!);
        }
      } else if (tokens.length === 3) {
        // Ví dụ: STT, Họ tên, Mã HS  HOẶC  Họ tên, Mã HS, PIN
        if (/^\d+$/.test(tokens[0]!)) {
          fullName = normalizeVietnameseString(tokens[1]!);
          code = normalizeVietnameseString(tokens[2]!);
        } else {
          fullName = normalizeVietnameseString(tokens[0]!);
          code = normalizeVietnameseString(tokens[1]!);
          pin = normalizeVietnameseString(tokens[2]!);
        }
      } else if (tokens.length >= 4) {
        // Ví dụ: STT, Họ tên, Mã HS, PIN
        if (/^\d+$/.test(tokens[0]!)) {
          fullName = normalizeVietnameseString(tokens[1]!);
          code = normalizeVietnameseString(tokens[2]!);
          pin = normalizeVietnameseString(tokens[3]!);
        } else {
          // Họ đệm, Tên, Mã HS, PIN
          fullName = normalizeVietnameseString(`${tokens[0]!} ${tokens[1]!}`);
          code = normalizeVietnameseString(tokens[2]!);
          pin = normalizeVietnameseString(tokens[3]!);
        }
      }
    }

    if (fullName.length > 0 || code !== undefined) {
      const item: StudentImportRow = { fullName };
      if (code && code.length > 0) {
        item.code = code;
      }
      if (pin && pin.length > 0) {
        item.pin = pin;
      }
      rows.push(item);
    }
  }

  return rows;
}

/**
 * Kiểm tra, đối chiếu và tạo kết quả xem trước (Preview) cho danh sách học sinh:
 * - Báo lỗi nếu thiếu họ tên
 * - Báo cảnh báo nếu trùng lặp trong file tải lên
 * - Báo cảnh báo nếu trùng lặp với danh sách học sinh hiện có trong lớp
 */
export function validateAndPreviewStudents(
  rows: StudentImportRow[],
  existingStudents: Array<{ fullName: string; code?: string | null }>
): StudentImportPreviewResponse {
  const existingNamesSet = new Set(existingStudents.map(s => s.fullName.toLowerCase().trim()));
  const existingCodesSet = new Set(
    existingStudents.map(s => s.code?.toLowerCase().trim()).filter((c): c is string => Boolean(c))
  );

  const seenImportNames = new Map<string, number>();
  const seenImportCodes = new Map<string, number>();

  // Đếm tần suất xuất hiện trong import
  for (const row of rows) {
    const nameKey = row.fullName.toLowerCase().trim();
    if (nameKey) {
      seenImportNames.set(nameKey, (seenImportNames.get(nameKey) ?? 0) + 1);
    }
    if (row.code) {
      const codeKey = row.code.toLowerCase().trim();
      seenImportCodes.set(codeKey, (seenImportCodes.get(codeKey) ?? 0) + 1);
    }
  }

  const items: StudentPreviewItem[] = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowIndex = i + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Kiểm tra thiếu họ tên
    if (!row.fullName || row.fullName.trim().length === 0) {
      errors.push('Thiếu họ và tên học sinh.');
    }

    const nameKey = row.fullName.toLowerCase().trim();
    const codeKey = row.code?.toLowerCase().trim();

    // Kiểm tra trùng lặp trong chính file import
    if (nameKey && (seenImportNames.get(nameKey) ?? 0) > 1) {
      warnings.push('Trùng họ tên với học sinh khác trong danh sách nhập.');
    }
    if (codeKey && (seenImportCodes.get(codeKey) ?? 0) > 1) {
      warnings.push('Trùng mã học sinh với dòng khác trong danh sách nhập.');
    }

    // Kiểm tra trùng lặp với dữ liệu đã có sẵn trong lớp học
    if (nameKey && existingNamesSet.has(nameKey)) {
      warnings.push('Học sinh cùng tên đã có trong danh sách lớp.');
    }
    if (codeKey && existingCodesSet.has(codeKey)) {
      warnings.push('Mã học sinh đã tồn tại trong danh sách lớp.');
    }

    // Kiểm tra độ dài mã PIN nếu có
    if (row.pin && row.pin.length < 4) {
      warnings.push('Mã PIN ngắn hơn 4 ký tự, có thể gây mất an toàn.');
    }

    let status: 'valid' | 'warning' | 'error' = 'valid';
    if (errors.length > 0) {
      status = 'error';
      errorCount++;
    } else if (warnings.length > 0) {
      status = 'warning';
      warningCount++;
    } else {
      validCount++;
    }

    const previewItem: StudentPreviewItem = {
      rowIndex,
      fullName: row.fullName,
      status,
      errors,
      warnings,
    };
    if (row.code) {
      previewItem.code = row.code;
    }
    if (row.pin) {
      previewItem.pin = row.pin;
    }

    items.push(previewItem);
  }

  return {
    total: rows.length,
    validCount,
    warningCount,
    errorCount,
    items,
  };
}
