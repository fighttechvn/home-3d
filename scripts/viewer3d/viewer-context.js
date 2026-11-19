/** Đối tượng dùng chung của cảnh 3D và các cài đặt hiển thị. */
import { getElement, t } from '../core/dom.js';

export const viewer = {
  initialized: false,
  initializationAttempted: false,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  sunLight: null,
  hemisphereLight: null,
  ambientLight: null,
  groups: { base: null, landscape: null, walls: null, roof: null, furniture: null, nightLights: null, wallFixtures: null },
};

export const displaySettings = {
  roofVisible: false,
  cutWalls: false,
  furnitureVisible: true,
  roomLabelsVisible: true,
  realisticMaterials: false,
  nightMode: false,
  indoorLightsOn: true,
  outdoorLightsOn: true,
};

/** Tâm cảnh (giữa nhà). THREE có thể không tải được: khi đó chế độ 3D báo lỗi, bản vẽ 2D vẫn chạy. */
export const SCENE_CENTER = window.THREE ? new THREE.Vector3(3.6, 0, 9.7) : null;

export const MODEL_HINTS = {
  orbit: t('Kéo để xoay · Cuộn hoặc chụm để thu phóng · Chuột phải hoặc 2 ngón để di chuyển · Bấm Đi dạo để điều khiển nhân vật'),
  eyeLevel: t('Kéo để nhìn quanh · Cuộn để tiến, lùi · Nhấn W A S D hoặc nút Đi dạo để đi tiếp từ đây'),
  walkThirdPerson: t('W A S D hoặc phím mũi tên: đi · Shift: chạy · Kéo: xoay camera · Cuộn: xa, gần · V: mắt nhân vật · Esc: thoát'),
  walkFirstPerson: t('W / S: đi tới, lùi · A / D: quay trái, phải · Shift: chạy · Kéo: nhìn quanh · V: góc thứ 3 · Esc: thoát'),
};
export function setModelHint(text) { getElement('#model-hint').textContent = text; }
