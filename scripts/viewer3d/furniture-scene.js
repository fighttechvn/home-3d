/** Giữ mô hình 3D của đồ nội thất khớp với kho đồ (thêm, xoá, ẩn, di chuyển). */
import { furnitureItems, getFurnitureById } from '../model/furniture-store.js';
import { floorHeightAt } from '../data/house-plan.js';
import { onEvent } from '../core/events.js';
import { viewer, displaySettings } from './viewer-context.js';
import { buildFurnitureModel } from './furniture-models.js';
import { enableShadows, disposeGroup } from './primitives.js';

export const furnitureModelsById = new Map();

export function createFurnitureGroup() {
  viewer.groups.furniture = new THREE.Group();
  viewer.groups.furniture.visible = displaySettings.furnitureVisible;
  viewer.scene.add(viewer.groups.furniture);
}

/** Dựng lại mô hình một món (hoặc gỡ bỏ nếu món đã bị xoá / ẩn). */
export function syncFurnitureModel(itemId) {
  disposeGroup(furnitureModelsById.get(itemId));
  furnitureModelsById.delete(itemId);
  const item = getFurnitureById(itemId);
  if (!item || item.hidden || !viewer.groups.furniture) return;
  const model = buildFurnitureModel(item);
  model.userData.furnitureId = item.id;
  enableShadows(model);
  if (model.userData.wallMounted && displaySettings.cutWalls) model.visible = false;
  viewer.groups.furniture.add(model);
  furnitureModelsById.set(item.id, model);
}

/** changedIds = null: dựng lại toàn bộ. */
export function syncFurnitureModels(changedIds = null) {
  if (!viewer.initialized && !viewer.groups.furniture) return;
  const idsToSync = changedIds || [...new Set([...furnitureModelsById.keys(), ...furnitureItems.map(item => item.id)])];
  idsToSync.forEach(syncFurnitureModel);
}

export function updateFurnitureModelTransform(item) {
  const model = furnitureModelsById.get(item.id);
  if (!model) return;
  model.position.set(item.center[0], floorHeightAt(item.center[0], item.center[1]) + 0.02, item.center[1]);
  model.rotation.y = -(item.rotation || 0) * Math.PI / 180;
}

/** Đồ treo tường ẩn khi tường bị cắt thấp. */
export function updateWallMountedVisibility() {
  furnitureModelsById.forEach(model => { if (model.userData.wallMounted) model.visible = !displaySettings.cutWalls; });
}

/** Chỉ đổi vị trí / góc xoay thì không cần dựng lại mô hình (giữ nguyên chi tiết ngẫu nhiên như sách trên kệ). */
const TRANSFORM_ONLY_REASONS = new Set(['moved', 'rotated']);

export function initFurnitureSceneSync() {
  onEvent('furniture:changed', ({ changedIds, reason }) => {
    if (!viewer.initialized) return;
    if (changedIds && TRANSFORM_ONLY_REASONS.has(reason)) {
      changedIds.forEach(itemId => { const item = getFurnitureById(itemId); if (item) updateFurnitureModelTransform(item); });
      return;
    }
    syncFurnitureModels(changedIds);
  });
  onEvent('furniture:moved', ({ item }) => updateFurnitureModelTransform(item));
}
