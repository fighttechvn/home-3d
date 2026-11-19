/** Các nút hiển thị của mô hình 3D: mái, cắt tường, nội thất, nhãn phòng. */
import { getElement, setPressed } from '../core/dom.js';
import { viewer, displaySettings } from './viewer-context.js';
import { buildWalls } from './house-builder.js';
import { updateWallMountedVisibility } from './furniture-scene.js';
import { applyLighting } from './lighting.js';

export function setRoofVisible(visible) {
  displaySettings.roofVisible = visible;
  if (viewer.groups.roof) viewer.groups.roof.visible = visible;
  setPressed(getElement('#roof-toggle'), visible);
  applyLighting();
}

export function setCutWalls(enabled) {
  if (displaySettings.cutWalls === enabled) return;
  displaySettings.cutWalls = enabled;
  setPressed(getElement('#cut-walls-toggle'), enabled);
  buildWalls();
  updateWallMountedVisibility();
}

export function setFurnitureVisible(visible) {
  displaySettings.furnitureVisible = visible;
  setPressed(getElement('#furniture-toggle'), visible);
  if (viewer.groups.furniture) viewer.groups.furniture.visible = visible;
}

export function setRoomLabelsVisible(visible) {
  displaySettings.roomLabelsVisible = visible;
  setPressed(getElement('#labels-toggle'), visible);
}

export function bindDisplayToggles() {
  getElement('#roof-toggle').addEventListener('click', () => {
    if (!viewer.initialized) return;
    const showRoof = !displaySettings.roofVisible;
    if (showRoof) setCutWalls(false); // mái và tường cắt thấp không đi cùng nhau
    setRoofVisible(showRoof);
  });
  getElement('#cut-walls-toggle').addEventListener('click', () => {
    if (!viewer.initialized) return;
    const cut = !displaySettings.cutWalls;
    if (cut) setRoofVisible(false);
    setCutWalls(cut);
  });
  getElement('#furniture-toggle').addEventListener('click', () => setFurnitureVisible(!displaySettings.furnitureVisible));
  getElement('#labels-toggle').addEventListener('click', () => setRoomLabelsVisible(!displaySettings.roomLabelsVisible));
}
