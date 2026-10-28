import { Container, Graphics, Text } from 'pixi.js';
export const DUCK_PALETTES = [
    { body: 0xfacc15, wing: 0xeab308, beak: 0xf97316 }, // Vàng kinh điển
    { body: 0xfb923c, wing: 0xf97316, beak: 0xe11d48 }, // Cam nhiệt huyết
    { body: 0x38bdf8, wing: 0x0284c7, beak: 0xf97316 }, // Xanh thiên thanh
    { body: 0x4ade80, wing: 0x16a34a, beak: 0xf97316 }, // Xanh lá tươi
    { body: 0xf472b6, wing: 0xdb2777, beak: 0xf97316 }, // Hồng đào
    { body: 0xa78bfa, wing: 0x7c3aed, beak: 0xf97316 }, // Tím mộng mơ
    { body: 0x2dd4bf, wing: 0x0d9488, beak: 0xf97316 }, // Ngọc bích
];
/**
 * Tạo một chú vịt cao su kèm biển tên học sinh hiển thị trên Pixi.js
 */
export function createDuckDisplayNode(entity) {
    const container = new Container();
    container.sortableChildren = true;
    // 1. Bóng đổ dưới mặt nước
    const shadow = new Graphics();
    shadow.ellipse(0, 14, 22, 7).fill({ color: 0x075985, alpha: 0.45 });
    container.addChild(shadow);
    // 2. Bọt nước rẽ sóng sau đuôi
    const wake = new Graphics();
    container.addChild(wake);
    // 3. Container chứa thân vịt (để xoay wobble nhấp nhô)
    const duckBody = new Container();
    container.addChild(duckBody);
    const g = new Graphics();
    duckBody.addChild(g);
    // Màu sắc vịt hoàn toàn tự nhiên theo entity (không phân biệt vịt nhất trước)
    const { bodyColor, wingColor, beakColor } = entity;
    // Vẽ thân vịt cao su
    // Đuôi vịt
    g.poly([-16, 2, -26, -5, -15, 8]).fill({ color: bodyColor });
    // Thân chính
    g.ellipse(0, 4, 21, 15).fill({ color: bodyColor });
    // Cánh vịt
    g.ellipse(-3, 3, 12, 8).fill({ color: wingColor });
    // Đầu vịt
    g.circle(13, -7, 11).fill({ color: bodyColor });
    // Mắt vịt to tròn lém lỉnh
    g.circle(17, -9, 3.2).fill({ color: 0x0f172a });
    g.circle(18, -10, 1.2).fill({ color: 0xffffff }); // Điểm sáng mắt
    // Mỏ vịt cam
    g.poly([22, -8, 33, -4, 21, -2]).fill({ color: beakColor });
    // Má hồng dễ thương
    g.circle(13, -3, 2.5).fill({ color: 0xf43f5e, alpha: 0.4 });
    // 4. Biển tên học sinh (Name Tag Badge) - Thu gọn hiển thị chỉ TÊN, không tốn diện tích
    const badgeContainer = new Container();
    badgeContainer.y = -28;
    container.addChild(badgeContainer);
    const badgeBg = new Graphics();
    badgeContainer.addChild(badgeBg);
    // Hiển thị tên rút gọn (ví dụ "An", "Bình", "Cường")
    const shortName = entity.displayName || entity.student.name;
    // Tạo Text trong Pixi v8: chuẩn màu chữ tối tương phản cao trên nền trắng
    const nameText = new Text({
        text: shortName,
        style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 11,
            fontWeight: 'bold',
            fill: 0x0f172a, // Đen than sắc nét cho tất cả học sinh
            align: 'center',
        },
    });
    const textW = Math.max(nameText.width + 10, 32);
    const textH = 18;
    // Nền bảng tên trắng bo tròn viền xám sạch sẽ, đồng nhất cho mọi chú vịt (không lộ vịt nhất)
    badgeBg
        .roundRect(-textW / 2, -textH / 2, textW, textH, 8)
        .fill({ color: 0xffffff })
        .stroke({ width: 1.5, color: 0x94a3b8 });
    // Canh giữa text
    nameText.anchor.set(0.5, 0.5);
    badgeContainer.addChild(nameText);
    // Cập nhật vị trí và chuyển động
    let rippleTick = Math.random() * 10;
    const update = (x, y, wobble, isSpeeding) => {
        container.x = x;
        container.y = y;
        duckBody.rotation = wobble;
        container.zIndex = Math.floor(y); // Phân tầng Z-index theo chiều sâu trục Y (vịt ở dưới đè vịt ở trên)
        // Vẽ bọt nước rẽ sóng
        rippleTick += 0.2;
        wake.clear();
        const rippleLength = isSpeeding ? 28 : 16;
        const rippleAlpha = 0.35 + Math.sin(rippleTick) * 0.15;
        wake
            .poly([-16, 6, -16 - rippleLength, 0, -16 - rippleLength * 0.7, 10])
            .fill({ color: 0xffffff, alpha: rippleAlpha });
    };
    const setTargetGlow = (active) => {
        if (active) {
            // Chỉ kích hoạt hiệu ứng vinh danh khi đã cán đích hoàn tất
            badgeBg
                .clear()
                .roundRect(-textW / 2 - 2, -textH / 2 - 2, textW + 4, textH + 4, 10)
                .fill({ color: 0xfde047 })
                .stroke({ width: 2.5, color: 0xd97706 });
        }
    };
    return {
        container,
        update,
        setTargetGlow,
        entity,
    };
}
//# sourceMappingURL=duck-graphics.js.map