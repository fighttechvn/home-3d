/**
 * Nhìn quanh bằng con quay (iPhone, iPad, điện thoại Android) trong chế độ Đi dạo ở mắt nhân vật,
 * và chế độ kính Cardboard: chia đôi màn hình thành hai mắt, chạm màn hình để đi tới.
 *
 * Safari trên iOS chỉ cho đọc con quay sau khi người dùng bấm "Cho phép" (DeviceOrientationEvent.requestPermission)
 * và chỉ trên HTTPS. Joystick và kéo màn hình vẫn dùng được: chúng xoay thêm phần lệch hướng.
 */
import { getElement, isTouchDevice, t } from '../../core/dom.js';
import { interactionState } from '../../core/app-state.js';
import { onEvent } from '../../core/events.js';
import { viewer, MODEL_HINTS, setModelHint } from '../../viewer3d/viewer-context.js';
import { addFrameCallback, setRenderOverride } from '../../viewer3d/viewer.js';
import { enterWalkMode, setWalkCameraMode, walkState } from './walk-controller.js';
import { showViewerToast } from '../xr/xr-toast.js';

const gyroState = {
  active: false, stereo: false,
  reading: null,                 // { alpha, beta, gamma } tính bằng radian
  yawOffset: null, appliedHeading: null,
  sensorTimer: 0,
  stereoElements: null,
};

export const isGyroSupported = () => isTouchDevice && typeof window.DeviceOrientationEvent !== 'undefined';
export const isGyroActive = () => gyroState.active;
export const isStereoActive = () => gyroState.stereo;

/* ---------- đọc cảm biến ---------- */
function handleOrientation(event) {
  if (event.alpha === null && event.beta === null) return;
  const toRadians = Math.PI / 180;
  gyroState.reading = { alpha: (event.alpha || 0) * toRadians, beta: (event.beta || 0) * toRadians, gamma: (event.gamma || 0) * toRadians };
}

function screenAngle() {
  const angle = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
  return angle * Math.PI / 180;
}

/** Phải được gọi ngay trong sự kiện bấm: trên iOS đây là lúc hiện hộp thoại xin quyền. */
async function requestOrientationPermission() {
  const OrientationEvent = window.DeviceOrientationEvent;
  if (OrientationEvent && typeof OrientationEvent.requestPermission === 'function') {
    try { return (await OrientationEvent.requestPermission()) === 'granted'; } catch { return false; }
  }
  return true;
}

/* ---------- hướng camera ---------- */
const temp = window.THREE ? {
  euler: new THREE.Euler(), device: new THREE.Quaternion(), screen: new THREE.Quaternion(), yaw: new THREE.Quaternion(),
  // camera nhìn ra mặt sau của máy, không phải từ đỉnh máy
  back: new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)),
  zAxis: new THREE.Vector3(0, 0, 1), yAxis: new THREE.Vector3(0, 1, 0), forward: new THREE.Vector3(),
} : null;

function deviceQuaternion({ alpha, beta, gamma }) {
  temp.euler.set(beta, alpha, -gamma, 'YXZ');
  return temp.device.setFromEuler(temp.euler).multiply(temp.back).multiply(temp.screen.setFromAxisAngle(temp.zAxis, -screenAngle()));
}

/** Hướng nhìn trên mặt bằng theo quy ước của walkState: [sin(heading), cos(heading)]; null nếu đang nhìn thẳng lên / xuống. */
function headingOf(quaternion) {
  const forward = temp.forward.set(0, 0, -1).applyQuaternion(quaternion);
  return Math.hypot(forward.x, forward.z) < 0.15 ? null : Math.atan2(forward.x, forward.z);
}

function applyGyroToCamera() {
  if (!gyroState.active) return;
  if (!interactionState.walking || !walkState.firstPerson) { stopGyroLook(); return; }
  if (!gyroState.reading) return;
  const device = deviceQuaternion(gyroState.reading), deviceHeading = headingOf(device);
  if (gyroState.yawOffset === null) {
    if (deviceHeading === null) return;
    gyroState.yawOffset = walkState.heading - deviceHeading; // giữ nguyên hướng đang nhìn khi bật
  } else if (gyroState.appliedHeading !== null) {
    gyroState.yawOffset += walkState.heading - gyroState.appliedHeading; // joystick hoặc kéo màn hình vừa xoay
  }
  viewer.camera.quaternion.copy(temp.yaw.setFromAxisAngle(temp.yAxis, gyroState.yawOffset)).multiply(device);
  const heading = headingOf(viewer.camera.quaternion);
  if (heading !== null) walkState.heading = heading;
  gyroState.appliedHeading = walkState.heading;
}

/* ---------- kính Cardboard ---------- */
const stereoCamera = window.THREE ? new THREE.StereoCamera() : null;
const rendererSize = window.THREE ? new THREE.Vector2() : null;

function renderStereo(renderer, scene, camera) {
  camera.updateMatrixWorld();
  stereoCamera.aspect = 0.5;
  stereoCamera.eyeSep = 0.064;
  stereoCamera.update(camera);
  const { x: width, y: height } = renderer.getSize(rendererSize), half = Math.floor(width / 2);
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, half, height); renderer.setViewport(0, 0, half, height);
  renderer.render(scene, stereoCamera.cameraL);
  renderer.setScissor(half, 0, width - half, height); renderer.setViewport(half, 0, width - half, height);
  renderer.render(scene, stereoCamera.cameraR);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
}

const pressWalkKey = down => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'KeyW', key: 'w' }));

function createStereoElements() {
  const viewport = getElement('#model-viewport');
  const touchLayer = document.createElement('div');
  touchLayer.className = 'xr-stereo-touch';
  touchLayer.setAttribute('aria-hidden', 'true');
  const divider = document.createElement('div');
  divider.className = 'xr-stereo-divider';
  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.className = 'xr-stereo-exit';
  exitButton.textContent = t('Thoát kính');
  exitButton.addEventListener('click', () => stopGyroLook());
  // Nút bấm của kính Cardboard chạm vào màn hình: giữ để đi tới.
  let activePointer = null;
  touchLayer.addEventListener('pointerdown', event => { event.preventDefault(); activePointer = event.pointerId; pressWalkKey(true); });
  const release = event => { if (event.pointerId !== activePointer) return; activePointer = null; pressWalkKey(false); };
  touchLayer.addEventListener('pointerup', release);
  touchLayer.addEventListener('pointercancel', release);
  viewport.append(touchLayer, divider, exitButton);
  return [touchLayer, divider, exitButton];
}

function startStereo() {
  if (gyroState.stereo) return;
  gyroState.stereo = true;
  getElement('#app').classList.add('is-stereo');
  gyroState.stereoElements = createStereoElements();
  setRenderOverride(renderStereo);
  const root = document.documentElement;
  if (root.requestFullscreen && !document.fullscreenElement) {
    root.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
  }
  showViewerToast(t('Xoay ngang máy và đặt vào kính Cardboard · Chạm màn hình để đi tới'), 4000);
}

function stopStereo() {
  if (!gyroState.stereo) return;
  gyroState.stereo = false;
  pressWalkKey(false);
  setRenderOverride(null);
  getElement('#app').classList.remove('is-stereo');
  (gyroState.stereoElements || []).forEach(element => element.remove());
  gyroState.stereoElements = null;
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

/* ---------- bật / tắt ---------- */
/** Gọi trực tiếp trong sự kiện bấm. Trả về true nếu đã bật. */
export async function startGyroLook({ stereo = false } = {}) {
  if (!viewer.initialized) return false;
  const granted = await requestOrientationPermission();
  if (!granted) {
    showViewerToast(t('Cần cho phép truy cập chuyển động và hướng của máy để nhìn quanh bằng con quay.'), 4000);
    return false;
  }
  if (!interactionState.walking) enterWalkMode();
  if (!interactionState.walking) return false;
  if (!walkState.firstPerson) setWalkCameraMode(true);
  if (!gyroState.active) {
    gyroState.active = true;
    gyroState.yawOffset = gyroState.appliedHeading = null;
    window.addEventListener('deviceorientation', handleOrientation);
    clearTimeout(gyroState.sensorTimer);
    gyroState.sensorTimer = setTimeout(() => {
      if (gyroState.active && !gyroState.reading) {
        stopGyroLook();
        showViewerToast(t('Không đọc được con quay trên thiết bị này.'), 3200);
      }
    }, 2000);
  }
  if (stereo) startStereo(); else stopStereo();
  setModelHint(t('Xoay máy để nhìn quanh · Joystick hoặc W A S D để đi · Kéo để xoay thêm'));
  return true;
}

export function stopGyroLook() {
  if (!gyroState.active) return;
  gyroState.active = false;
  clearTimeout(gyroState.sensorTimer);
  window.removeEventListener('deviceorientation', handleOrientation);
  gyroState.reading = null;
  stopStereo();
  walkState.lookPitch = -0.04;
  if (interactionState.walking) setModelHint(walkState.firstPerson ? MODEL_HINTS.walkFirstPerson : MODEL_HINTS.walkThirdPerson);
}

/** Đăng ký sau initWalkMode: bước khung hình này chạy sau bước đi dạo nên ghi đè được hướng camera. */
export function initGyroLook() {
  addFrameCallback(applyGyroToCamera);
  onEvent('tour:starting', stopGyroLook);
  onEvent('mode:changed', ({ mode }) => { if (mode !== '3d') stopGyroLook(); });
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && gyroState.stereo) stopGyroLook(); });
}
