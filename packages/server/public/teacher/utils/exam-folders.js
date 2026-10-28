const STORAGE_KEY = 'educlass_custom_exam_folders';
/**
 * Chuẩn hóa chuỗi đường dẫn thư mục: cắt bỏ khoảng trắng thừa và chuẩn hóa dấu '/'
 * Ví dụ: "  Khối 10  /   Tin học  " -> "Khối 10/Tin học"
 */
export function normalizeFolderPath(path) {
    if (!path)
        return '';
    return path
        .split('/')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('/');
}
/**
 * Lấy tên lá của thư mục (tên của cấp cuối cùng)
 * Ví dụ: "Khối 10/Tin học/Chương 1" -> "Chương 1"
 */
export function getFolderLeafName(path) {
    const norm = normalizeFolderPath(path);
    if (!norm)
        return 'Thư mục gốc';
    const parts = norm.split('/');
    return parts[parts.length - 1] ?? norm;
}
/**
 * Lấy đường dẫn thư mục cha
 * Ví dụ: "Khối 10/Tin học/Chương 1" -> "Khối 10/Tin học"
 * "Khối 10" -> "" (Thư mục gốc)
 */
export function getParentFolderPath(path) {
    const norm = normalizeFolderPath(path);
    if (!norm)
        return '';
    const parts = norm.split('/');
    if (parts.length <= 1)
        return '';
    parts.pop();
    return parts.join('/');
}
/**
 * Đọc danh sách các thư mục tùy chỉnh từ localStorage
 */
export function getStoredFolders() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map(p => normalizeFolderPath(String(p))).filter(Boolean);
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Lưu thêm một thư mục vào localStorage
 */
export function saveCustomFolder(folderPath) {
    const norm = normalizeFolderPath(folderPath);
    if (!norm)
        return;
    const current = getStoredFolders();
    if (!current.includes(norm)) {
        current.push(norm);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        }
        catch {
            // ignore
        }
    }
}
/**
 * Xóa một thư mục khỏi localStorage
 */
export function removeStoredFolder(folderPath) {
    const norm = normalizeFolderPath(folderPath);
    if (!norm)
        return;
    const current = getStoredFolders();
    const updated = current.filter(p => p !== norm && !p.startsWith(`${norm}/`));
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    catch {
        // ignore
    }
}
/**
 * Đổi tên thư mục trong localStorage
 */
export function renameStoredFolder(oldPath, newPath) {
    const normOld = normalizeFolderPath(oldPath);
    const normNew = normalizeFolderPath(newPath);
    if (!normOld || !normNew || normOld === normNew)
        return;
    const current = getStoredFolders();
    const updated = current.map(p => {
        if (p === normOld)
            return normNew;
        if (p.startsWith(`${normOld}/`)) {
            return `${normNew}${p.slice(normOld.length)}`;
        }
        return p;
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(updated))));
    }
    catch {
        // ignore
    }
}
/**
 * Lấy toàn bộ danh sách thư mục (gộp từ exams và localStorage, kèm các thư mục trung gian)
 */
export function getAllExamFolders(exams) {
    const set = new Set();
    // Thêm từ exams
    for (const e of exams) {
        const norm = normalizeFolderPath(e.folder);
        if (norm) {
            set.add(norm);
            // Tự động thêm các thư mục cha trung gian
            const parts = norm.split('/');
            let curr = '';
            for (let i = 0; i < parts.length; i++) {
                curr = curr ? `${curr}/${parts[i]}` : parts[i];
                set.add(curr);
            }
        }
    }
    // Thêm từ localStorage
    for (const stored of getStoredFolders()) {
        const norm = normalizeFolderPath(stored);
        if (norm) {
            set.add(norm);
            const parts = norm.split('/');
            let curr = '';
            for (let i = 0; i < parts.length; i++) {
                curr = curr ? `${curr}/${parts[i]}` : parts[i];
                set.add(curr);
            }
        }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
}
/**
 * Tạo danh sách breadcrumb cho thanh điều hướng
 * Ví dụ: "Khối 10/Tin học" ->
 * [
 *   { name: "Tất cả kỳ thi", path: "" },
 *   { name: "Khối 10", path: "Khối 10" },
 *   { name: "Tin học", path: "Khối 10/Tin học" }
 * ]
 */
export function getBreadcrumbs(currentPath) {
    const norm = normalizeFolderPath(currentPath);
    const crumbs = [{ name: '🏠 Tất cả kỳ thi', path: '' }];
    if (!norm)
        return crumbs;
    const parts = norm.split('/');
    let accumulated = '';
    for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        crumbs.push({ name: part, path: accumulated });
    }
    return crumbs;
}
/**
 * Lấy danh sách các thư mục con trực tiếp của một thư mục
 */
export function getImmediateSubFolders(currentPath, allFolders) {
    const normCurrent = normalizeFolderPath(currentPath);
    const subSet = new Set();
    for (const f of allFolders) {
        const norm = normalizeFolderPath(f);
        if (!norm)
            continue;
        if (!normCurrent) {
            // Ở thư mục gốc: lấy các thư mục cấp 1 (không có '/')
            const firstPart = norm.split('/')[0];
            subSet.add(firstPart);
        }
        else {
            // Ở thư mục con: lấy các thư mục bắt đầu bằng `${normCurrent}/`
            if (norm.startsWith(`${normCurrent}/`)) {
                const remainder = norm.slice(normCurrent.length + 1);
                const nextPart = remainder.split('/')[0];
                subSet.add(`${normCurrent}/${nextPart}`);
            }
        }
    }
    return Array.from(subSet)
        .sort((a, b) => a.localeCompare(b, 'vi'))
        .map(fullPath => ({
        name: getFolderLeafName(fullPath),
        fullPath,
    }));
}
/**
 * Đếm số lượng kỳ thi trong thư mục (có thể đếm cả thư mục con nếu recursive = true)
 */
export function countExamsInFolder(folderPath, exams, recursive = false) {
    const normTarget = normalizeFolderPath(folderPath);
    if (!normTarget) {
        if (recursive)
            return exams.length;
        // Thư mục gốc: chỉ đếm các bài thi không thuộc thư mục nào
        return exams.filter(e => !normalizeFolderPath(e.folder)).length;
    }
    if (recursive) {
        return exams.filter(e => {
            const eNorm = normalizeFolderPath(e.folder);
            return eNorm === normTarget || eNorm.startsWith(`${normTarget}/`);
        }).length;
    }
    return exams.filter(e => normalizeFolderPath(e.folder) === normTarget).length;
}
//# sourceMappingURL=exam-folders.js.map