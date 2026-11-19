/** Vị trí mặt trời, mặt trăng và đèn ban đêm (toạ độ thế giới). */

/** Độ lệch của nguồn sáng so với tâm cảnh. */
export const SUN_OFFSET = [13, 19, 7];
export const MOON_OFFSET = [-9, 20, 10];

/** Đèn trần trong phòng: [x, y, z, cường độ, tầm chiếu, giữ lại trên điện thoại]. */
export const ROOM_LIGHTS = [
  [4.9, 2.95, 2.7, 1.25, 8, true], [5.35, 2.95, 8.3, 1.1, 7, true], [2.3, 2.95, 8.4, 1.1, 7, true],
  [1.7, 2.95, 13.1, 1.1, 7, true], [5.1, 2.95, 13.1, 1.1, 7, true], [2.6, 2.95, 17.4, 1.2, 7, true],
  [2.2, 2.85, 1.3, 0.6, 3.5, false], [0.8, 2.95, 3.3, 0.7, 5, false], [6.05, 2.85, 16.6, 0.6, 4, false],
];
/** Đèn ngoài trời: sảnh, sảnh bên, lối đi, sân sau. */
export const OUTDOOR_LIGHTS = [
  [6.05, 2.4, 18.75, 0.9, 5, true], [7.7, 2.55, 13.8, 1.0, 7, true], [6.05, 0.55, 22.4, 0.7, 4.5, true],
  [6.05, 0.55, 25.6, 0.7, 4.5, false], [2.6, 2.3, -0.7, 0.6, 5, false],
];
export const LIGHT_INTENSITY_SCALE = 1.2;

/** Đèn âm trần (chỉ thấy khi bật mái): [x, z]. */
export const DOWNLIGHT_POSITIONS = [
  [4.2, 1.6], [5.7, 1.6], [4.2, 4.2], [5.7, 4.2], [5.35, 7.4], [5.35, 9.2], [2.3, 7.0], [2.3, 9.4], [1.4, 12.0], [1.4, 14.2],
  [5.1, 12.0], [5.1, 14.4], [1.6, 16.8], [3.6, 16.8], [1.6, 18.3], [3.6, 18.3], [0.8, 1.5], [0.8, 4.5], [2.2, 1.3], [6.05, 16.6], [6.05, 18.5],
];
/** Đèn tường: [x, z, góc xoay quanh trục đứng]. */
export const WALL_SCONCES = [
  [6.62, 17.715, 0], [5.48, 17.715, 0], [7.0, 11.0, Math.PI / 2], [7.0, 16.2, Math.PI / 2], [1.4, 0.0, Math.PI], [4.25, 0.0, Math.PI],
];
/** Đèn trụ sân vườn: [x, z]. */
export const GARDEN_BOLLARDS = [[5.28, 21], [6.82, 21], [5.28, 23.6], [6.82, 23.6], [5.28, 26.2], [6.82, 26.2], [9.45, 14.15], [11.0, 12.95], [1.75, -1.6], [4.6, -1.6]];
/** Hai dây đèn dưới mái hiên sảnh bên chạy theo trục z. */
export const STRING_LIGHT_LINES_X = [7.45, 8.15];
export const STRING_LIGHT_RANGE_Z = [10.75, 16.95];
