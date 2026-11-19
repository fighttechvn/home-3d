/**
 * Kho đồ nội thất đang đặt trong nhà. Mọi thay đổi đi qua đây để bản vẽ 2D, mô hình 3D,
 * va chạm, danh sách đồ và bộ lưu cùng được cập nhật qua sự kiện.
 */
import { t } from '../core/i18n.js';
import {
  DEFAULT_FURNITURE, FURNITURE_TYPE_NAMES, KNOWN_FURNITURE_TYPES, LEGACY_TYPE_NAMES,
} from '../data/furniture-catalog.js';
import { emitEvent } from '../core/events.js';

export const cloneFurniture = value => JSON.parse(JSON.stringify(value));

export const furnitureItems = DEFAULT_FURNITURE.map((item, index) => ({ ...cloneFurniture(item), id: `d${index}`, rotation: item.rotation || 0 }));
export const DEFAULT_FURNITURE_LAYOUT = cloneFurniture(furnitureItems);

export const getFurnitureById = itemId => furnitureItems.find(item => item.id === itemId);
export const getFurnitureDisplayName = item => (item.name ? t(item.name) : FURNITURE_TYPE_NAMES[item.type] || item.type);
export const createFurnitureId = () => `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/** Đang kéo một món: chỉ cập nhật vị trí, chưa lưu. */
export function notifyFurnitureMoved(item) {
  emitEvent('furniture:moved', { item });
}
/** Đã thay đổi xong. changedIds = null nghĩa là cả bố cục. */
export function notifyFurnitureChanged(changedIds, reason = 'edited') {
  emitEvent('furniture:changed', { changedIds, reason });
}

export function addFurniture(item) {
  furnitureItems.push(item);
  notifyFurnitureChanged([item.id], 'added');
}

export function removeFurniture(itemId) {
  const index = furnitureItems.findIndex(item => item.id === itemId);
  if (index < 0) return;
  furnitureItems.splice(index, 1);
  notifyFurnitureChanged([itemId], 'removed');
}

/** Bố cục lưu từ phiên bản trước dùng tên trường ngắn (t, c, s, r...). */
function migrateLegacyFields(raw) {
  if (!('t' in raw) || 'type' in raw) return raw;
  const migrated = {
    id: raw.id, type: LEGACY_TYPE_NAMES[raw.t] || raw.t, center: raw.c, size: raw.s, rotation: raw.r || 0,
  };
  if (raw.h != null) migrated.height = raw.h;
  if (raw.y != null) migrated.mountHeight = raw.y;
  if (raw.size != null) migrated.plantScale = raw.size;
  if (raw.top) migrated.topFinish = raw.top;
  if (raw.monitor) migrated.hasMonitor = true;
  if (raw.name) migrated.name = raw.name;
  if (raw.hidden) migrated.hidden = true;
  return migrated;
}

export function normalizeFurnitureItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const item = migrateLegacyFields(raw);
  const isValid = typeof item.type === 'string' && KNOWN_FURNITURE_TYPES.has(item.type)
    && Array.isArray(item.center) && item.center.length === 2
    && Array.isArray(item.size) && item.size.length === 2
    && [...item.center, ...item.size].every(Number.isFinite);
  if (!isValid) return null;
  return {
    ...item,
    id: typeof item.id === 'string' ? item.id : createFurnitureId(),
    rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
    name: typeof item.name === 'string' ? item.name.slice(0, 60) : undefined,
  };
}

export function replaceAllFurniture(rawItems, reason = 'loaded') {
  if (!Array.isArray(rawItems)) return;
  const validItems = rawItems.map(normalizeFurnitureItem).filter(Boolean);
  furnitureItems.splice(0, furnitureItems.length, ...validItems);
  notifyFurnitureChanged(null, reason);
}

export function resetFurnitureToDefault() {
  replaceAllFurniture(cloneFurniture(DEFAULT_FURNITURE_LAYOUT), 'reset');
}
