/**
 * Kênh sự kiện nội bộ để các tính năng báo cho nhau mà không phụ thuộc vòng.
 *
 * Các sự kiện đang dùng:
 *  - 'room:selected'        { roomId, source }   source: 'list' | 'plan' | 'label' | 'walk'
 *  - 'mode:changed'         { mode }             '2d' | '3d'
 *  - 'furniture:moved'      { item }             đang kéo, chỉ cập nhật vị trí
 *  - 'furniture:changed'    { changedIds, reason } changedIds = null nghĩa là tất cả
 *  - 'furniture:selected'   { itemId }
 *  - 'viewer:canvas-ready'  { canvas }           ngay khi có canvas, trước OrbitControls
 *  - 'viewer:ready'         {}                   cảnh 3D đã dựng xong
 *  - 'camera:view-changing' { viewName }
 *  - 'materials:swapped'    { realistic }
 *  - 'walk:starting', 'furniture-editor:starting', 'tour:starting', 'tour:ended'
 */
const listenersByEvent = new Map();

export function onEvent(eventName, handler) {
  if (!listenersByEvent.has(eventName)) listenersByEvent.set(eventName, new Set());
  listenersByEvent.get(eventName).add(handler);
  return () => listenersByEvent.get(eventName).delete(handler);
}

export function emitEvent(eventName, detail = {}) {
  const listeners = listenersByEvent.get(eventName);
  if (listeners) [...listeners].forEach(handler => handler(detail));
}
