/** Bảng bên: danh sách phòng và thẻ thông tin phòng đang chọn. */
import { getElement, getElements, formatDecimal, t } from '../core/dom.js';
import { appState } from '../core/app-state.js';
import { onEvent } from '../core/events.js';
import { selectRoom } from '../core/room-selection.js';
import { ROOMS, FLOOR_FINISH_NAMES, findRoomById } from '../data/house-plan.js';
import { zoomToRoom } from '../plan2d/plan-viewport.js';
import { flyToView } from '../viewer3d/camera-controller.js';
import { setViewMode } from './view-mode.js';

function renderRoomList() {
  getElement('#room-list').innerHTML = ROOMS.map(room =>
    `<li><button class="room-button" data-room-id="${room.id}"><span class="floor-swatch ${room.floor}"></span>`
    + `<span class="room-button-name">${room.name}</span><span class="room-button-area">${formatDecimal(room.area)} m²</span></button></li>`).join('');
}

function renderRoomCard() {
  const card = getElement('#room-card'), room = findRoomById(appState.selectedRoomId);
  if (!room) { card.hidden = true; return; }
  card.hidden = false;
  card.innerHTML = `<h2>${room.name}</h2>
    <div class="room-facts"><span class="room-fact">${formatDecimal(room.area)} m²</span><span class="room-fact">${room.dimensionsText}</span><span class="room-fact is-text">${FLOOR_FINISH_NAMES[room.floor]}</span></div>
    <p>${room.description}</p>
    <button class="room-card-action" id="room-card-action">${t(appState.viewMode === '2d' ? 'Xem phòng này trong 3D' : 'Xem trên bản vẽ 2D')}</button>`;
  getElement('#room-card-action').addEventListener('click', () => {
    if (appState.viewMode === '2d') { setViewMode('3d'); flyToView(room.cameraView); }
    else { setViewMode('2d'); zoomToRoom(room); }
  });
}

function highlightRoomButton(roomId, source) {
  getElements('.room-button').forEach(button => button.setAttribute('aria-current', button.dataset.roomId === roomId ? 'true' : 'false'));
  const button = getElement(`.room-button[data-room-id="${roomId}"]`);
  if (button && source !== 'list') button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function initRoomPanel() {
  renderRoomList();
  getElement('#room-list').addEventListener('click', event => {
    const button = event.target.closest('.room-button');
    if (button) selectRoom(button.dataset.roomId, 'list');
  });
  onEvent('room:selected', ({ roomId, source }) => { highlightRoomButton(roomId, source); renderRoomCard(); });
  onEvent('mode:changed', renderRoomCard);
}
