/** Nhãn tên phòng nổi trên mô hình 3D (chỉ hiện khi nhìn từ trên cao). */
import { getElement, getElements } from '../core/dom.js';
import { polygonCentroid } from '../core/geometry.js';
import { interactionState } from '../core/app-state.js';
import { onEvent } from '../core/events.js';
import { selectRoom } from '../core/room-selection.js';
import { ROOMS } from '../data/house-plan.js';
import { viewer, displaySettings } from './viewer-context.js';

const MINIMUM_CAMERA_HEIGHT_FOR_LABELS = 4.5;
const LABEL_HEIGHT = 0.9;
const roomLabels = []; // { button, anchor: THREE.Vector3 }
const projectedPoint = window.THREE ? new THREE.Vector3() : null;

export function createRoomLabels() {
  const container = getElement('#room-labels');
  ROOMS.filter(room => room.showLabelIn3d).forEach(room => {
    const button = document.createElement('button');
    button.className = 'room-label-3d';
    button.dataset.roomId = room.id;
    button.textContent = room.name;
    button.addEventListener('click', () => selectRoom(room.id, 'label'));
    container.appendChild(button);
    const [x, z] = room.labelAnchor3d || polygonCentroid(room.outline);
    roomLabels.push({ button, anchor: new THREE.Vector3(x, LABEL_HEIGHT, z) });
  });
}

export function hideRoomLabels() {
  roomLabels.forEach(label => { label.button.hidden = true; });
}

/** Gọi sau mỗi lần vẽ: chiếu toạ độ 3D của nhãn ra màn hình. */
export function updateRoomLabels() {
  const { camera, renderer } = viewer;
  const shouldShow = displaySettings.roomLabelsVisible && !interactionState.eyeLevelView && !interactionState.cameraFlying
    && !interactionState.walking && camera.position.y > MINIMUM_CAMERA_HEIGHT_FOR_LABELS;
  if (!shouldShow) { hideRoomLabels(); return; }
  const canvasRect = renderer.domElement.getBoundingClientRect();
  for (const { button, anchor } of roomLabels) {
    projectedPoint.copy(anchor).project(camera);
    const isOnScreen = projectedPoint.z < 1 && Math.abs(projectedPoint.x) < 1.1 && Math.abs(projectedPoint.y) < 1.1;
    button.hidden = !isOnScreen;
    if (isOnScreen) {
      const screenX = ((projectedPoint.x + 1) / 2) * canvasRect.width, screenY = ((1 - projectedPoint.y) / 2) * canvasRect.height;
      button.style.transform = `translate(${screenX.toFixed(1)}px,${screenY.toFixed(1)}px) translate(-50%,-50%)`;
    }
  }
}

export function initRoomLabels() {
  onEvent('room:selected', ({ roomId }) => {
    getElements('.room-label-3d').forEach(button => button.classList.toggle('is-active', button.dataset.roomId === roomId));
  });
}
