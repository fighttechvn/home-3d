/** Chuyển giữa bản vẽ 2D và mô hình 3D, đồng bộ với địa chỉ (#2d / #3d) và kích thước khung xem. */
import { getElement } from '../core/dom.js';
import { appState, interactionState } from '../core/app-state.js';
import { emitEvent } from '../core/events.js';
import { ensurePlanViewBox, adjustPlanViewBoxToResize } from '../plan2d/plan-viewport.js';
import { viewer } from '../viewer3d/viewer-context.js';
import { initViewer, resizeViewer, startRenderLoop, stopRenderLoop } from '../viewer3d/viewer.js';

const VIEW_MODES = ['2d', '3d'];

export function setViewMode(mode, { updateAddress = true } = {}) {
  appState.viewMode = mode;
  getElement('#plan-viewport').hidden = mode !== '2d';
  getElement('#model-viewport').hidden = mode !== '3d';
  getElement('#tab-plan').setAttribute('aria-selected', mode === '2d');
  getElement('#tab-model').setAttribute('aria-selected', mode === '3d');
  if (mode === '2d') {
    ensurePlanViewBox();
    stopRenderLoop();
  } else {
    if (!viewer.initialized && !viewer.initializationAttempted) initViewer();
    if (viewer.initialized) { resizeViewer(); startRenderLoop(); }
  }
  emitEvent('mode:changed', { mode });
  if (updateAddress && location.hash !== `#${mode}`) {
    try { history.replaceState(null, '', `#${mode}`); } catch { location.hash = mode; }
  }
}

export function initViewMode() {
  getElement('#tab-plan').addEventListener('click', () => setViewMode('2d'));
  getElement('#tab-model').addEventListener('click', () => setViewMode('3d'));
  window.addEventListener('hashchange', () => {
    const requestedMode = location.hash.slice(1);
    if (VIEW_MODES.includes(requestedMode) && requestedMode !== appState.viewMode) setViewMode(requestedMode, { updateAddress: false });
  });
  new ResizeObserver(() => {
    if (appState.viewMode === '2d') adjustPlanViewBoxToResize();
    else resizeViewer();
  }).observe(getElement('#stage'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRenderLoop();
    else if (appState.viewMode === '3d' && viewer.initialized && !interactionState.touring) startRenderLoop();
  });

  const startMode = location.hash === '#2d' ? '2d' : '3d';
  setViewMode(startMode, { updateAddress: false });
  if (startMode === '3d' && !viewer.initialized) setViewMode('2d', { updateAddress: false }); // không có WebGL
}
