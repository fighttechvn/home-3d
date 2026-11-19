/**
 * Chế độ "Đi dạo": điều khiển nhân vật bằng W A S D / phím mũi tên hoặc joystick (điện thoại).
 * Hai góc nhìn: góc thứ 3 (camera theo sau) và mắt nhân vật (nhìn thẳng phía trước).
 */
import { getElement, setPressed, isTouchDevice, t } from '../../core/dom.js';
import { clamp, isPointInPolygon, polygonCentroid } from '../../core/geometry.js';
import { appState, interactionState } from '../../core/app-state.js';
import { emitEvent, onEvent } from '../../core/events.js';
import { selectRoom } from '../../core/room-selection.js';
import { ROOMS, findRoomById, floorHeightAt } from '../../data/house-plan.js';
import { CAMERA_VIEWS } from '../../data/camera-views.js';
import { viewer, MODEL_HINTS, setModelHint } from '../../viewer3d/viewer-context.js';
import { materials } from '../../viewer3d/materials.js';
import { addFrameCallback } from '../../viewer3d/viewer.js';
import { applyCameraView, clearViewButtons, setEyeLevelMode, cancelCameraFlight } from '../../viewer3d/camera-controller.js';
import { setRoofVisible, setCutWalls } from '../../viewer3d/display-settings.js';
import { createCharacterModel, poseCharacterModel } from './character-model.js';
import { buildCollisionObstacles, resolveCollision } from './collision.js';
import { buildMinimap, updateMinimapMarker } from './minimap.js';

const WALK_SPEED = 1.6, RUN_SPEED = 3.4, TURN_SPEED = 1.9;
const EYE_HEIGHT = 1.6, HEAD_HEIGHT_FOR_CAMERA = 1.35;
const FIRST_PERSON_FIELD_OF_VIEW = 72, THIRD_PERSON_FIELD_OF_VIEW = 50;
const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** heading: góc quay quanh trục đứng; hướng đi trên mặt bằng là [sin(heading), cos(heading)]. */
export const walkState = {
  firstPerson: false,
  x: 6.05, z: 24.4, height: -0.32, heading: Math.PI,   // bắt đầu ở lối đi trước nhà, quay mặt vào nhà
  cameraYaw: 0, cameraPitch: 0.58, cameraDistance: 5.2, // camera góc thứ 3 quay quanh nhân vật
  lookPitch: -0.04,                                     // ngước lên / cúi xuống ở góc mắt nhân vật
  stridePhase: 0, speed: 0, strideAmplitude: 0,
  currentRoomId: undefined, snapCameraNextFrame: true,
  characterModel: null,
};
const pressedKeys = {};
const joystickInput = { x: 0, y: 0, magnitude: 0 };
const cameraRay = window.THREE ? new THREE.Raycaster() : null;

function updateCharacterPose() {
  if (!walkState.characterModel) return;
  poseCharacterModel(walkState.characterModel, {
    x: walkState.x, y: walkState.height, z: walkState.z, heading: walkState.heading,
    stridePhase: walkState.stridePhase, strideAmplitude: walkState.strideAmplitude,
    visible: !(interactionState.walking && walkState.firstPerson),
  });
}

function showCurrentLocation(room) {
  getElement('#location-badge').innerHTML = t('Đang ở <b>{room}</b>', { room: room ? room.name : t('Sân vườn') });
}

/* ---------- dịch chuyển ---------- */
export function teleportCharacter(x, z, heading = walkState.heading) {
  [walkState.x, walkState.z] = resolveCollision(x, z);
  walkState.heading = heading;
  walkState.height = floorHeightAt(walkState.x, walkState.z);
  if (!walkState.firstPerson) walkState.cameraYaw = walkState.heading + Math.PI;
  walkState.snapCameraNextFrame = true;
  updateCharacterPose();
  updateMinimapMarker(walkState.x, walkState.z, walkState.heading);
}

function teleportCharacterToRoom(room) {
  const view = CAMERA_VIEWS[room.cameraView];
  let x, z, heading = walkState.heading;
  if (view && view.eyeLevel) {
    [x, , z] = view.position;
    heading = Math.atan2(view.target[0] - x, view.target[2] - z);
  } else {
    [x, z] = polygonCentroid(room.outline);
  }
  walkState.currentRoomId = room.id;
  showCurrentLocation(room);
  teleportCharacter(x, z, heading);
}

/* ---------- mỗi khung hình ---------- */
function readMovementInput() {
  const keyDown = code => (pressedKeys[code] ? 1 : 0);
  let sideways = Math.max(keyDown('KeyD'), keyDown('ArrowRight')) - Math.max(keyDown('KeyA'), keyDown('ArrowLeft')) + joystickInput.x;
  let forward = Math.max(keyDown('KeyW'), keyDown('ArrowUp')) - Math.max(keyDown('KeyS'), keyDown('ArrowDown')) + joystickInput.y;
  const magnitude = Math.hypot(sideways, forward);
  if (magnitude > 1) { sideways /= magnitude; forward /= magnitude; }
  const running = pressedKeys.ShiftLeft || pressedKeys.ShiftRight || joystickInput.magnitude > 0.94;
  return { sideways, forward, magnitude: Math.min(1, magnitude), running };
}

function stepWalk(elapsedSeconds) {
  const input = readMovementInput(), maximumSpeed = input.running ? RUN_SPEED : WALK_SPEED;
  let moveX = 0, moveZ = 0, isMoving = false;
  if (walkState.firstPerson) {
    // Mắt nhân vật: A/D (hoặc joystick ngang) để quay, W/S để đi tới / lùi.
    walkState.heading -= input.sideways * TURN_SPEED * elapsedSeconds;
    if (Math.abs(input.forward) > 0.05) { moveX = Math.sin(walkState.heading) * input.forward; moveZ = Math.cos(walkState.heading) * input.forward; isMoving = true; }
  } else if (input.magnitude > 0.05) {
    // Góc thứ 3: đi theo hướng màn hình, nhân vật xoay dần về hướng đi.
    const yaw = walkState.cameraYaw, forwardX = -Math.sin(yaw), forwardZ = -Math.cos(yaw), rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
    moveX = forwardX * input.forward + rightX * input.sideways;
    moveZ = forwardZ * input.forward + rightZ * input.sideways;
    isMoving = true;
    let turn = Math.atan2(moveX, moveZ) - walkState.heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    walkState.heading += turn * Math.min(1, elapsedSeconds * 12);
  }
  const targetSpeed = isMoving ? maximumSpeed * Math.min(1, Math.hypot(moveX, moveZ)) : 0;
  walkState.speed += (targetSpeed - walkState.speed) * Math.min(1, elapsedSeconds * 10);
  if (isMoving) {
    const directionLength = Math.hypot(moveX, moveZ) || 1;
    const stepX = (moveX / directionLength) * walkState.speed * elapsedSeconds, stepZ = (moveZ / directionLength) * walkState.speed * elapsedSeconds;
    const subSteps = Math.max(1, Math.ceil(Math.hypot(stepX, stepZ) / 0.08)); // bước nhỏ để không xuyên tường mỏng
    for (let subStep = 0; subStep < subSteps; subStep++) [walkState.x, walkState.z] = resolveCollision(walkState.x + stepX / subSteps, walkState.z + stepZ / subSteps);
  }
  walkState.height += (floorHeightAt(walkState.x, walkState.z) - walkState.height) * Math.min(1, elapsedSeconds * 14);
  walkState.stridePhase += elapsedSeconds * walkState.speed * 4.2;
  walkState.strideAmplitude += ((isMoving ? Math.min(1, walkState.speed / WALK_SPEED) * 0.6 : 0) - walkState.strideAmplitude) * Math.min(1, elapsedSeconds * 8);

  const room = ROOMS.find(candidate => isPointInPolygon([walkState.x, walkState.z], candidate.outline)), roomId = room ? room.id : null;
  if (roomId !== walkState.currentRoomId) {
    walkState.currentRoomId = roomId;
    showCurrentLocation(room);
    if (room) selectRoom(room.id, 'walk');
  }
  updateCharacterPose();
  updateWalkCamera(elapsedSeconds);
  updateMinimapMarker(walkState.x, walkState.z, walkState.heading);
}

const cameraLookTarget = window.THREE ? new THREE.Vector3() : null;
const cameraOrbitDirection = window.THREE ? new THREE.Vector3() : null;

function updateWalkCamera(elapsedSeconds) {
  const { camera } = viewer, snap = walkState.snapCameraNextFrame;
  walkState.snapCameraNextFrame = false;
  if (walkState.firstPerson) {
    const headBob = Math.sin(walkState.stridePhase * 2) * 0.035 * walkState.strideAmplitude;
    camera.position.set(walkState.x + Math.sin(walkState.heading) * 0.1, walkState.height + EYE_HEIGHT + headBob, walkState.z + Math.cos(walkState.heading) * 0.1);
    const horizontal = Math.cos(walkState.lookPitch);
    cameraLookTarget.set(camera.position.x + Math.sin(walkState.heading) * horizontal, camera.position.y + Math.sin(walkState.lookPitch), camera.position.z + Math.cos(walkState.heading) * horizontal);
    camera.lookAt(cameraLookTarget);
    return;
  }
  const head = cameraLookTarget.set(walkState.x, walkState.height + HEAD_HEIGHT_FOR_CAMERA, walkState.z), horizontal = Math.cos(walkState.cameraPitch);
  const direction = cameraOrbitDirection.set(Math.sin(walkState.cameraYaw) * horizontal, Math.sin(walkState.cameraPitch), Math.cos(walkState.cameraYaw) * horizontal);
  let distance = walkState.cameraDistance;
  // Kéo camera lại gần nếu có tường chắn giữa camera và nhân vật.
  cameraRay.set(head, direction);
  cameraRay.far = distance;
  const blockingHit = cameraRay.intersectObject(viewer.groups.walls, true).find(hit => hit.object.material !== materials.glass);
  if (blockingHit) distance = Math.max(0.5, blockingHit.distance - 0.25);
  const desiredPosition = head.clone().addScaledVector(direction, distance);
  if (snap) camera.position.copy(desiredPosition);
  else camera.position.lerp(desiredPosition, 1 - Math.exp(-elapsedSeconds * 9));
  camera.lookAt(head);
}

/* ---------- vào / ra chế độ ---------- */
export function setWalkCameraMode(firstPerson) {
  walkState.firstPerson = firstPerson;
  setPressed(getElement('#third-person-button'), !firstPerson);
  setPressed(getElement('#first-person-button'), firstPerson);
  viewer.camera.fov = firstPerson ? FIRST_PERSON_FIELD_OF_VIEW : THIRD_PERSON_FIELD_OF_VIEW;
  viewer.camera.updateProjectionMatrix();
  if (firstPerson) { setCutWalls(false); setRoofVisible(true); walkState.lookPitch = -0.04; }
  else { setRoofVisible(false); walkState.cameraYaw = walkState.heading + Math.PI; }
  walkState.snapCameraNextFrame = true;
  updateCharacterPose();
  setModelHint(firstPerson ? MODEL_HINTS.walkFirstPerson : MODEL_HINTS.walkThirdPerson);
}

export function enterWalkMode({ fromEyeLevel = false } = {}) {
  if (!viewer.initialized || interactionState.touring) return;
  emitEvent('walk:starting');
  cancelCameraFlight();
  if (fromEyeLevel) {
    // Bắt đầu đi từ chính góc nhìn trong phòng đang xem, ở góc mắt nhân vật.
    const lookDirection = viewer.controls.target.clone().sub(viewer.camera.position);
    walkState.x = viewer.camera.position.x;
    walkState.z = viewer.camera.position.z;
    walkState.heading = Math.atan2(lookDirection.x, lookDirection.z);
    walkState.firstPerson = true;
  }
  setEyeLevelMode(false);
  viewer.controls.enabled = false;
  interactionState.walking = true;
  walkState.currentRoomId = undefined;
  teleportCharacter(walkState.x, walkState.z, walkState.heading);
  getElement('#app').classList.add('is-walking');
  setPressed(getElement('#walk-toggle'), true);
  clearViewButtons();
  getElement('#joystick').hidden = !isTouchDevice;
  getElement('#minimap').hidden = false;
  getElement('#location-badge').hidden = false;
  setWalkCameraMode(walkState.firstPerson);
}

export function exitWalkMode() {
  if (!interactionState.walking) return;
  interactionState.walking = false;
  Object.keys(pressedKeys).forEach(code => delete pressedKeys[code]);
  joystickInput.x = joystickInput.y = joystickInput.magnitude = 0;
  getElement('#joystick-knob').style.transform = '';
  getElement('#app').classList.remove('is-walking');
  setPressed(getElement('#walk-toggle'), false);
  getElement('#joystick').hidden = true;
  getElement('#minimap').hidden = true;
  getElement('#location-badge').hidden = true;
  walkState.strideAmplitude = 0;
  walkState.speed = 0;
  updateCharacterPose();
  viewer.controls.target.set(walkState.x, walkState.height + 1.2, walkState.z);
  viewer.controls.enabled = true;
}

/* ---------- điều khiển ---------- */
function bindKeyboard() {
  window.addEventListener('keydown', event => {
    if (appState.viewMode !== '3d' || !viewer.initialized || interactionState.touring) return;
    const isMovementKey = MOVEMENT_KEYS.has(event.code);
    if (interactionState.walking) {
      if (isMovementKey || event.code.startsWith('Shift')) { pressedKeys[event.code] = true; if (isMovementKey) event.preventDefault(); }
      if (event.code === 'KeyV' && !event.repeat) setWalkCameraMode(!walkState.firstPerson);
      if (event.code === 'Escape') { exitWalkMode(); applyCameraView('overview'); }
    } else if (interactionState.eyeLevelView && isMovementKey && !interactionState.cameraFlying && !interactionState.editingFurniture) {
      event.preventDefault();
      enterWalkMode({ fromEyeLevel: true });
      pressedKeys[event.code] = true;
    }
  });
  window.addEventListener('keyup', event => { delete pressedKeys[event.code]; });
  window.addEventListener('blur', () => Object.keys(pressedKeys).forEach(code => delete pressedKeys[code]));
}

function bindJoystick() {
  const joystick = getElement('#joystick'), knob = getElement('#joystick-knob');
  let activePointerId = null;
  const updateFromPointer = event => {
    const rect = joystick.getBoundingClientRect(), travelRadius = rect.width / 2 - 16;
    let offsetX = event.clientX - (rect.left + rect.width / 2), offsetY = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    if (distance > travelRadius) { offsetX *= travelRadius / distance; offsetY *= travelRadius / distance; }
    knob.style.transform = `translate(${offsetX.toFixed(1)}px,${offsetY.toFixed(1)}px)`;
    const magnitude = Math.min(1, distance / travelRadius);
    if (magnitude < 0.12) { joystickInput.x = joystickInput.y = joystickInput.magnitude = 0; return; } // vùng chết ở giữa
    joystickInput.x = offsetX / travelRadius;
    joystickInput.y = -offsetY / travelRadius;
    joystickInput.magnitude = magnitude;
  };
  joystick.addEventListener('pointerdown', event => {
    event.preventDefault();
    activePointerId = event.pointerId;
    joystick.setPointerCapture(activePointerId);
    updateFromPointer(event);
  });
  joystick.addEventListener('pointermove', event => { if (event.pointerId === activePointerId) updateFromPointer(event); });
  const release = event => {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    joystickInput.x = joystickInput.y = joystickInput.magnitude = 0;
    knob.style.transform = '';
  };
  joystick.addEventListener('pointerup', release);
  joystick.addEventListener('pointercancel', release);
}

/** Kéo trên mô hình khi đang đi dạo: xoay camera (góc thứ 3) hoặc nhìn quanh (mắt nhân vật); chụm hoặc cuộn để xa gần. */
function bindCanvasPointer(canvas) {
  const pointers = new Map();
  let pinchDistance = null;
  canvas.addEventListener('pointerdown', event => {
    if (!interactionState.walking) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* con trỏ đã kết thúc */ }
    if (pointers.size === 2) { const [first, second] = [...pointers.values()]; pinchDistance = Math.hypot(first.x - second.x, first.y - second.y); }
  });
  canvas.addEventListener('pointermove', event => {
    if (!interactionState.walking || !pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId), deltaX = event.clientX - previous.x, deltaY = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      if (walkState.firstPerson) { walkState.heading -= deltaX * 0.0055; walkState.lookPitch = clamp(walkState.lookPitch - deltaY * 0.0045, -1.1, 1.1); }
      else { walkState.cameraYaw -= deltaX * 0.0065; walkState.cameraPitch = clamp(walkState.cameraPitch + deltaY * 0.0045, 0.1, 1.42); }
    } else if (pointers.size === 2 && pinchDistance && !walkState.firstPerson) {
      const [first, second] = [...pointers.values()], distance = Math.hypot(first.x - second.x, first.y - second.y);
      walkState.cameraDistance = clamp((walkState.cameraDistance * pinchDistance) / distance, 1.6, 16);
      pinchDistance = distance;
    }
  });
  const release = event => { pointers.delete(event.pointerId); if (pointers.size < 2) pinchDistance = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => {
    if (!interactionState.walking) return;
    event.preventDefault();
    if (!walkState.firstPerson) walkState.cameraDistance = clamp(walkState.cameraDistance * Math.exp(event.deltaY * 0.0012), 1.6, 16);
  }, { passive: false });
}

export function initWalkMode() {
  bindKeyboard();
  bindJoystick();
  getElement('#walk-toggle').addEventListener('click', () => {
    if (!viewer.initialized) return;
    if (interactionState.walking) { exitWalkMode(); applyCameraView('overview'); }
    else enterWalkMode({ fromEyeLevel: interactionState.eyeLevelView });
  });
  getElement('#third-person-button').addEventListener('click', () => { if (interactionState.walking) setWalkCameraMode(false); });
  getElement('#first-person-button').addEventListener('click', () => { if (interactionState.walking) setWalkCameraMode(true); });

  onEvent('viewer:canvas-ready', ({ canvas }) => bindCanvasPointer(canvas));
  onEvent('viewer:ready', () => {
    buildCollisionObstacles();
    walkState.characterModel = createCharacterModel(materials.darkTrim);
    viewer.scene.add(walkState.characterModel.group);
    updateCharacterPose(); // nhân vật đứng sẵn ở lối đi trước nhà, cho cảm giác tỉ lệ
    buildMinimap((x, z) => { walkState.currentRoomId = undefined; teleportCharacter(x, z); });
  });
  addFrameCallback(elapsedSeconds => { if (interactionState.walking) stepWalk(elapsedSeconds); });
  onEvent('camera:view-changing', exitWalkMode);
  onEvent('tour:starting', exitWalkMode);
  onEvent('furniture-editor:starting', () => { if (interactionState.walking) { exitWalkMode(); applyCameraView('overview'); } });
  onEvent('mode:changed', () => Object.keys(pressedKeys).forEach(code => delete pressedKeys[code]));
  onEvent('furniture:changed', () => { if (viewer.initialized) buildCollisionObstacles(); });
  onEvent('room:selected', ({ roomId, source }) => {
    if (!interactionState.walking || appState.viewMode !== '3d' || source === 'walk' || source === 'plan') return;
    teleportCharacterToRoom(findRoomById(roomId));
  });
}
