# AGENTS.md — Luật cho AI thực hiện EduClass v2

(Khi khởi tạo monorepo, copy file này ra thư mục gốc dự án.)

## Quy trình bắt buộc mỗi lần làm việc
1. Đọc `docs/PLAN.md` (mục 1, 2, 4, 5) và task hiện tại ở mục 8.
2. Chỉ làm **đúng 1 task** (vd 1.6). Không làm trước task của chặng sau.
3. Viết code & test tương ứng. Sau khi code: **chỉ chạy kiểm tra nhanh `pnpm run typecheck`** (`tsc -b`, ~2–3s) để bảo đảm không lỗi kiểu dữ liệu và không gãy import. **KHÔNG tự ý chạy Vitest / Test Suite / Lint / Dependency-cruiser**. Chỉ chạy test và kiểm tra toàn bộ khi người dùng yêu cầu cụ thể (vd: *"chạy test"*, *"test đi"*, *"nghiệm thu"*).
4. Tick `[x]` task trong PLAN.md, ghi chú ngắn ở `docs/CHANGELOG.md`.
5. Gặp điều mơ hồ hoặc cần đổi quyết định mục 1 → **dừng và hỏi người dùng**, không tự suy diễn.

## Luật kỹ thuật
- TypeScript strict; cấm `any` (dùng `unknown` + Zod).
- Mọi ranh giới (WS, REST, import file, JSON trong DB) validate bằng Zod từ `packages/protocol` hoặc schema của gói đó.
- Đúng luật phụ thuộc gói (PLAN mục 2). Không import vòng, không import chéo UI↔server.
- Trạng thái chỉ đổi ở server; client gửi intent.
- EXP chỉ đổi qua `core/rewards.grant()`; cấm `UPDATE students SET exp` ở nơi khác.
- Activity chỉ dùng `ctx`, không truy cập DB/WS thô.
- Migration DB: file mới đánh số tăng dần, không sửa migration đã có.
- Không hard-code chuỗi UI; dùng `vi.json`. Không dùng CDN (font/thư viện) — mọi thứ chạy offline.
- Không thêm thư viện mới nếu chưa nêu trong D9, trừ khi ghi ADR.
- Hàm ngắn, đặt tên rõ, không viết thừa (tuân thủ clean-code); giữ nguyên comment không liên quan.

## Luật giao diện
- Chỉ dùng token/component từ `ui-kit`; không tự đặt màu/cỡ chữ rời rạc.
- Tuân thủ PLAN mục 7.2 (vùng chạm ≥ 48px, ≤ 3 bước vào lớp, lỗi tiếng Việt dễ hiểu, màu đi kèm hình khối).
- Mỗi màn HS phải kiểm tra ở viewport 360×640 trước.
- Mọi trạng thái đều có giao diện: loading, rỗng, lỗi, mất kết nối.

## Definition of Done mỗi task
- Typecheck xanh (`pnpm run typecheck`). Test/lint/deps xanh khi người dùng yêu cầu kiểm tra toàn diện.
- Có xử lý lỗi + trạng thái rỗng.
- Không có TODO bỏ lửng; nếu hoãn thì ghi vào `docs/BACKLOG.md`.
- Tài liệu (`protocol.md` / `activity-guide.md`) cập nhật nếu đổi giao thức hoặc hợp đồng.
