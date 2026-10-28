import type { ExamListItemDto } from '@educlass/protocol';
/**
 * Chuẩn hóa chuỗi đường dẫn thư mục: cắt bỏ khoảng trắng thừa và chuẩn hóa dấu '/'
 * Ví dụ: "  Khối 10  /   Tin học  " -> "Khối 10/Tin học"
 */
export declare function normalizeFolderPath(path: string | null | undefined): string;
/**
 * Lấy tên lá của thư mục (tên của cấp cuối cùng)
 * Ví dụ: "Khối 10/Tin học/Chương 1" -> "Chương 1"
 */
export declare function getFolderLeafName(path: string | null | undefined): string;
/**
 * Lấy đường dẫn thư mục cha
 * Ví dụ: "Khối 10/Tin học/Chương 1" -> "Khối 10/Tin học"
 * "Khối 10" -> "" (Thư mục gốc)
 */
export declare function getParentFolderPath(path: string | null | undefined): string;
/**
 * Đọc danh sách các thư mục tùy chỉnh từ localStorage
 */
export declare function getStoredFolders(): string[];
/**
 * Lưu thêm một thư mục vào localStorage
 */
export declare function saveCustomFolder(folderPath: string): void;
/**
 * Xóa một thư mục khỏi localStorage
 */
export declare function removeStoredFolder(folderPath: string): void;
/**
 * Đổi tên thư mục trong localStorage
 */
export declare function renameStoredFolder(oldPath: string, newPath: string): void;
/**
 * Lấy toàn bộ danh sách thư mục (gộp từ exams và localStorage, kèm các thư mục trung gian)
 */
export declare function getAllExamFolders(exams: ExamListItemDto[]): string[];
/**
 * Tạo danh sách breadcrumb cho thanh điều hướng
 * Ví dụ: "Khối 10/Tin học" ->
 * [
 *   { name: "Tất cả kỳ thi", path: "" },
 *   { name: "Khối 10", path: "Khối 10" },
 *   { name: "Tin học", path: "Khối 10/Tin học" }
 * ]
 */
export declare function getBreadcrumbs(currentPath: string): Array<{
    name: string;
    path: string;
}>;
/**
 * Lấy danh sách các thư mục con trực tiếp của một thư mục
 */
export declare function getImmediateSubFolders(currentPath: string, allFolders: string[]): Array<{
    name: string;
    fullPath: string;
}>;
/**
 * Đếm số lượng kỳ thi trong thư mục (có thể đếm cả thư mục con nếu recursive = true)
 */
export declare function countExamsInFolder(folderPath: string, exams: ExamListItemDto[], recursive?: boolean): number;
//# sourceMappingURL=exam-folders.d.ts.map