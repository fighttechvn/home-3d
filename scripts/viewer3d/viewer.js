/** Khởi tạo cảnh 3D, đổi kích thước và vòng lặp vẽ. */
import { getElement, hasCoarsePointer, t } from '../core/dom.js';
import { emitEvent } from '../core/events.js';
import { viewer } from './viewer-context.js';
import { createBasicMaterials } from './materials.js';
import { buildHouseBase, buildWalls, buildRoof } from './house-builder.js';
import { addSiteGround, buildLandscape } from './site-builder.js';
import { createFurnitureGroup, syncFurnitureModels } from './furniture-scene.js';
import { createSceneLights, createBasicSky, buildNightLights } from './lighting.js';
import { enableShadows } from './primitives.js';
import { createRoomLabels, updateRoomLabels } from './room-labels.js';

const frameCallbacks = [];       // gọi trước khi vẽ: (giây trôi qua, thời điểm)
const afterRenderCallbacks = []; // gọi sau khi vẽ
let animationFrameId = 0;
let lastFrameTime = 0;
let renderOverride = null;       // vẽ thay renderer.render (ví dụ chia đôi màn hình cho kính Cardboard)

export const addFrameCallback = callback => frameCallbacks.push(callback);
/** fn(renderer, scene, camera) thay cho bước vẽ thường; null để trả lại như cũ. */
export const setRenderOverride = fn => { renderOverride = fn; };
export const addAfterRenderCallback = callback => afterRenderCallbacks.push(callback);

function showViewerError() {
  const message = document.createElement('div');
  message.className = 'viewer-error';
  message.textContent = t('Không mở được chế độ 3D trên thiết bị này (cần WebGL). Bản vẽ 2D vẫn dùng được.');
  getElement('#model-viewport').appendChild(message);
}

function createRenderer() {
  if (!window.THREE || !THREE.OrbitControls) throw new Error(t('Không tải được thư viện Three.js'));
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hasCoarsePointer ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('tabindex', '0');
  renderer.domElement.setAttribute('aria-label', t('Mô hình 3D, kéo để xoay'));
  return renderer;
}

function buildScene() {
  viewer.scene = new THREE.Scene();
  viewer.scene.background = createBasicSky();
  viewer.scene.fog = new THREE.Fog(0xdfe8eb, 55, 130);
  viewer.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
  createSceneLights();
  createBasicMaterials();

  const base = buildHouseBase();
  addSiteGround(base);
  enableShadows(base);
  base.traverse(object => { if (object.isMesh) object.castShadow = false; }); // nền chỉ nhận bóng
  viewer.scene.add(base);
  viewer.groups.base = base;

  buildLandscape();
  buildRoof();
  buildWalls();
  createFurnitureGroup();
  syncFurnitureModels(null);
  buildNightLights();
}

function createControls() {
  const controls = new THREE.OrbitControls(viewer.camera, viewer.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.maxDistance = 90;
  controls.minDistance = 2;
  viewer.controls = controls;
}

/** Trả về true nếu dựng được cảnh 3D. */
export function initViewer() {
  viewer.initializationAttempted = true;
  try {
    viewer.renderer = createRenderer();
  } catch {
    showViewerError();
    return false;
  }
  const host = getElement('#model-viewport');
  host.insertBefore(viewer.renderer.domElement, host.firstChild);
  // Báo trước khi tạo OrbitControls để chế độ sắp xếp đồ bắt được thao tác kéo đồ trước.
  emitEvent('viewer:canvas-ready', { canvas: viewer.renderer.domElement });
  buildScene();
  createControls();
  createRoomLabels();
  viewer.initialized = true;
  resizeViewer();
  emitEvent('viewer:ready');
  return true;
}

export function resizeViewer() {
  if (!viewer.initialized) return;
  const rect = getElement('#model-viewport').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  viewer.renderer.setSize(rect.width, rect.height, false);
  viewer.camera.aspect = rect.width / rect.height;
  viewer.camera.updateProjectionMatrix();
}

function renderFrame(now) {
  animationFrameId = requestAnimationFrame(renderFrame);
  const elapsedSeconds = Math.min(0.05, (now - (lastFrameTime || now)) / 1000);
  lastFrameTime = now;
  frameCallbacks.forEach(callback => callback(elapsedSeconds, now));
  if (renderOverride) renderOverride(viewer.renderer, viewer.scene, viewer.camera);
  else viewer.renderer.render(viewer.scene, viewer.camera);
  updateRoomLabels();
  afterRenderCallbacks.forEach(callback => callback(elapsedSeconds, now));
}

export function startRenderLoop() {
  // Đang xem bằng kính VR (WebXR): phiên XR tự vẽ, không chạy song song vòng lặp thường.
  if (animationFrameId || !viewer.initialized || viewer.renderer.xr.isPresenting) return;
  lastFrameTime = 0;
  animationFrameId = requestAnimationFrame(renderFrame);
}

export function stopRenderLoop() {
  if (!animationFrameId) return;
  cancelAnimationFrame(animationFrameId);
  animationFrameId = 0;
}

/** Lớp phủ (bản đồ nhỏ, vị trí) nằm dưới thanh công cụ; thanh có thể xuống dòng nên đo chiều cao thật. */
export function observeModelToolbarHeight() {
  const toolbar = getElement('#model-toolbar'), viewport = getElement('#model-viewport');
  new ResizeObserver(() => viewport.style.setProperty('--toolbar-height', `${toolbar.offsetHeight}px`)).observe(toolbar);
}
