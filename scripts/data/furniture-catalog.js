/**
 * Đồ nội thất theo bản vẽ và thư viện đồ dùng.
 * Mỗi món: type, center [x, y] (mét), size [rộng, sâu], rotation (độ, mặt trước hướng +y cục bộ),
 * tuỳ chọn: height (chiều cao riêng), mountHeight (cao độ treo tường), plantScale, topFinish, hasMonitor.
 */

export const FURNITURE_TYPE_NAMES = {
  bed: 'Giường', nightstand: 'Tab đầu giường', painting: 'Tranh treo tường', desk: 'Bàn làm việc', chair: 'Ghế',
  loveseat: 'Sofa thư giãn', roundTable: 'Bàn tròn', wardrobe: 'Tủ quần áo', lowCabinet: 'Kệ thấp', shower: 'Sen tắm',
  showerGlass: 'Vách kính tắm', toilet: 'Bồn cầu', washbasin: 'Lavabo', diningTable: 'Bàn ăn', pendantLamp: 'Đèn thả',
  plant: 'Cây cảnh', fridge: 'Tủ lạnh', pantry: 'Tủ đồ khô', kitchenCounter: 'Tủ bếp dưới', sink: 'Chậu rửa',
  cooktop: 'Bếp từ', kitchenIsland: 'Đảo bar', barStool: 'Ghế bar', workDesk: 'Bàn làm việc đôi', rug: 'Thảm',
  sofa: 'Sofa văng', floorLamp: 'Đèn cây', tvConsole: 'Kệ TV', tv: 'TV', shoeCabinet: 'Tủ giày',
  loungeChair: 'Ghế thư giãn', armchair: 'Ghế bành', bookshelf: 'Kệ sách', dresser: 'Tủ ngăn kéo',
  bathtub: 'Bồn tắm', bench: 'Ghế băng gỗ',
};
export const KNOWN_FURNITURE_TYPES = new Set(Object.keys(FURNITURE_TYPE_NAMES));

/** Đồ treo tường: ẩn khi cắt thấp tường. */
export const WALL_MOUNTED_TYPES = new Set(['tv', 'painting', 'pendantLamp', 'shower']);

/** Chữ ghi trên bản vẽ cạnh một số món, giống bản vẽ gốc. */
export const PLAN_FURNITURE_TAGS = {
  diningTable: 'Bàn ăn', kitchenIsland: 'BAR', fridge: 'Tủ lạnh', pantry: 'Tủ đồ khô', shoeCabinet: 'Tủ giày', tvConsole: 'Kệ TV',
};
export const PLAN_TEXT_NOTES = [{ text: 'TẮM', x: 1.95, y: 0.75 }];

export const DEFAULT_FURNITURE = [
  // phòng ngủ 1
  { type: 'bed', center: [5.75, 1.43], size: [1.85, 2.0], rotation: 90 },
  { type: 'nightstand', center: [6.56, 2.62], size: [0.42, 0.4], rotation: 90 },
  { type: 'painting', center: [6.785, 1.43], size: [1.0, 0.03], rotation: 90, mountHeight: 2.05, height: 1.2 },
  { type: 'desk', center: [3.28, 3.27], size: [0.95, 0.5], rotation: -90 },
  { type: 'chair', center: [3.78, 3.27], size: [0.44, 0.44], rotation: 90 },
  { type: 'loveseat', center: [6.15, 4.25], size: [1.45, 0.85], rotation: -90 },
  { type: 'roundTable', center: [6.4, 3.15], size: [0.42, 0.42], height: 0.5 },
  { type: 'wardrobe', center: [4.9, 5.78], size: [3.74, 0.52], rotation: 180 },
  // phòng ngủ 2
  { type: 'bed', center: [5.75, 7.0], size: [1.5, 2.0], rotation: 90 },
  { type: 'nightstand', center: [6.56, 7.98], size: [0.4, 0.38], rotation: 90 },
  { type: 'desk', center: [6.53, 8.85], size: [1.0, 0.5], rotation: 90, hasMonitor: true },
  { type: 'chair', center: [6.02, 8.85], size: [0.44, 0.44], rotation: -90 },
  { type: 'wardrobe', center: [5.89, 10.23], size: [1.8, 0.5], rotation: 180 },
  { type: 'lowCabinet', center: [4.52, 10.29], size: [0.94, 0.38], rotation: 180 },
  // WC + lavabo
  { type: 'shower', center: [2.78, 0.7], size: [0.3, 0.3], rotation: 90 },
  { type: 'showerGlass', center: [2.55, 1.4], size: [0.7, 0.02], height: 2.0 },
  { type: 'toilet', center: [2.6, 1.95], size: [0.4, 0.66], rotation: 90 },
  { type: 'washbasin', center: [2.66, 3.2], size: [0.6, 0.45], rotation: 90 },
  // phòng ăn
  { type: 'diningTable', center: [2.75, 7.4], size: [0.85, 1.8] },
  { type: 'chair', center: [2.07, 6.85], size: [0.44, 0.44], rotation: -90 },
  { type: 'chair', center: [2.07, 7.4], size: [0.44, 0.44], rotation: -90 },
  { type: 'chair', center: [2.07, 7.95], size: [0.44, 0.44], rotation: -90 },
  { type: 'chair', center: [3.43, 6.85], size: [0.44, 0.44], rotation: 90 },
  { type: 'chair', center: [3.43, 7.4], size: [0.44, 0.44], rotation: 90 },
  { type: 'chair', center: [3.43, 7.95], size: [0.44, 0.44], rotation: 90 },
  { type: 'pendantLamp', center: [2.75, 7.4], size: [1.5, 0.08], rotation: 90 },
  { type: 'plant', center: [3.0, 10.1], size: [0.69, 0.69], plantScale: 1.45 },
  // bếp
  { type: 'fridge', center: [0.51, 10.94], size: [0.64, 0.62], rotation: -90 },
  { type: 'pantry', center: [0.51, 11.58], size: [0.62, 0.62], rotation: -90 },
  { type: 'kitchenCounter', center: [0.51, 13.45], size: [3.1, 0.62], rotation: -90 },
  { type: 'sink', center: [0.51, 12.55], size: [0.75, 0.45], rotation: -90 },
  { type: 'cooktop', center: [0.51, 14.1], size: [0.7, 0.5], rotation: -90 },
  { type: 'kitchenIsland', center: [2.15, 13.07], size: [0.66, 2.45] },
  { type: 'barStool', center: [2.85, 12.55], size: [0.42, 0.42], height: 0.68 },
  { type: 'barStool', center: [2.85, 13.6], size: [0.42, 0.42], height: 0.68 },
  // góc làm việc
  { type: 'workDesk', center: [4.9, 10.98], size: [1.6, 0.65] },
  { type: 'chair', center: [4.45, 11.62], size: [0.44, 0.44], rotation: 180 },
  { type: 'chair', center: [5.35, 11.62], size: [0.44, 0.44], rotation: 180 },
  // phòng khách
  { type: 'rug', center: [1.65, 17.5], size: [1.8, 2.5] },
  { type: 'sofa', center: [0.63, 17.4], size: [2.1, 0.86], rotation: -90 },
  { type: 'roundTable', center: [1.62, 17.3], size: [1.0, 1.0], height: 0.4, topFinish: 'white' },
  { type: 'roundTable', center: [1.62, 18.05], size: [0.7, 0.7], height: 0.3 },
  { type: 'plant', center: [0.55, 15.98], size: [0.6, 0.6], plantScale: 1.3 },
  { type: 'floorLamp', center: [0.5, 18.78], size: [0.36, 0.36] },
  { type: 'tvConsole', center: [4.86, 17.42], size: [2.2, 0.45], rotation: 90 },
  { type: 'tv', center: [5.08, 17.42], size: [1.45, 0.05], rotation: 90, mountHeight: 1.3 },
  // tiền sảnh
  { type: 'shoeCabinet', center: [6.64, 16.72], size: [1.5, 0.32], rotation: 90 },
  // sảnh bên
  { type: 'plant', center: [7.55, 10.95], size: [0.7, 0.7], plantScale: 1.5 },
  { type: 'plant', center: [7.55, 16.55], size: [0.7, 0.7], plantScale: 1.5 },
  { type: 'loungeChair', center: [7.9, 14.2], size: [0.8, 1.0], rotation: -90 },
];

export const LIBRARY_CATEGORIES = [
  ['all', 'Tất cả'], ['living', 'Phòng khách'], ['bedroom', 'Phòng ngủ'], ['kitchen', 'Bếp & ăn'],
  ['bathroom', 'Phòng tắm'], ['decor', 'Trang trí'], ['outdoor', 'Ngoài trời'],
];

export const FURNITURE_LIBRARY = [
  { category: 'living', name: 'Sofa văng 3 chỗ', template: { type: 'sofa', size: [2.1, 0.86] } },
  { category: 'living', name: 'Ghế bành', template: { type: 'armchair', size: [0.82, 0.8] } },
  { category: 'living', name: 'Bàn trà tròn', template: { type: 'roundTable', size: [0.9, 0.9], height: 0.4, topFinish: 'white' } },
  { category: 'living', name: 'Kệ TV', template: { type: 'tvConsole', size: [1.8, 0.42] } },
  { category: 'living', name: 'TV 55 inch', template: { type: 'tv', size: [1.25, 0.05], mountHeight: 1.3 } },
  { category: 'living', name: 'Kệ sách', template: { type: 'bookshelf', size: [1.0, 0.35] } },
  { category: 'living', name: 'Thảm', template: { type: 'rug', size: [1.6, 2.3] } },
  { category: 'living', name: 'Đèn cây', template: { type: 'floorLamp', size: [0.36, 0.36] } },
  { category: 'bedroom', name: 'Giường đôi 1m8', template: { type: 'bed', size: [1.85, 2.0] } },
  { category: 'bedroom', name: 'Giường 1m5', template: { type: 'bed', size: [1.5, 2.0] } },
  { category: 'bedroom', name: 'Giường đơn 1m', template: { type: 'bed', size: [1.0, 2.0] } },
  { category: 'bedroom', name: 'Tab đầu giường', template: { type: 'nightstand', size: [0.42, 0.4] } },
  { category: 'bedroom', name: 'Tủ quần áo', template: { type: 'wardrobe', size: [1.6, 0.55] } },
  { category: 'bedroom', name: 'Tủ ngăn kéo', template: { type: 'dresser', size: [1.0, 0.45] } },
  { category: 'bedroom', name: 'Bàn làm việc', template: { type: 'desk', size: [1.2, 0.6], hasMonitor: true } },
  { category: 'bedroom', name: 'Sofa thư giãn', template: { type: 'loveseat', size: [1.45, 0.85] } },
  { category: 'kitchen', name: 'Bàn ăn chữ nhật', template: { type: 'diningTable', size: [0.85, 1.8] } },
  { category: 'kitchen', name: 'Bàn ăn tròn', template: { type: 'roundTable', size: [1.1, 1.1], height: 0.75 } },
  { category: 'kitchen', name: 'Ghế ăn', template: { type: 'chair', size: [0.44, 0.44] } },
  { category: 'kitchen', name: 'Ghế bar', template: { type: 'barStool', size: [0.42, 0.42], height: 0.68 } },
  { category: 'kitchen', name: 'Tủ lạnh', template: { type: 'fridge', size: [0.7, 0.68] } },
  { category: 'kitchen', name: 'Tủ bếp dưới', template: { type: 'kitchenCounter', size: [1.8, 0.6] } },
  { category: 'kitchen', name: 'Đảo bếp', template: { type: 'kitchenIsland', size: [0.8, 2.0] } },
  { category: 'kitchen', name: 'Đèn thả bàn ăn', template: { type: 'pendantLamp', size: [1.5, 0.08] } },
  { category: 'bathroom', name: 'Bồn cầu', template: { type: 'toilet', size: [0.4, 0.66] } },
  { category: 'bathroom', name: 'Lavabo', template: { type: 'washbasin', size: [0.6, 0.45] } },
  { category: 'bathroom', name: 'Bồn tắm', template: { type: 'bathtub', size: [0.75, 1.6] } },
  { category: 'bathroom', name: 'Vách kính tắm', template: { type: 'showerGlass', size: [0.9, 0.02], height: 2.0 } },
  { category: 'decor', name: 'Cây cảnh lớn', template: { type: 'plant', size: [0.6, 0.6], plantScale: 1.4 } },
  { category: 'decor', name: 'Cây nhỏ', template: { type: 'plant', size: [0.4, 0.4], plantScale: 0.85 } },
  { category: 'decor', name: 'Tranh treo tường', template: { type: 'painting', size: [0.9, 0.03], mountHeight: 1.6, height: 0.9 } },
  { category: 'outdoor', name: 'Ghế thư giãn', template: { type: 'loungeChair', size: [0.8, 1.0] } },
  { category: 'outdoor', name: 'Ghế băng gỗ', template: { type: 'bench', size: [1.4, 0.48] } },
  { category: 'outdoor', name: 'Bàn cà phê', template: { type: 'roundTable', size: [0.6, 0.6], height: 0.5 } },
];

/** Tên loại đồ của phiên bản cũ (bố cục đã lưu trước đây) → tên mới. */
export const LEGACY_TYPE_NAMES = {
  roundtable: 'roundTable', lowcab: 'lowCabinet', glass: 'showerGlass', lavabo: 'washbasin', table: 'diningTable',
  pendant: 'pendantLamp', counter: 'kitchenCounter', hob: 'cooktop', island: 'kitchenIsland', stool: 'barStool',
  workdesk: 'workDesk', lamp: 'floorLamp', tvconsole: 'tvConsole', shoecab: 'shoeCabinet', lounge: 'loungeChair',
};
