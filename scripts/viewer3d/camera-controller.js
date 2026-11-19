/**
 * Camera 3D: các góc nhìn định sẵn, bay mượt giữa hai góc, góc nhìn trong phòng (kéo để nhìn quanh,
 * cuộn để tiến lùi) và xoay quanh tự do bằng OrbitControls.
 */
import { getElement, getElements, prefersReducedMotion, easeInOutCubic } from '../core/dom.js';
import { clamp } from '../core/geometry.js';
import { appState, interactionState } from '../core/app-state.js';
import { emitEvent, onEvent } from '../core/events.js';
import { findRoomById } from '../data/house-plan.js';
import { CAMERA_VIEWS, EYE_LEVEL_TARGET_DISTANCE } from '../data/camera-views.js';
import { viewer, SCENE_CENTER, MODEL_HINTS, setModelHint } from './viewer-context.js';
import { setRoofVisible, setCutWalls } from './display-settings.js';
import { addFrameCallback } from './viewer.js';

const FLIGHT_DURATION_MILLISECONDS = 1100;
let activeFlight = null;

/** Vị trí, điểm nhìn và ống kính cho một góc nhìn (tính theo tỉ lệ khung hình hiện tại). */
export function getViewPose(viewName) {
  const view = CAMERA_VIEWS[viewName], aspectRatio = viewer.camera.aspect || 1;
  if (view.fit === 'overview') {
    const fieldOfView = 40, halfFieldTangent = Math.tan((fieldOfView * Math.PI) / 360), sceneRadius = 11.2;
    const direction = (aspectRatio < 1 ? new THREE.Vector3(0.34, 0.8, 0.5) : new THREE.Vector3(0.78, 0.62, 0.16)).normalize();
    const distance = (sceneRadius / Math.min(halfFieldTangent, halfFieldTangent * aspectRatio)) * (aspectRatio < 1 ? 0.8 : 0.96);
    return { position: SCENE_CENTER.clone().addScaledVector(direction, distance), target: SCENE_CENTER.clone().add(new THREE.Vector3(0.6, 0, 0)), fieldOfView, eyeLevel: false, showRoof: false };
  }
  if (view.fit === 'topDown') {
    const fieldOfView = 40, halfFieldTangent = Math.tan((fieldOfView * Math.PI) / 360);
    const height = Math.max(22 / (2 * halfFieldTangent), 10 / (2 * halfFieldTangent * aspectRatio));
    return {
      position: new THREE.Vector3(SCENE_CENTER.x + 0.4, height, SCENE_CENTER.z + 0.02),
      target: new THREE.Vector3(SCENE_CENTER.x + 0.4, 0, SCENE_CENTER.z), fieldOfView, eyeLevel: false, showRoof: false,
    };
  }
  const position = new THREE.Vector3(...view.position), lookAt = new THREE.Vector3(...view.target);
  if (view.eyeLevel) {
    const lookDirection = lookAt.clone().sub(position).normalize();
    return { position, target: position.clone().addScaledVector(lookDirection, EYE_LEVEL_TARGET_DISTANCE), fieldOfView: view.fieldOfView, eyeLevel: true, showRoof: true };
  }
  return { position, target: lookAt, fieldOfView: view.fieldOfView || 45, eyeLevel: false, showRoof: !!view.showRoof };
}

export function clearViewButtons() {
  getElements('#model-toolbar [data-camera-view]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}

/** Góc nhìn trong phòng: kéo để nhìn quanh (xoay quanh điểm rất gần), không cho zoom/pan. */
export function setEyeLevelMode(enabled) {
  const { controls } = viewer;
  interactionState.eyeLevelView = enabled;
  controls.enablePan = !enabled;
  controls.enableZoom = !enabled;
  controls.rotateSpeed = enabled ? -0.38 : 1;
  controls.minDistance = enabled ? 0.01 : 2;
  controls.maxDistance = enabled ? 2 : 90;
  controls.minPolarAngle = enabled ? 0.55 : 0;
  controls.maxPolarAngle = enabled ? 2.4 : Math.PI * 0.495;
  setModelHint(enabled ? MODEL_HINTS.eyeLevel : MODEL_HINTS.orbit);
}

export function applyCameraView(viewName, { instant = false } = {}) {
  if (interactionState.touring) return;
  emitEvent('camera:view-changing', { viewName }); // nhân vật đang đi dạo sẽ thoát
  const { camera, controls } = viewer, pose = getViewPose(viewName);
  clearViewButtons();
  const viewButton = getElement(`#model-toolbar [data-camera-view="${viewName}"]`);
  if (viewButton) viewButton.setAttribute('aria-pressed', 'true');
  if (pose.eyeLevel) setCutWalls(false);
  else setRoofVisible(pose.showRoof);
  setEyeLevelMode(false);
  controls.enabled = false;
  const finishView = () => {
    controls.enabled = true;
    setEyeLevelMode(pose.eyeLevel);
    if (pose.eyeLevel) setRoofVisible(true); // bật trần sau khi bay vào để camera không xuyên qua mái
    controls.update();
  };
  if (instant || prefersReducedMotion) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.fov = pose.fieldOfView;
    camera.updateProjectionMatrix();
    activeFlight = null;
    interactionState.cameraFlying = false;
    finishView();
    return;
  }
  activeFlight = {
    startTime: performance.now(), startPosition: camera.position.clone(), startTarget: controls.target.clone(), startFieldOfView: camera.fov, pose, finishView,
  };
  interactionState.cameraFlying = true;
}

export function flyToView(viewName) {
  if (viewer.initialized) applyCameraView(viewName);
}

/** Đi tới/lùi và quay khi đang ở góc nhìn trong phòng. */
export function moveEyeLevelCamera(distance, turnAngle) {
  const { camera, controls } = viewer;
  if (turnAngle) {
    const offset = controls.target.clone().sub(camera.position);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
    controls.target.copy(camera.position).add(offset);
  }
  if (distance) {
    const forward = controls.target.clone().sub(camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize().multiplyScalar(distance);
    const nextPosition = camera.position.clone().add(forward);
    nextPosition.x = clamp(nextPosition.x, -3, 15);
    nextPosition.z = clamp(nextPosition.z, -8, 27);
    const movement = nextPosition.sub(camera.position);
    camera.position.add(movement);
    controls.target.add(movement);
  }
}

/** Gọi mỗi khung hình: bay camera hoặc cập nhật OrbitControls (trừ khi nhân vật đang điều khiển camera). */
export function updateCameraFrame(now) {
  if (interactionState.walking) return;
  const { camera, controls } = viewer;
  if (!activeFlight) { controls.update(); return; }
  const progress = Math.min(1, (now - activeFlight.startTime) / FLIGHT_DURATION_MILLISECONDS), eased = easeInOutCubic(progress);
  camera.position.lerpVectors(activeFlight.startPosition, activeFlight.pose.position, eased);
  controls.target.lerpVectors(activeFlight.startTarget, activeFlight.pose.target, eased);
  camera.fov = activeFlight.startFieldOfView + (activeFlight.pose.fieldOfView - activeFlight.startFieldOfView) * eased;
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  if (progress >= 1) {
    const { finishView } = activeFlight;
    activeFlight = null;
    interactionState.cameraFlying = false;
    finishView();
  }
}

export function cancelCameraFlight() {
  activeFlight = null;
  interactionState.cameraFlying = false;
}

export function initCameraController() {
  addFrameCallback((elapsedSeconds, now) => updateCameraFrame(now));
  getElements('#model-toolbar [data-camera-view]').forEach(button => button.addEventListener('click', () => flyToView(button.dataset.cameraView)));
  onEvent('viewer:canvas-ready', ({ canvas }) => {
    canvas.addEventListener('wheel', event => {
      if (!interactionState.eyeLevelView || interactionState.walking) return;
      event.preventDefault();
      moveEyeLevelCamera(-Math.sign(event.deltaY) * 0.35, 0);
    }, { passive: false });
  });
  onEvent('viewer:ready', () => {
    viewer.controls.addEventListener('start', () => { cancelCameraFlight(); clearViewButtons(); });
    applyCameraView('overview', { instant: true });
  });
  // Chọn phòng ở danh sách / nhãn 3D: camera bay tới góc nhìn của phòng (khi không đi dạo).
  onEvent('room:selected', ({ roomId, source }) => {
    if (appState.viewMode !== '3d' || source === 'plan' || source === 'walk' || interactionState.walking) return;
    flyToView(findRoomById(roomId).cameraView);
  });
}
