import { DUCK_PALETTES } from './duck-graphics.js';
export const TRACK_START_X = 140;
export const TRACK_FINISH_X = 2600;
export const TOTAL_TRACK_DISTANCE = TRACK_FINISH_X - TRACK_START_X;
/**
 * Xây dựng bản đồ tên rút gọn (chỉ hiển thị TÊN chính của học sinh, ví dụ "An", "Bình", "Cường")
 * Nếu trong lớp có học sinh trùng tên, tự động kèm chữ cái đầu của họ/lót để phân biệt (ví dụ "An (N.)")
 */
export function buildStudentDisplayNameMap(students) {
    const map = new Map();
    const nameCounts = new Map();
    // Đếm số lần xuất hiện của tên chính (từ cuối cùng)
    for (const s of students) {
        const parts = s.name.trim().split(/\s+/);
        const lastName = parts[parts.length - 1] || s.name;
        nameCounts.set(lastName, (nameCounts.get(lastName) || 0) + 1);
    }
    // Gán tên hiển thị gọn gàng
    for (const s of students) {
        const parts = s.name.trim().split(/\s+/);
        const lastName = parts[parts.length - 1] || s.name;
        if ((nameCounts.get(lastName) || 0) > 1 && parts.length > 1) {
            const firstInitial = parts[0]?.charAt(0).toUpperCase() || '';
            map.set(s.id, `${lastName} (${firstInitial}.)`);
        }
        else {
            map.set(s.id, lastName);
        }
    }
    return map;
}
/**
 * Khởi tạo danh sách các chú vịt cho cuộc đua
 * - Không tô màu đặc biệt cho vịt nhất từ trước (tất cả vịt có màu ngẫu nhiên/tuần tự công bằng)
 * - Tách họ tên, chỉ hiển thị tên ngắn gọn trên đầu vịt
 * - Phân bố làn bơi zíc zắc rộng rãi theo chiều cao sông (580px)
 */
export function initializeDuckFlock(students, targetStudent, scenario, riverHeight) {
    if (students.length === 0)
        return [];
    // Đảm bảo targetStudent có trong danh sách
    const pool = students.some(s => s.id === targetStudent.id)
        ? [...students]
        : [targetStudent, ...students];
    const nameMap = buildStudentDisplayNameMap(pool);
    // Chọn đối thủ cho kịch bản 'duel' và 'triple_threat'
    const others = pool.filter(s => s.id !== targetStudent.id);
    const rivalId1 = others.length > 0 ? others[0]?.id : null;
    const rivalId2 = others.length > 1 ? others[1]?.id : null;
    const count = pool.length;
    const paddingY = 55;
    const usableHeight = Math.max(riverHeight - paddingY * 2, 260);
    return pool.map((student, idx) => {
        const isTarget = student.id === targetStudent.id;
        const isRival = student.id === rivalId1 && (scenario === 'duel' || scenario === 'triple_threat');
        const isRival2 = student.id === rivalId2 && scenario === 'triple_threat';
        // Phân bố làn bơi đan xen tự nhiên, tận dụng toàn bộ chiều rộng mặt sông
        const normalizedY = (idx / Math.max(count - 1, 1)) * usableHeight;
        // Bổ sung dao động hình sin để các chú vịt bơi zíc zắc không thẳng hàng
        const laneJitter = Math.sin(idx * 2.7) * 22;
        const laneY = paddingY + normalizedY + laneJitter;
        // Chọn bảng màu tuần tự cho tất cả các chú vịt (hoàn toàn công bằng, không phân biệt vịt nhất trước)
        const palette = DUCK_PALETTES[idx % DUCK_PALETTES.length] || DUCK_PALETTES[0];
        return {
            id: student.id,
            student,
            displayName: nameMap.get(student.id) || student.name,
            isTarget,
            isRival,
            isRival2,
            laneY,
            currentX: TRACK_START_X - 60 - (idx % 5) * 22, // Tập kết so le sau vạch xuất phát
            currentY: laneY,
            progress: 0,
            speedMultiplier: 0.94 + ((idx * 7) % 13) * 0.01, // Độ lệch tự nhiên ổn định theo index
            bobPhase: Math.random() * Math.PI * 2,
            bodyColor: palette.body, // Tuyệt đối không tô màu riêng cho vịt nhất từ trước
            wingColor: palette.wing,
            beakColor: palette.beak,
        };
    });
}
/**
 * Tính toán vị trí X của chú vịt theo tiến trình thời gian cuộc đua (0.0 đến 1.0)
 * dựa trên 5 KỊCH BẢN kịch tính khác nhau
 *
 * NGUYÊN TẮC VÀNG:
 * 1. Chuyển động tăng đơn điệu liên tục (vịt luôn bơi tiến lên, không bao giờ dừng khựng lại).
 * 2. Không có bất kỳ chú vịt nào tới vạch đích trước hoặc phải dừng lại đợi vịt nhất!
 * 3. Đàn vịt phân tán tự nhiên dọc theo chiều dài sông (không dồn thành 1 cột dọc đứng)!
 * 4. Chú vịt về nhất chỉ cán đích đầu tiên tại thời điểm p = 1.0, các chú vịt khác bám sát phía sau.
 */
export function calculateDuckX(duck, globalProgress, // 0.0 -> 1.0
scenario) {
    // Khi chưa xuất phát
    if (globalProgress <= 0) {
        return { x: duck.currentX, isSpeeding: false };
    }
    const p = Math.min(Math.max(globalProgress, 0), 1);
    let duckProgress = 0;
    let isSpeeding = false;
    // Độ giãn nở tự nhiên của đàn vịt dọc theo chiều dài sông (Cluster Spread)
    // Giúp đàn vịt trải dài mềm mại trên mặt nước, không bị dồn 1 cột đứng
    const flockSpread = ((duck.speedMultiplier - 0.94) / 0.12) * 0.14 - 0.07; // -0.07 đến +0.07
    switch (scenario) {
        // ==========================================
        // KỊCH BẢN 1: CÚ LỘI NGƯỢC DÒNG THẦN THÁNH (COMEBACK)
        // ==========================================
        case 'comeback': {
            if (duck.isTarget) {
                if (p < 0.45) {
                    // Giai đoạn 1: Bơi ở nhóm sau (nửa sau của đàn vịt)
                    duckProgress = p * 0.78;
                }
                else if (p < 0.75) {
                    // Giai đoạn 2: Tăng tốc rút ngắn khoảng cách với nhóm dẫn đầu
                    const midP = (p - 0.45) / 0.3;
                    duckProgress = 0.351 + midP * 0.36;
                    isSpeeding = true;
                }
                else {
                    // Giai đoạn 3: Bứt tốc nước rút mạnh mẽ, vượt qua vịt dẫn đầu tại p ~ 0.88 và cán đích đầu tiên
                    const endP = (p - 0.75) / 0.25;
                    duckProgress = 0.711 + endP * 0.304; // Cán đích ở 1.015
                    isSpeeding = true;
                }
            }
            else {
                // Đàn vịt khác: bơi liên tục đều đặn về phía trước, phân bổ trải dài tự nhiên từ 0.82 đến 0.985
                const base = p * 0.92 + flockSpread * p;
                const wave = Math.sin(p * 8 + duck.bobPhase) * 0.012;
                duckProgress = Math.min(Math.max(base + wave, p * 0.72), 0.985);
            }
            break;
        }
        // ==========================================
        // KỊCH BẢN 2: SONG MÃ TRANH HÙNG (DUEL / PHOTO FINISH)
        // ==========================================
        case 'duel': {
            if (duck.isTarget || duck.isRival) {
                isSpeeding = true;
                // Cả 2 cùng nhau bứt phá dẫn đầu đàn vịt
                const leadBase = p * 0.985;
                // So kè dao động liên tục từng centimet
                const duelSwing = Math.sin(p * 15) * 0.02;
                if (p < 0.9) {
                    if (duck.isTarget) {
                        duckProgress = leadBase + duelSwing;
                    }
                    else {
                        duckProgress = leadBase - duelSwing;
                    }
                }
                else {
                    // Chặng 10% nước rút cuối cùng: cả 2 cùng lao về vạch đích, Target rướn mỏ thắng sát nút
                    const endP = (p - 0.9) / 0.1;
                    if (duck.isTarget) {
                        duckProgress = 0.886 + endP * 0.129; // Cán đích ở 1.015
                    }
                    else {
                        duckProgress = 0.886 + endP * 0.106; // Về nhì ở 0.992 (sát nút trong gang tấc)
                    }
                }
            }
            else {
                // Đàn vịt còn lại bơi đều đặn ở phía sau trải dài tự nhiên
                const base = p * 0.86 + flockSpread * p;
                const wave = Math.sin(p * 8 + duck.bobPhase) * 0.012;
                duckProgress = Math.min(Math.max(base + wave, p * 0.68), 0.92);
            }
            break;
        }
        // ==========================================
        // KỊCH BẢN 3: NGÔI SAO CÔ ĐỘC (BẢO VỆ NGÔI ĐẦU)
        // ==========================================
        case 'wire_to_wire': {
            if (duck.isTarget) {
                // Vịt đích dẫn đầu từ đầu chặng với khoảng cách an toàn nhỏ
                duckProgress = p * 1.015;
                if (p > 0.8)
                    isSpeeding = true;
            }
            else {
                // Đàn vịt bám sát phía sau; ở nửa sau cuộc đua tăng tốc đuổi rát
                const chaseBase = p * 0.92 + flockSpread * p;
                const surge = p > 0.6 ? (p - 0.6) * 0.06 : 0;
                const wave = Math.sin(p * 9 + duck.bobPhase) * 0.012;
                duckProgress = Math.min(Math.max(chaseBase + surge + wave, p * 0.74), 0.985);
            }
            break;
        }
        // ==========================================
        // KỊCH BẢN 4: HỖN CHIẾN BẦY VỊT (CHAOS SPRINT)
        // ==========================================
        case 'chaos_pack': {
            // Cả đàn vịt chen chúc cuộn sóng thành một cụm đông đúc bám sát nhau
            const packBase = p * 0.95;
            // Nhịp xô đẩy hỗn loạn liên tục hoán đổi vị trí
            const chaosWave = Math.sin(p * 14 + duck.bobPhase * 2.5) * 0.032;
            if (duck.isTarget) {
                if (p < 0.85) {
                    // Vịt Target bơi ẩn mình trong đám đông hỗn chiến (lúc thứ 3, lúc thứ 2, lúc thứ 4)
                    duckProgress = packBase + Math.sin(p * 12 + 1.2) * 0.024;
                }
                else {
                    // 15% chặng cuối: Target bất ngờ lách qua khe hẹp bứt tốc phi mã về đích
                    isSpeeding = true;
                    const endP = (p - 0.85) / 0.15;
                    const startSprint = 0.85 * 0.95;
                    duckProgress = startSprint + endP * (1.015 - startSprint);
                }
            }
            else {
                // Các chú vịt khác trong đàn chen lấn nhau rượt đuổi đến tận vạch đích
                const otherBase = packBase + flockSpread * p * 0.6 + chaosWave;
                duckProgress = Math.min(Math.max(otherBase, p * 0.78), 0.986);
            }
            break;
        }
        // ==========================================
        // KỊCH BẢN 5: TAM MÃ PHÂN TRANH (TRIPLE THREAT)
        // ==========================================
        case 'triple_threat':
        default: {
            if (duck.isTarget || duck.isRival || duck.isRival2) {
                isSpeeding = true;
                // Ba chú vịt cùng nhau bứt tốp tạo thành thế chân vạc tam mã
                const trioBase = p * 0.985;
                // Ba pha lệch nhau 120 độ so kè liên tục
                let trioWave = 0;
                if (duck.isTarget) {
                    trioWave = Math.sin(p * 13) * 0.025;
                }
                else if (duck.isRival) {
                    trioWave = Math.sin(p * 13 + 2.094) * 0.025; // + 120 độ
                }
                else {
                    trioWave = Math.sin(p * 13 + 4.188) * 0.025; // + 240 độ
                }
                if (p < 0.9) {
                    duckProgress = trioBase + trioWave;
                }
                else {
                    // 10% nước rút cuối cùng: cả 3 cùng lao về đích trong tích tắc sát nút
                    const endP = (p - 0.9) / 0.1;
                    if (duck.isTarget) {
                        duckProgress = 0.886 + endP * 0.129; // Cán đích ở 1.015
                    }
                    else if (duck.isRival) {
                        duckProgress = 0.886 + endP * 0.106; // Về nhì ở 0.992
                    }
                    else {
                        duckProgress = 0.886 + endP * 0.1; // Về ba ở 0.986
                    }
                }
            }
            else {
                // Đàn vịt còn lại bơi phía sau trải dài tự nhiên
                const base = p * 0.87 + flockSpread * p;
                const wave = Math.sin(p * 8 + duck.bobPhase) * 0.012;
                duckProgress = Math.min(Math.max(base + wave, p * 0.7), 0.91);
            }
            break;
        }
    }
    // Khi cuộc đua kết thúc hoàn toàn (p >= 1.0)
    if (globalProgress >= 1.0) {
        if (duck.isTarget) {
            return { x: TRACK_FINISH_X + 35, isSpeeding: false };
        }
        const finalX = TRACK_START_X + duckProgress * TOTAL_TRACK_DISTANCE;
        return { x: Math.min(finalX, TRACK_FINISH_X - 15), isSpeeding: false };
    }
    const computedX = TRACK_START_X + duckProgress * TOTAL_TRACK_DISTANCE;
    return { x: computedX, isSpeeding };
}
//# sourceMappingURL=race-director.js.map