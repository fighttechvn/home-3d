/**
 * Chế độ "Sắp xếp đồ": thư viện đồ dùng, danh sách đồ trong nhà (ẩn/hiện, xoá),
 * chọn và kéo đồ trên bản vẽ 2D hoặc trong 3D, xoay, nhân bản, khôi phục theo bản vẽ.
 */
import { getElement, getElements, setPressed, escapeHtml, t } from '../../core/dom.js';
import { clamp, snapToGrid, isPointInPolygon } from '../../core/geometry.js';
import { appState, interactionState } from '../../core/app-state.js';
import { emitEvent, onEvent } from '../../core/events.js';
import { ROOMS } from '../../data/house-plan.js';
import { FURNITURE_LIBRARY, LIBRARY_CATEGORIES } from '../../data/furniture-catalog.js';
import {
  furnitureItems, getFurnitureById, getFurnitureDisplayName, createFurnitureId, cloneFurniture,
  addFurniture, removeFurniture, notifyFurnitureMoved, notifyFurnitureChanged, resetFurnitureToDefault,
} from '../../model/furniture-store.js';
import { drawFurnitureSymbol } from '../../plan2d/furniture-symbols.js';
import { toSvgUnits } from '../../plan2d/svg-shapes.js';
import { setPlanEditingMode } from '../../plan2d/plan-renderer.js';
import { setPlanPointerInterceptor, clientToPlanPoint, getPlanViewCenterInMeters } from '../../plan2d/plan-viewport.js';
import { viewer } from '../../viewer3d/viewer-context.js';
import { furnitureModelsById } from '../../viewer3d/furniture-scene.js';
import { setFurnitureVisible } from '../../viewer3d/display-settings.js';

const PLACEMENT_LIMITS = { minX: -2, maxX: 15, minZ: -8, maxZ: 27 };
const EYE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const EYE_CLOSED_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8" opacity=".5"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const DELETE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

let selectedLibraryCategory = 'all';
let selectionOutline3d = null;
let resetConfirmationTimer = 0;

const clampToPlacementArea = ([x, z]) => [snapToGrid(clamp(x, PLACEMENT_LIMITS.minX, PLACEMENT_LIMITS.maxX)), snapToGrid(clamp(z, PLACEMENT_LIMITS.minZ, PLACEMENT_LIMITS.maxZ))];

/* ---------- chọn đồ ---------- */
function updateSelectionOutline3d() {
  if (!viewer.initialized) return;
  const model = interactionState.editingFurniture && appState.selectedFurnitureId && furnitureModelsById.get(appState.selectedFurnitureId);
  if (!model || interactionState.touring) {
    if (selectionOutline3d) { viewer.scene.remove(selectionOutline3d); selectionOutline3d.geometry.dispose(); selectionOutline3d = null; }
    return;
  }
  if (!selectionOutline3d) {
    selectionOutline3d = new THREE.BoxHelper(model, 0xe0782f);
    selectionOutline3d.material.depthTest = false;
    selectionOutline3d.material.transparent = true;
    selectionOutline3d.renderOrder = 10;
    viewer.scene.add(selectionOutline3d);
  }
  selectionOutline3d.setFromObject(model);
}

export function selectFurniture(itemId) {
  appState.selectedFurnitureId = itemId || null;
  const item = itemId && getFurnitureById(itemId);
  emitEvent('furniture:selected', { itemId: appState.selectedFurnitureId });
  updateSelectionOutline3d();
  const selectionBar = getElement('#selection-bar');
  if (!item || !interactionState.editingFurniture) {
    selectionBar.hidden = true;
  } else {
    selectionBar.hidden = false;
    getElement('#selection-name').textContent = getFurnitureDisplayName(item);
    getElement('#hide-button').textContent = t(item.hidden ? 'Hiện lại' : 'Ẩn');
  }
  getElements('.furniture-row').forEach(row => row.classList.toggle('is-selected', row.dataset.furnitureId === itemId));
}

/* ---------- thao tác ---------- */
const normalizeRotation = degrees => ((((degrees + 180) % 360) + 360) % 360) - 180;

export function applyFurnitureOperation(operation, itemId = appState.selectedFurnitureId) {
  const item = getFurnitureById(itemId);
  if (!item) return;
  switch (operation) {
    case 'rotate90': case 'rotate15':
      item.rotation = normalizeRotation((item.rotation || 0) + (operation === 'rotate90' ? 90 : 15));
      notifyFurnitureChanged([item.id], 'rotated');
      break;
    case 'toggleHidden':
      item.hidden = !item.hidden;
      notifyFurnitureChanged([item.id], 'visibility');
      break;
    case 'duplicate': {
      const copy = cloneFurniture(item);
      copy.id = createFurnitureId();
      copy.hidden = false;
      copy.center = [snapToGrid(item.center[0] + 0.3), snapToGrid(item.center[1] + 0.3)];
      appState.selectedFurnitureId = copy.id;
      addFurniture(copy);
      break;
    }
    case 'delete':
      if (appState.selectedFurnitureId === item.id) appState.selectedFurnitureId = null;
      removeFurniture(item.id);
      break;
    default:
      return;
  }
  selectFurniture(appState.selectedFurnitureId);
}

/** Đặt đồ mới vào giữa khung nhìn hiện tại (3D: điểm sàn giữa màn hình; 2D: tâm bản vẽ đang xem). */
function getPlacementPoint() {
  if (appState.viewMode === '3d' && viewer.initialized) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), viewer.camera);
    const floorHit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (floorHit && floorHit.distanceTo(viewer.camera.position) < 60) return [clamp(floorHit.x, -1.5, 14.5), clamp(floorHit.z, -7.5, 26.5)];
  }
  const planCenter = appState.viewMode === '2d' && getPlanViewCenterInMeters();
  if (planCenter) return [clamp(planCenter[0], -1.5, 14.5), clamp(planCenter[1], -7.5, 26.5)];
  return [3.5, 13.4];
}

function addFurnitureFromLibrary(libraryIndex) {
  const entry = FURNITURE_LIBRARY[libraryIndex];
  if (!entry) return;
  const item = { ...cloneFurniture(entry.template), id: createFurnitureId(), name: entry.name, rotation: entry.template.rotation || 0 };
  const [x, z] = getPlacementPoint();
  item.center = [snapToGrid(x), snapToGrid(z)];
  appState.selectedFurnitureId = item.id;
  addFurniture(item);
  selectFurniture(item.id);
}

/* ---------- thư viện và danh sách ---------- */
function renderFurnitureLibrary() {
  getElement('#library-categories').innerHTML = LIBRARY_CATEGORIES
    .map(([categoryId, label]) => `<button data-category="${categoryId}" aria-pressed="${categoryId === selectedLibraryCategory}">${label}</button>`).join('');
  getElement('#library-grid').innerHTML = FURNITURE_LIBRARY.map((entry, index) => {
    if (selectedLibraryCategory !== 'all' && entry.category !== selectedLibraryCategory) return '';
    const [width, depth] = entry.template.size, previewWidth = Math.max(width, 0.3) + 0.16, previewDepth = Math.max(depth, 0.3) + 0.16;
    const previewBox = `${toSvgUnits(-previewWidth / 2)} ${toSvgUnits(-previewDepth / 2)} ${toSvgUnits(previewWidth)} ${toSvgUnits(previewDepth)}`;
    return `<button class="library-item" data-library-index="${index}" title="${escapeHtml(t('Thêm {name}', { name: entry.name }))}">`
      + `<svg viewBox="${previewBox}" aria-hidden="true">${drawFurnitureSymbol(entry.template)}</svg>`
      + `<span class="library-item-name">${entry.name}</span><span class="library-item-size">${Math.round(width * 100)} × ${Math.round(depth * 100)}</span></button>`;
  }).join('');
}

function renderFurnitureList() {
  const groups = new Map(ROOMS.map(room => [room.id, { name: room.name, items: [] }]));
  groups.set('outdoor', { name: t('Ngoài trời'), items: [] });
  furnitureItems.forEach(item => {
    const room = ROOMS.find(candidate => isPointInPolygon(item.center, candidate.outline));
    groups.get(room ? room.id : 'outdoor').items.push(item);
  });
  let markup = '';
  for (const group of groups.values()) {
    if (!group.items.length) continue;
    markup += `<li class="furniture-list-group">${group.name} · ${group.items.length}</li>`;
    group.items.forEach(item => {
      const name = escapeHtml(getFurnitureDisplayName(item)), visibilityLabel = t(item.hidden ? 'Hiện lại' : 'Ẩn');
      const rowClasses = ['furniture-row', item.hidden && 'is-hidden', appState.selectedFurnitureId === item.id && 'is-selected'].filter(Boolean).join(' ');
      markup += `<li class="${rowClasses}" data-furniture-id="${escapeHtml(item.id)}">`
        + `<button class="furniture-row-name">${name}</button>`
        + `<button class="furniture-row-visibility" title="${visibilityLabel}" aria-label="${visibilityLabel} ${name}">${item.hidden ? EYE_CLOSED_ICON : EYE_ICON}</button>`
        + `<button class="furniture-row-delete" title="${t('Xóa')}" aria-label="${t('Xóa {name}', { name })}">${DELETE_ICON}</button></li>`;
    });
  }
  getElement('#furniture-list').innerHTML = markup;
  getElement('#furniture-count').textContent = `(${furnitureItems.length})`;
}

/* ---------- bật / tắt chế độ ---------- */
export function setFurnitureEditorMode(enabled) {
  if (enabled) emitEvent('furniture-editor:starting');
  interactionState.editingFurniture = enabled;
  getElements('[data-furniture-editor-toggle]').forEach(button => setPressed(button, enabled));
  getElement('#app').classList.toggle('is-editing', enabled);
  setPlanEditingMode(enabled);
  getElement('#editor-section').hidden = !enabled;
  getElement('#room-section').hidden = enabled;
  if (enabled) {
    setFurnitureVisible(true);
    renderFurnitureLibrary();
    renderFurnitureList();
  }
  selectFurniture(enabled ? appState.selectedFurnitureId : null);
}

/* ---------- kéo đồ trên bản vẽ 2D ---------- */
let planDrag = null;
const planPointerInterceptor = {
  onPointerDown(event) {
    if (!interactionState.editingFurniture) return false;
    const symbol = event.target.closest('.furniture-symbol'), item = symbol && getFurnitureById(symbol.dataset.furnitureId);
    if (!item) return false;
    if (appState.selectedFurnitureId !== item.id) selectFurniture(item.id);
    const start = clientToPlanPoint(event);
    planDrag = { itemId: item.id, pointerId: event.pointerId, startPoint: start, startCenter: [...item.center], moved: false };
    event.preventDefault();
    return true;
  },
  onPointerMove(event) {
    if (!planDrag || event.pointerId !== planDrag.pointerId) return false;
    const item = getFurnitureById(planDrag.itemId);
    if (!item) return true;
    const point = clientToPlanPoint(event);
    item.center = clampToPlacementArea([planDrag.startCenter[0] + (point.x - planDrag.startPoint.x) / 100, planDrag.startCenter[1] + (point.y - planDrag.startPoint.y) / 100]);
    planDrag.moved = true;
    notifyFurnitureMoved(item);
    return true;
  },
  onPointerUp(event) {
    if (!planDrag || event.pointerId !== planDrag.pointerId) return false;
    const { itemId, moved } = planDrag;
    planDrag = null;
    if (moved) notifyFurnitureChanged([itemId], 'moved');
    return true;
  },
  onBackgroundTap() {
    if (interactionState.editingFurniture && appState.selectedFurnitureId) selectFurniture(null);
  },
};

/* ---------- chọn và kéo đồ trong 3D ---------- */
function bindCanvasEditing(canvas) {
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pointerPosition = new THREE.Vector2(), ray = new THREE.Raycaster(), hitPoint = new THREE.Vector3();
  const aimRay = event => {
    const rect = canvas.getBoundingClientRect();
    pointerPosition.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointerPosition, viewer.camera);
  };
  const pickFurniture = event => {
    aimRay(event);
    for (const hit of ray.intersectObjects(viewer.groups.furniture.children, true)) {
      let object = hit.object;
      while (object && !object.userData.furnitureId) object = object.parent;
      if (object) return object.userData.furnitureId;
    }
    return null;
  };
  const floorPointUnder = event => { aimRay(event); return ray.ray.intersectPlane(floorPlane, hitPoint) ? hitPoint.clone() : null; };
  let modelDrag = null, tapStart = null;

  // Đăng ký ở pha capture để chặn OrbitControls khi bấm trúng một món đồ.
  canvas.addEventListener('pointerdown', event => {
    if (!interactionState.editingFurniture || interactionState.walking || interactionState.touring || interactionState.cameraFlying) return;
    const itemId = pickFurniture(event);
    if (!itemId) { tapStart = { x: event.clientX, y: event.clientY }; return; }
    event.stopImmediatePropagation();
    viewer.controls.enabled = false;
    if (appState.selectedFurnitureId !== itemId) selectFurniture(itemId);
    const item = getFurnitureById(itemId), floorPoint = floorPointUnder(event);
    modelDrag = { itemId, pointerId: event.pointerId, grabOffset: floorPoint ? [item.center[0] - floorPoint.x, item.center[1] - floorPoint.z] : [0, 0], moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* con trỏ đã kết thúc */ }
  }, { capture: true });

  canvas.addEventListener('pointermove', event => {
    if (!modelDrag || event.pointerId !== modelDrag.pointerId) return;
    const floorPoint = floorPointUnder(event), item = getFurnitureById(modelDrag.itemId);
    if (!floorPoint || !item) return;
    item.center = clampToPlacementArea([floorPoint.x + modelDrag.grabOffset[0], floorPoint.z + modelDrag.grabOffset[1]]);
    modelDrag.moved = true;
    notifyFurnitureMoved(item);
  });

  canvas.addEventListener('pointerup', event => {
    if (modelDrag && event.pointerId === modelDrag.pointerId) {
      const { itemId, moved } = modelDrag;
      modelDrag = null;
      viewer.controls.enabled = true;
      if (moved) notifyFurnitureChanged([itemId], 'moved');
      return;
    }
    if (tapStart && interactionState.editingFurniture) {
      if (Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y) < 5) selectFurniture(null);
      tapStart = null;
    }
  });
}

/* ---------- phím tắt ---------- */
function bindKeyboardShortcuts() {
  window.addEventListener('keydown', event => {
    if (!interactionState.editingFurniture || !appState.selectedFurnitureId || interactionState.walking || interactionState.touring) return;
    if (event.target.closest && event.target.closest('input, select, textarea')) return;
    if (event.code === 'Delete' || event.code === 'Backspace') { event.preventDefault(); applyFurnitureOperation('delete'); }
    else if (event.code === 'KeyR') applyFurnitureOperation('rotate90');
    else if (event.code === 'Escape') selectFurniture(null);
  });
}

function bindPanelControls() {
  getElements('[data-furniture-editor-toggle]').forEach(button => button.addEventListener('click', () => setFurnitureEditorMode(!interactionState.editingFurniture)));
  getElement('#library-categories').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedLibraryCategory = button.dataset.category;
    renderFurnitureLibrary();
  });
  getElement('#library-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-library-index]');
    if (button) addFurnitureFromLibrary(Number(button.dataset.libraryIndex));
  });
  getElement('#furniture-list').addEventListener('click', event => {
    const row = event.target.closest('.furniture-row');
    if (!row) return;
    const itemId = row.dataset.furnitureId;
    if (event.target.closest('.furniture-row-visibility')) applyFurnitureOperation('toggleHidden', itemId);
    else if (event.target.closest('.furniture-row-delete')) applyFurnitureOperation('delete', itemId);
    else selectFurniture(itemId);
  });
  getElement('#rotate-90-button').addEventListener('click', () => applyFurnitureOperation('rotate90'));
  getElement('#rotate-15-button').addEventListener('click', () => applyFurnitureOperation('rotate15'));
  getElement('#duplicate-button').addEventListener('click', () => applyFurnitureOperation('duplicate'));
  getElement('#hide-button').addEventListener('click', () => applyFurnitureOperation('toggleHidden'));
  getElement('#delete-button').addEventListener('click', () => applyFurnitureOperation('delete'));
  getElement('#deselect-button').addEventListener('click', () => selectFurniture(null));

  // Khôi phục cần bấm hai lần (trình xem không cho dùng hộp thoại confirm).
  const resetButton = getElement('#reset-layout-button');
  const restoreResetLabel = () => { resetConfirmationTimer = 0; resetButton.textContent = t('Khôi phục theo bản vẽ'); resetButton.classList.remove('is-warning'); };
  resetButton.addEventListener('click', () => {
    if (!resetConfirmationTimer) {
      resetConfirmationTimer = setTimeout(restoreResetLabel, 3500);
      resetButton.textContent = t('Bấm lần nữa để khôi phục');
      resetButton.classList.add('is-warning');
      return;
    }
    clearTimeout(resetConfirmationTimer);
    restoreResetLabel();
    resetFurnitureToDefault();
  });
}

export function initFurnitureEditor() {
  bindPanelControls();
  bindKeyboardShortcuts();
  setPlanPointerInterceptor(planPointerInterceptor);
  onEvent('viewer:canvas-ready', ({ canvas }) => bindCanvasEditing(canvas));
  onEvent('furniture:changed', () => {
    if (appState.selectedFurnitureId && !getFurnitureById(appState.selectedFurnitureId)) selectFurniture(null);
    if (interactionState.editingFurniture) renderFurnitureList();
    updateSelectionOutline3d();
  });
  onEvent('furniture:moved', updateSelectionOutline3d);
  onEvent('materials:swapped', updateSelectionOutline3d);
  onEvent('tour:starting', updateSelectionOutline3d);
  onEvent('tour:ended', updateSelectionOutline3d);
  onEvent('walk:starting', () => { if (interactionState.editingFurniture) setFurnitureEditorMode(false); });
}
