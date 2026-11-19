/**
 * Các cảnh của video tham quan. Mỗi cảnh: thời lượng (giây), chú thích, có mái không, ống kính.
 * Cảnh quay tròn dùng orbit (bán kính, độ cao, góc đầu/cuối); cảnh trượt dùng vị trí và điểm nhìn đầu/cuối.
 */
export const TOUR_SHOTS = [
  { durationSeconds: 6.5, title: 'Nhà Vườn Cấp 4', subtitle: '7,0 × 19,3 m · 2 phòng ngủ · sân vườn', showRoof: true, fieldOfView: 40,
    orbit: { radius: 25, height: 15, startAngle: -0.45, endAngle: 0.45 } },
  { durationSeconds: 5, title: 'Mặt tiền', subtitle: 'Sảnh vào lùi trong, cửa kính lớn ra vườn trước', showRoof: true, fieldOfView: 50,
    startPosition: [0.2, 1.8, 27.0], endPosition: [3.9, 1.6, 24.8], startTarget: [3.0, 1.8, 19], endTarget: [5.0, 1.5, 18.4] },
  { durationSeconds: 5, title: 'Phòng khách', subtitle: 'Sofa văng, bàn trà tròn lồng nhau, kệ TV', showRoof: true, fieldOfView: 66,
    startPosition: [4.6, 1.55, 15.9], endPosition: [4.3, 1.45, 17.9], startTarget: [0.5, 0.9, 18.4], endTarget: [0.6, 0.9, 16.4] },
  { durationSeconds: 5, title: 'Bếp + Bar', subtitle: 'Bếp chữ I dọc tường, đảo bar bo tròn', showRoof: true, fieldOfView: 66,
    startPosition: [5.5, 1.6, 12.0], endPosition: [5.1, 1.5, 14.8], startTarget: [0.9, 0.95, 14.2], endTarget: [1.0, 0.95, 12.0] },
  { durationSeconds: 5, title: 'Sinh hoạt chung', subtitle: 'Cửa kính xếp mở toàn bộ ra sảnh bên', showRoof: true, fieldOfView: 66,
    startPosition: [2.6, 1.5, 15.2], endPosition: [2.9, 1.5, 11.9], startTarget: [7.4, 1.3, 12.6], endTarget: [7.4, 1.2, 14.2] },
  { durationSeconds: 5, title: 'Phòng ăn', subtitle: 'Bàn ăn 6 ghế, góc tường bo tròn R350', showRoof: true, fieldOfView: 68,
    startPosition: [1.1, 1.5, 6.5], endPosition: [1.35, 1.45, 8.1], startTarget: [3.35, 1.05, 15.6], endTarget: [3.7, 1.0, 14.6] },
  { durationSeconds: 5, title: 'Phòng ngủ 2', subtitle: 'Cửa vòm gỗ, bàn học cạnh cửa sổ', showRoof: true, fieldOfView: 68,
    startPosition: [4.1, 1.5, 9.95], endPosition: [4.35, 1.45, 8.95], startTarget: [6.8, 0.95, 6.6], endTarget: [6.8, 0.9, 7.6] },
  { durationSeconds: 6, title: 'Phòng ngủ 1', subtitle: 'Cửa kính lớn hai mặt nhìn ra vườn', showRoof: true, fieldOfView: 70,
    startPosition: [3.35, 1.5, 4.9], endPosition: [3.7, 1.45, 3.3], startTarget: [6.7, 1.15, 1.6], endTarget: [6.8, 1.2, 4.6] },
  { durationSeconds: 5, title: 'Sân vườn', subtitle: 'Hiên gỗ, lối đá dẫn ra vườn', showRoof: true, fieldOfView: 52,
    startPosition: [14.2, 2.2, 17.2], endPosition: [13.2, 2.0, 10.4], startTarget: [6.5, 1.3, 13.8], endTarget: [6.5, 1.2, 13.0] },
  { durationSeconds: 7, title: 'Mặt bằng tổng thể', subtitle: 'Diện tích xây dựng ≈ 135 m²', showRoof: false, fieldOfView: 42,
    orbit: { radius: 15, height: 19, startAngle: 0.95, endAngle: 2.05 } },
];
export const END_CARD_SECONDS = 2.2;
