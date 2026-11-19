/** Trạng thái dùng chung giữa các tính năng (chỉ dữ liệu, không có logic). */

export const appState = {
  viewMode: '3d',            // '2d' bản vẽ | '3d' mô hình
  selectedRoomId: null,
  selectedFurnitureId: null,
};

export const interactionState = {
  walking: false,            // đang điều khiển nhân vật
  eyeLevelView: false,       // camera đang ở góc nhìn trong phòng
  cameraFlying: false,       // camera đang bay giữa hai góc nhìn
  touring: false,            // đang phát / quay video tham quan
  editingFurniture: false,   // đang ở chế độ sắp xếp đồ
};
