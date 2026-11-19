/**
 * Dữ liệu mặt bằng đo lại từ bản vẽ (đơn vị mét).
 * Gốc toạ độ ở góc trên-trái bản vẽ: x sang phải, y xuống dưới. Trong 3D, y của bản vẽ là trục z.
 */
import { polygonArea } from '../core/geometry.js';

export const WALL_HEIGHT = 3.4;
export const CUT_WALL_HEIGHT = 1.15;
export const EXTERIOR_WALL_THICKNESS = 0.2;
export const INTERIOR_WALL_THICKNESS = 0.12;
export const CORNER_RADIUS = 0.35; // bo góc R350

/** Tường: đường tim qua các điểm, cornerRadii là bán kính bo tại từng đỉnh. */
export const WALLS = [
  { name: 'Tường sau', points: [[0.1, 0.1], [6.9, 0.1]], thickness: EXTERIOR_WALL_THICKNESS },
  { name: 'Tường hông phải', points: [[6.9, 0.1], [6.9, 19.2]], thickness: EXTERIOR_WALL_THICKNESS },
  { name: 'Mặt tiền phòng khách', points: [[0.1, 19.2], [5.2, 19.2]], thickness: EXTERIOR_WALL_THICKNESS },
  { name: 'Tường hông trái', points: [[0.1, 0.1], [0.1, 19.2]], thickness: EXTERIOR_WALL_THICKNESS },
  { name: 'Hành lang / phòng ngủ 1', points: [[1.5, 0.1], [1.5, 6.1], [6.9, 6.1]], cornerRadii: [0, CORNER_RADIUS, 0], thickness: INTERIOR_WALL_THICKNESS },
  { name: 'Khối WC', points: [[2.95, 0.1], [2.95, 3.94], [1.5, 3.94]], cornerRadii: [0, CORNER_RADIUS, 0], thickness: INTERIOR_WALL_THICKNESS },
  { name: 'Vách WC / lavabo', points: [[1.5, 2.64], [2.95, 2.64]], thickness: 0.1 },
  { name: 'Phòng ngủ 2', points: [[3.8, 6.1], [3.8, 10.55], [6.9, 10.55]], cornerRadii: [0, CORNER_RADIUS, 0], thickness: INTERIOR_WALL_THICKNESS },
  { name: 'Vách phòng khách / sảnh', points: [[5.2, 15.7], [5.2, 19.2]], thickness: 0.18 },
  { name: 'Tường cửa chính', points: [[5.2, 17.6], [6.9, 17.6]], thickness: 0.15 },
];

/** Bo lõm ở góc trong phòng ăn: innerCorner là góc mặt tường, roomDirection chỉ phía trong phòng. */
export const WALL_FILLETS = [{ innerCorner: [3.74, 6.16], roomDirection: [-1, 1], radius: CORNER_RADIUS }];

/**
 * Lỗ mở trên tường. start/end nằm trên đường tim tường; với cửa đi, start là bản lề.
 * kind: 'door' | 'window' | 'folding' (cửa kính xếp) | 'archway' (lối vòm không cánh)
 */
export const OPENINGS = [
  { kind: 'door', start: [0.45, 0.1], end: [1.25, 0.1], swingDirection: [0, -1], topHeight: 2.4, style: 'glass', openAngleDegrees: 70 },
  { kind: 'window', start: [1.7, 0.1], end: [2.75, 0.1], sillHeight: 1.7, topHeight: 2.3 },
  { kind: 'door', start: [3.32, 0.1], end: [4.1, 0.1], swingDirection: [0, -1], topHeight: 2.4, style: 'glass', openAngleDegrees: 70 },
  { kind: 'window', start: [4.25, 0.1], end: [6.55, 0.1], sillHeight: 0.45, topHeight: 2.85 },
  { kind: 'window', start: [6.9, 3.0], end: [6.9, 5.45], sillHeight: 0.45, topHeight: 2.85 },
  { kind: 'window', start: [6.9, 8.05], end: [6.9, 9.6], sillHeight: 0.7, topHeight: 2.6 },
  { kind: 'folding', start: [6.9, 11.25], end: [6.9, 15.6], topHeight: 2.85 },
  { kind: 'window', start: [0.6, 19.2], end: [5.0, 19.2], sillHeight: 0.45, topHeight: 2.85 },
  { kind: 'window', start: [0.1, 6.8], end: [0.1, 7.95], sillHeight: 0.6, topHeight: 2.6 },
  { kind: 'window', start: [0.1, 12.0], end: [0.1, 13.1], sillHeight: 1.1, topHeight: 2.4 },
  { kind: 'archway', start: [1.5, 2.83], end: [1.5, 3.73], topHeight: 2.45, arched: true },
  { kind: 'door', start: [1.5, 5.27], end: [1.5, 4.48], swingDirection: [1, 0], topHeight: 2.4, arched: true, style: 'wood', openAngleDegrees: 78 },
  { kind: 'door', start: [1.6, 2.64], end: [2.4, 2.64], swingDirection: [0, -1], topHeight: 2.2, style: 'wood', openAngleDegrees: 60 },
  { kind: 'door', start: [3.8, 9.8], end: [3.8, 9.05], swingDirection: [1, 0], topHeight: 2.4, arched: true, style: 'wood', openAngleDegrees: 78 },
  { kind: 'door', start: [5.55, 17.6], end: [6.45, 17.6], swingDirection: [0, -1], topHeight: 2.6, style: 'main', openAngleDegrees: 85 },
];

/** Các cánh cửa kính xếp ở sảnh bên (đường gấp khúc trên mặt bằng). */
export const FOLDING_DOOR_PANELS = [
  [[6.9, 11.25], [7.68, 12.03], [6.9, 12.81], [7.68, 13.59]],
  [[6.9, 15.6], [7.68, 14.82]],
];

export const FLOOR_FINISH_NAMES = {
  wood: 'Sàn gỗ', tile: 'Gạch 60×120', wet: 'Gạch chống trơn', porch: 'Đá lát sảnh', deck: 'Sàn gỗ ngoài trời',
};

/**
 * Phòng. outline là đa giác theo tim tường; labelPosition, labelFontSize, labelVertical dùng cho nhãn 2D;
 * cameraView là tên góc nhìn 3D khi chọn phòng; showLabelIn3d bật nhãn nổi trong 3D.
 */
export const ROOMS = [
  { id: 'master-bedroom', name: 'Phòng ngủ 1', floor: 'wood', outline: [[1.5, 3.94], [2.95, 3.94], [2.95, 0.1], [6.9, 0.1], [6.9, 6.1], [1.5, 6.1]],
    labelPosition: [4.55, 4.3], dimensionsText: '3,95 × 6,0 m', cameraView: 'master-bedroom', showLabelIn3d: true, labelAnchor3d: [4.8, 3.6],
    description: 'Phòng ngủ chính: giường 1m8 tựa tường hông, tủ áo dài 3,7 m, bàn làm việc, sofa đọc sách đặt sát cửa kính lớn nhìn ra vườn.' },
  { id: 'bathroom', name: 'WC · Tắm', shortName: 'WC', floor: 'wet', outline: [[1.5, 0.1], [2.95, 0.1], [2.95, 2.64], [1.5, 2.64]],
    labelPosition: [1.86, 2.05], labelFontSize: 20, dimensionsText: '1,45 × 2,55 m', cameraView: 'bathroom',
    description: 'Khu tắm đứng có vách kính, bồn cầu, cửa sổ lấy sáng cao.' },
  { id: 'washbasin', name: 'Lavabo', floor: 'wet', outline: [[1.5, 2.64], [2.95, 2.64], [2.95, 3.94], [1.5, 3.94]],
    labelPosition: [1.9, 3.42], labelFontSize: 15, dimensionsText: '1,45 × 1,3 m', cameraView: 'washbasin',
    description: 'Lavabo đặt ngoài khu WC, mở vòm ra hành lang để dùng chung.' },
  { id: 'hallway', name: 'Hành lang', floor: 'tile', outline: [[0.1, 0.1], [1.5, 0.1], [1.5, 6.1], [0.1, 6.1]],
    labelPosition: [0.8, 3.1], labelVertical: true, dimensionsText: '1,4 × 6,0 m', cameraView: 'hallway',
    description: 'Nối phòng ăn với cửa sau ra sân vườn, dẫn vào phòng ngủ 1 và lavabo.' },
  { id: 'dining-room', name: 'Phòng ăn', floor: 'tile', outline: [[0.1, 6.1], [3.8, 6.1], [3.8, 10.55], [0.1, 10.55]],
    labelPosition: [1.05, 9.2], dimensionsText: '3,7 × 4,45 m', cameraView: 'dining-room', showLabelIn3d: true,
    description: 'Bàn ăn 6 ghế dưới đèn thả gỗ, cửa sổ hông. Góc tường bo tròn R350 dẫn sang phòng ngủ 2.' },
  { id: 'bedroom-2', name: 'Phòng ngủ 2', floor: 'wood', outline: [[3.8, 6.1], [6.9, 6.1], [6.9, 10.55], [3.8, 10.55]],
    labelPosition: [4.78, 8.3], labelFontSize: 24, dimensionsText: '3,1 × 4,45 m', cameraView: 'bedroom-2', showLabelIn3d: true,
    description: 'Giường 1m5, bàn học cạnh cửa sổ, tủ áo và kệ thấp. Cửa vòm gỗ mở từ phòng ăn.' },
  { id: 'kitchen', name: 'Bếp + Bar', floor: 'tile', outline: [[0.1, 10.55], [3.4, 10.55], [3.4, 15.7], [0.1, 15.7]],
    labelPosition: [2.25, 15.2], dimensionsText: '3,3 × 5,15 m', cameraView: 'kitchen', showLabelIn3d: true,
    description: 'Tủ lạnh, tủ đồ khô, bếp chữ I dọc tường có cửa sổ trên chậu rửa, đảo bar bo tròn với 2 ghế cao.' },
  { id: 'family-area', name: 'Sinh hoạt chung', floor: 'tile', outline: [[3.4, 10.55], [6.9, 10.55], [6.9, 15.7], [3.4, 15.7]],
    labelPosition: [5.05, 13.7], dimensionsText: '3,5 × 5,15 m', cameraView: 'family-area', showLabelIn3d: true,
    description: 'Góc làm việc đôi, mặt hông là cửa kính xếp mở toàn bộ ra sảnh bên và vườn.' },
  { id: 'living-room', name: 'Phòng khách', floor: 'tile', outline: [[0.1, 15.7], [5.2, 15.7], [5.2, 19.2], [0.1, 19.2]],
    labelPosition: [3.35, 17.25], dimensionsText: '5,1 × 3,5 m', cameraView: 'living-room', showLabelIn3d: true,
    description: 'Sofa văng dài, bộ bàn trà tròn lồng nhau trên thảm, kệ TV dọc vách, cửa sổ lớn ra mặt tiền.' },
  { id: 'foyer', name: 'Tiền sảnh', floor: 'tile', outline: [[5.2, 15.7], [6.9, 15.7], [6.9, 17.6], [5.2, 17.6]],
    labelPosition: [5.82, 16.45], labelFontSize: 16, dimensionsText: '1,7 × 1,9 m', cameraView: 'foyer',
    description: 'Cửa chính rộng 0,9 m, tủ giày sát tường.' },
  { id: 'porch', name: 'Sảnh', floor: 'porch', outline: [[5.2, 17.6], [6.9, 17.6], [6.9, 19.2], [5.2, 19.2]], outdoor: true,
    labelPosition: [6.05, 18.55], labelFontSize: 17, dimensionsText: '1,7 × 1,6 m', cameraView: 'porch',
    description: 'Lối vào chính có mái che, lùi vào trong mặt tiền.' },
  { id: 'side-terrace', name: 'Sảnh bên', floor: 'deck', outline: [[7.0, 10.6], [8.4, 10.6], [8.4, 17.0], [7.0, 17.0]], outdoor: true,
    labelPosition: [8.1, 12.35], labelVertical: true, labelFontSize: 17, dimensionsText: '1,4 × 6,4 m', cameraView: 'garden', showLabelIn3d: true,
    description: 'Hiên sàn gỗ bên ngoài cửa kính xếp, đặt ghế thư giãn và cây xanh.' },
];
ROOMS.forEach(room => { room.area = polygonArea(room.outline); });

export const findRoomById = roomId => ROOMS.find(room => room.id === roomId);

/** Khu đất (hàng rào) và cây trong vườn. Toạ độ 3D: x, z. */
export const LOT_BOUNDS = { minX: -2.4, maxX: 15.6, minZ: -8.5, maxZ: 27.5 };
export const TREE_PLACEMENTS = [ // [x, z, tỉ lệ]
  [-0.6, -4.8, 1.1], [3.2, -6.6, 1.25], [7.6, -5.6, 1.15], [12.2, -3.2, 1.0], [14.2, 3.8, 1.2],
  [14.6, 10.5, 0.95], [14.0, 19.5, 1.1], [11.2, 23.2, 0.9], [-1.6, 23.4, 0.85], [1.6, -3.2, 0.7],
];
export const SHRUB_POSITIONS = [[-1.4, 3], [-1.5, 8.5], [-1.4, 13.5], [-1.5, 18], [8.9, 2], [9.6, 6.5], [9.2, 18.5], [2, 21.5], [4.2, 21.4], [8.3, -1.2], [5.6, -1.4]];
export const STEPPING_STONE_POSITIONS = [[0.85, -0.7], [0.95, -1.45], [0.8, -2.2], [3.7, -0.7], [3.6, -1.45], [3.75, -2.2], [9.05, 13.6], [9.8, 13.4], [10.55, 13.65], [11.3, 13.45]];
export const GROUND_LEVEL = -0.32;

/** Cao độ mặt sàn tại một điểm (sàn nhà 0, hiên gỗ, bậc tam cấp, sân cỏ). */
export function floorHeightAt(x, z) {
  if (x >= 0 && x <= 7 && z >= 0 && z <= 19.3) return 0;
  if (x > 7 && x <= 8.4 && z >= 10.6 && z <= 17) return -0.08;
  if (x >= 5.15 && x <= 6.95 && z > 19.3 && z <= 19.58) return -0.06;
  if (x >= 5.15 && x <= 6.95 && z > 19.58 && z <= 19.87) return -0.2;
  return GROUND_LEVEL;
}
