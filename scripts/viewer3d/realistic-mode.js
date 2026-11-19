/** Bật/tắt "Vật liệu thật": dựng vật liệu PBR lần đầu, đổi bộ vật liệu trên toàn cảnh, nhớ lựa chọn. */
import { getElement, setPressed, isTouchDevice, readStoredValue, writeStoredValue, t } from '../core/dom.js';
import { emitEvent, onEvent } from '../core/events.js';
import { viewer, displaySettings } from './viewer-context.js';
import { materials, basicMaterials, realisticMaterials, realisticAssets } from './materials.js';
import { buildRealisticMaterials } from './materials-realistic.js';
import { buildLandscape } from './site-builder.js';
import { syncFurnitureModels } from './furniture-scene.js';
import { applyLighting } from './lighting.js';

const PREFERENCE_STORAGE_KEY = 'nhavuon-real-v1';
let isBuildingMaterials = false;

function setShadowMapSize(size) {
  const { sunLight } = viewer;
  if (sunLight.shadow.mapSize.x === size) return;
  sunLight.shadow.mapSize.set(size, size);
  if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
}

/** Trỏ mọi mesh sang bộ vật liệu mới (cả mesh dùng mảng vật liệu như tường). */
function swapMaterialSet(useRealistic) {
  const sourceSet = useRealistic ? basicMaterials : realisticMaterials, targetSet = useRealistic ? realisticMaterials : basicMaterials;
  const replacementFor = new Map();
  for (const key of Object.keys(sourceSet)) {
    const source = sourceSet[key], target = targetSet[key];
    if (Array.isArray(source)) source.forEach((material, index) => target && target[index] && replacementFor.set(material, target[index]));
    else if (source && target && source !== target) replacementFor.set(source, target);
  }
  Object.assign(materials, targetSet);
  viewer.scene.traverse(object => {
    if (!object.isMesh) return;
    if (Array.isArray(object.material)) object.material = object.material.map(material => replacementFor.get(material) || material);
    else if (replacementFor.has(object.material)) object.material = replacementFor.get(object.material);
  });
}

function applyRealisticMode(enabled) {
  displaySettings.realisticMaterials = enabled;
  setPressed(getElement('#realistic-toggle'), enabled);
  const tourCheckbox = getElement('#video-tour-realistic');
  if (tourCheckbox) tourCheckbox.checked = enabled;
  swapMaterialSet(enabled);
  setShadowMapSize(enabled ? (isTouchDevice ? 2048 : 4096) : 2048);
  buildLandscape();          // cây đổi dáng theo chế độ
  syncFurnitureModels(null); // cây cảnh trong nhà cũng vậy
  applyLighting();
  writeStoredValue(PREFERENCE_STORAGE_KEY, enabled ? '1' : '0');
  emitEvent('materials:swapped', { realistic: enabled });
}

export async function setRealisticMode(enabled) {
  if (!viewer.initialized || isBuildingMaterials) return;
  if (enabled && !realisticAssets.built) {
    isBuildingMaterials = true;
    const toast = getElement('#viewer-toast'), toggle = getElement('#realistic-toggle');
    toast.hidden = false;
    toggle.setAttribute('aria-busy', 'true');
    try {
      await buildRealisticMaterials(progress => { toast.textContent = t('Đang tạo vật liệu thật… {percent}%', { percent: Math.round(progress * 100) }); });
    } catch {
      toast.textContent = t('Không tạo được vật liệu thật trên thiết bị này.');
      setTimeout(() => { toast.hidden = true; }, 2500);
      return;
    } finally {
      isBuildingMaterials = false;
      toggle.removeAttribute('aria-busy');
    }
    toast.hidden = true;
  }
  applyRealisticMode(enabled);
}

export function initRealisticMode() {
  getElement('#realistic-toggle').addEventListener('click', () => setRealisticMode(!displaySettings.realisticMaterials));
  onEvent('viewer:ready', () => {
    if (readStoredValue(PREFERENCE_STORAGE_KEY) === '1') setTimeout(() => setRealisticMode(true), 300);
  });
}
