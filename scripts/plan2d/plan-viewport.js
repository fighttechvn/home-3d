/** Khung xem bản vẽ 2D: vừa khung, phóng to, kéo, chụm 2 ngón, thước tỉ lệ, chạm chọn phòng. */
import { getElement, isPressed, setPressed, prefersReducedMotion, easeInOutCubic } from '../core/dom.js';
import { polygonBounds } from '../core/geometry.js';
import { appState } from '../core/app-state.js';
import { onEvent } from '../core/events.js';
import { selectRoom } from '../core/room-selection.js';
import { findRoomById } from '../data/house-plan.js';
import { toSvgUnits } from './svg-shapes.js';
import { PLAN_CONTENT_BOUNDS, getPlanSvg, setPlanFurnitureVisible, setPlanDimensionsVisible } from './plan-renderer.js';

const TOOLBAR_SPACE_PIXELS = 50;
const SCALE_BAR_STEPS_CM = [10, 20, 50, 100, 200, 500, 1000];
const MIN_VIEW_WIDTH_CM = 150, MAX_VIEW_WIDTH_CM = 6000;
const TAP_MOVEMENT_THRESHOLD = 6;

let planViewport = null;
let viewBox = null;              // { x, y, width, height } theo cm
let viewBoxAnimationFrame = 0;
const activePointers = new Map();
let pointerTravel = 0;
let pinchDistance = null;
/** Tính năng khác (sắp xếp đồ) có thể nhận thao tác chuột trước khi bản vẽ xử lý kéo/chạm. */
let pointerInterceptor = null;

export const setPlanPointerInterceptor = interceptor => { pointerInterceptor = interceptor; };

const viewportRect = () => planViewport.getBoundingClientRect();

/** Đổi toạ độ màn hình sang toạ độ bản vẽ (cm). */
export function clientToPlanPoint(event) {
  const rect = viewportRect();
  return { x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width, y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height };
}
export function getPlanViewCenterInMeters() {
  return viewBox ? [(viewBox.x + viewBox.width / 2) / 100, (viewBox.y + viewBox.height / 2) / 100] : null;
}

/** Khung nhìn chứa vừa `bounds` (cm), chừa chỗ cho thanh công cụ và chú thích. */
export function computeFittedViewBox(bounds) {
  const rect = viewportRect(), viewportWidth = rect.width || 400, viewportHeight = rect.height || 600;
  const targetBounds = bounds || PLAN_CONTENT_BOUNDS, padding = bounds ? 1.25 : 1.0;
  let width = targetBounds.width * padding, height = targetBounds.height * padding;
  const bottomSpacePixels = viewportWidth > 820 ? 40 : 14;
  const usableHeight = Math.max(120, viewportHeight - TOOLBAR_SPACE_PIXELS - bottomSpacePixels);
  if (width / height > viewportWidth / usableHeight) height = (width * usableHeight) / viewportWidth;
  else width = (height * viewportWidth) / usableHeight;
  const centimetersPerPixel = height / usableHeight;
  return {
    x: targetBounds.x + targetBounds.width / 2 - width / 2,
    y: targetBounds.y + targetBounds.height / 2 - height / 2 - TOOLBAR_SPACE_PIXELS * centimetersPerPixel,
    width, height: viewportHeight * centimetersPerPixel,
  };
}

export function applyPlanViewBox() {
  getPlanSvg().setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  const pixelsPerCentimeter = viewportRect().width / viewBox.width;
  const scaleCentimeters = SCALE_BAR_STEPS_CM.find(step => step * pixelsPerCentimeter >= 46) || 1000;
  getElement('#scale-bar-line').style.width = `${Math.round(scaleCentimeters * pixelsPerCentimeter)}px`;
  getElement('#scale-label').textContent = scaleCentimeters >= 100 ? `${scaleCentimeters / 100} m` : `${scaleCentimeters} cm`;
}

export function animatePlanViewBox(targetViewBox, durationMilliseconds = 420) {
  if (prefersReducedMotion || !viewBox) { viewBox = targetViewBox; applyPlanViewBox(); return; }
  const startViewBox = { ...viewBox }, startTime = performance.now();
  cancelAnimationFrame(viewBoxAnimationFrame);
  const step = now => {
    const progress = Math.min(1, (now - startTime) / durationMilliseconds), eased = easeInOutCubic(progress);
    viewBox = {
      x: startViewBox.x + (targetViewBox.x - startViewBox.x) * eased,
      y: startViewBox.y + (targetViewBox.y - startViewBox.y) * eased,
      width: startViewBox.width + (targetViewBox.width - startViewBox.width) * eased,
      height: startViewBox.height + (targetViewBox.height - startViewBox.height) * eased,
    };
    applyPlanViewBox();
    if (progress < 1) viewBoxAnimationFrame = requestAnimationFrame(step);
  };
  viewBoxAnimationFrame = requestAnimationFrame(step);
}

export function zoomPlanAt(clientX, clientY, zoomFactor) {
  const rect = viewportRect();
  const anchorX = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width;
  const anchorY = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height;
  const newWidth = Math.min(Math.max(viewBox.width * zoomFactor, MIN_VIEW_WIDTH_CM), MAX_VIEW_WIDTH_CM), ratio = newWidth / viewBox.width;
  viewBox = { x: anchorX - (anchorX - viewBox.x) * ratio, y: anchorY - (anchorY - viewBox.y) * ratio, width: viewBox.width * ratio, height: viewBox.height * ratio };
  applyPlanViewBox();
}

function zoomAtViewportCenter(zoomFactor) {
  const rect = viewportRect();
  zoomPlanAt(rect.left + rect.width / 2, rect.top + rect.height / 2, zoomFactor);
}

export function zoomToRoom(room) {
  const { minX, minY, maxX, maxY } = polygonBounds(room.outline), padding = 0.6;
  animatePlanViewBox(computeFittedViewBox({
    x: toSvgUnits(minX - padding), y: toSvgUnits(minY - padding),
    width: toSvgUnits(maxX - minX + padding * 2), height: toSvgUnits(maxY - minY + padding * 2),
  }));
}

/** Lần đầu hiện bản vẽ thì vừa khung; những lần sau giữ nguyên vị trí. */
export function ensurePlanViewBox() {
  if (!viewBox) viewBox = computeFittedViewBox();
  applyPlanViewBox();
}

/** Khi khung xem đổi kích thước: giữ tâm, chỉnh chiều cao theo tỉ lệ mới. */
export function adjustPlanViewBoxToResize() {
  if (!viewBox) return;
  const rect = viewportRect(), centerX = viewBox.x + viewBox.width / 2, centerY = viewBox.y + viewBox.height / 2;
  viewBox.height = (viewBox.width * rect.height) / rect.width;
  viewBox.x = centerX - viewBox.width / 2;
  viewBox.y = centerY - viewBox.height / 2;
  applyPlanViewBox();
}

/* ---------- kéo, chụm, chạm ---------- */
function handlePointerDown(event) {
  if (event.target.closest('.toolbar') || event.target.closest('.selection-bar')) return;
  if (activePointers.size === 0 && pointerInterceptor && pointerInterceptor.onPointerDown(event)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  pointerTravel = 0;
  if (activePointers.size === 2) {
    const [first, second] = [...activePointers.values()];
    pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
  }
  planViewport.classList.add('is-dragging');
  cancelAnimationFrame(viewBoxAnimationFrame);
}

function handlePointerMove(event) {
  if (pointerInterceptor && pointerInterceptor.onPointerMove(event)) return;
  if (!activePointers.has(event.pointerId)) return;
  const previous = activePointers.get(event.pointerId), current = { x: event.clientX, y: event.clientY };
  activePointers.set(event.pointerId, current);
  const rect = viewportRect();
  if (activePointers.size === 1) {
    viewBox.x -= ((current.x - previous.x) / rect.width) * viewBox.width;
    viewBox.y -= ((current.y - previous.y) / rect.height) * viewBox.height;
    applyPlanViewBox();
    pointerTravel += Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);
  } else if (activePointers.size === 2 && pinchDistance) {
    const [first, second] = [...activePointers.values()], distance = Math.hypot(first.x - second.x, first.y - second.y);
    zoomPlanAt((first.x + second.x) / 2, (first.y + second.y) / 2, pinchDistance / distance);
    pinchDistance = distance;
    pointerTravel += 10;
  }
}

function handlePointerEnd(event) {
  if (pointerInterceptor && pointerInterceptor.onPointerUp(event)) return;
  if (!activePointers.has(event.pointerId)) return;
  activePointers.delete(event.pointerId);
  if (activePointers.size < 2) pinchDistance = null;
  if (activePointers.size > 0) return;
  planViewport.classList.remove('is-dragging');
  if (pointerTravel < TAP_MOVEMENT_THRESHOLD && event.type === 'pointerup') {
    if (pointerInterceptor) pointerInterceptor.onBackgroundTap(event);
    const tappedElement = document.elementFromPoint(event.clientX, event.clientY);
    const roomId = tappedElement && tappedElement.dataset && tappedElement.dataset.roomId;
    if (roomId) selectRoom(roomId, 'plan');
  }
}

function bindToolbar() {
  getElement('#zoom-in-button').addEventListener('click', () => zoomAtViewportCenter(0.7));
  getElement('#zoom-out-button').addEventListener('click', () => zoomAtViewportCenter(1 / 0.7));
  getElement('#zoom-fit-button').addEventListener('click', () => animatePlanViewBox(computeFittedViewBox()));
  getElement('#plan-furniture-toggle').addEventListener('click', event => {
    setPlanFurnitureVisible(setPressed(event.currentTarget, !isPressed(event.currentTarget)));
  });
  getElement('#plan-dimensions-toggle').addEventListener('click', event => {
    setPlanDimensionsVisible(setPressed(event.currentTarget, !isPressed(event.currentTarget)));
  });
}

export function initPlanViewport() {
  planViewport = getElement('#plan-viewport');
  planViewport.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerEnd);
  window.addEventListener('pointercancel', handlePointerEnd);
  planViewport.addEventListener('wheel', event => {
    event.preventDefault();
    zoomPlanAt(event.clientX, event.clientY, Math.exp(event.deltaY * 0.0015));
  }, { passive: false });
  bindToolbar();
  // Chọn phòng từ danh sách khi đang ở bản vẽ: phóng tới phòng đó.
  onEvent('room:selected', ({ roomId, source }) => {
    if (appState.viewMode === '2d' && source === 'list') zoomToRoom(findRoomById(roomId));
  });
}
