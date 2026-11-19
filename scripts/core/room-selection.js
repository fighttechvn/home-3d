/** Chọn phòng: cập nhật trạng thái rồi báo cho bảng phòng, bản vẽ, nhãn 3D, camera và nhân vật. */
import { appState } from './app-state.js';
import { emitEvent } from './events.js';

export function selectRoom(roomId, source) {
  appState.selectedRoomId = roomId;
  emitEvent('room:selected', { roomId, source });
}
