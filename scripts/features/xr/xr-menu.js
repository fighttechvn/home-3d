/**
 * Nút "AR / VR" trên thanh công cụ 3D và bảng chọn cách xem. Chỉ hiện những cách thiết bị làm được:
 *  - iPhone / iPad (Safari): AR Quick Look với file USDZ tạo ngay trên máy, thu nhỏ 1:30 hoặc thật 1:1.
 *  - Android (Chrome, ARCore): WebXR immersive-ar, chạm để đặt nhà.
 *  - Kính VR hoặc Chrome Android: WebXR immersive-vr.
 *  - Máy có con quay: nhìn quanh khi đi dạo, và chế độ kính Cardboard chia đôi màn hình.
 *  - Máy khác: tải file USDZ.
 * Khi đang mở mô hình 3D của người dùng (model-import.js), các lựa chọn AR / VR áp dụng cho mô hình đó.
 * Thêm ?xr=all vào địa chỉ để hiện mọi lựa chọn (kiểm tra giao diện trên máy tính).
 */
import { getElement, escapeHtml, isTouchDevice, t } from '../../core/dom.js';
import { appState, interactionState } from '../../core/app-state.js';
import { onEvent } from '../../core/events.js';
import { viewer, displaySettings } from '../../viewer3d/viewer-context.js';
import { startRenderLoop, stopRenderLoop } from '../../viewer3d/viewer.js';
import { setCutWalls } from '../../viewer3d/display-settings.js';
import { walkState } from '../walk/walk-controller.js';
import {
  initGyroLook, isGyroSupported, isGyroActive, isStereoActive, startGyroLook, stopGyroLook,
} from '../walk/gyro-look.js';
import { captureHouseSnapshot } from './scene-snapshot.js';
import { snapshotToUsdz } from './usdz-writer.js';
import { MODEL_SCALE, startWebXrAr } from './webxr-ar.js';
import { startWebXrVr } from './webxr-vr.js';
import { showViewerToast } from './xr-toast.js';
import {
  TABLETOP_SIZE, captureCustomModelSnapshot, chooseModelFile, closeCustomModel, getCustomModelInfo, getCustomVrScene,
  initModelImport, isCustomModelActive,
} from './model-import.js';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const ICONS = {
  arModel: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5 12 12l8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  arFull: '<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  vr: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-4l-2-2.5h-3l-2 2.5h-4A1.5 1.5 0 0 1 3 15.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="11.5" r="1.6" fill="currentColor"/><circle cx="16" cy="11.5" r="1.6" fill="currentColor"/>',
  gyro: '<rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9a9 9 0 0 0 0 6M21.5 9a9 9 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  cardboard: '<path d="M2.5 8h19v9h-6l-2-3h-3l-2 3h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  open: '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2h6.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  house: '<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
const icon = name => `<svg class="xr-option-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const menuState = {
  support: { quickLook: false, webxrAr: false, webxrVr: false, gyro: false },
  files: null,        // { model: { url, bytes }, full: { url, bytes } }
  preparing: false,
  modelSnapshot: null,
  sessionActive: false,
  generation: 0,
};

/* ---------- thiết bị làm được gì ---------- */
async function detectSupport() {
  const forceAll = new URLSearchParams(location.search).get('xr') === 'all';
  const anchor = document.createElement('a');
  const quickLook = !!(anchor.relList && anchor.relList.supports && anchor.relList.supports('ar'));
  let webxrAr = false, webxrVr = false;
  if (navigator.xr && window.isSecureContext) {
    [webxrAr, webxrVr] = await Promise.all(['immersive-ar', 'immersive-vr'].map(mode => navigator.xr.isSessionSupported(mode).catch(() => false)));
  }
  const support = { quickLook, webxrAr: webxrAr && !quickLook, webxrVr, gyro: isGyroSupported() };
  if (forceAll) Object.keys(support).forEach(key => { support[key] = true; });
  return support;
}

/* ---------- file USDZ ---------- */
function revokeFiles() {
  if (!menuState.files) return;
  Object.values(menuState.files).forEach(file => file.url && URL.revokeObjectURL(file.url));
  menuState.files = null;
}

async function exportUsdz(snapshot, scale, name) {
  const blob = await snapshotToUsdz(snapshot, { scale, name, fileName: `${name}.usda` });
  return { url: URL.createObjectURL(blob), bytes: blob.size };
}

/** Tên file an toàn cho USDZ / USDA (chữ không dấu, số, gạch ngang). */
const fileSlug = name => (name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'model');

/** Tỉ lệ để cạnh lớn nhất của mô hình người dùng dài TABLETOP_SIZE mét khi đặt lên bàn. */
const tabletopScale = info => Math.min(1, TABLETOP_SIZE / info.maxMeters);

/** Ảnh chụp đúng như đang xem (mái, cắt tường, nội thất), cho mô hình thu nhỏ. */
function captureCurrentView() {
  return captureHouseSnapshot({ includeRoof: displaySettings.roofVisible });
}

/** Ảnh chụp đủ tường và mái, cho kích thước thật 1:1 (đi vào bên trong). */
function captureFullHouse() {
  const wasCut = displaySettings.cutWalls;
  if (wasCut) setCutWalls(false);
  try { return captureHouseSnapshot({ includeRoof: true }); }
  finally { if (wasCut) setCutWalls(true); }
}

function prepareFiles() {
  if (menuState.preparing || !viewer.initialized) return;
  menuState.preparing = true;
  renderOptions();
  // Đợi một khung hình để bảng hiện ra trước khi tính (vài trăm ms trên điện thoại).
  setTimeout(async () => {
    const generation = ++menuState.generation;
    try {
      revokeFiles();
      const custom = isCustomModelActive() ? getCustomModelInfo() : null;
      menuState.modelSnapshot = custom ? captureCustomModelSnapshot() : captureCurrentView();
      const { support } = menuState, needsUsdz = support.quickLook || !support.webxrAr;
      if (needsUsdz) {
        let files;
        if (custom) {
          const name = fileSlug(custom.name), snapshot = menuState.modelSnapshot;
          files = { model: await exportUsdz(snapshot, tabletopScale(custom), name), full: await exportUsdz(snapshot, 1, name), name };
        } else {
          files = { model: await exportUsdz(menuState.modelSnapshot, MODEL_SCALE, 'house'), full: await exportUsdz(captureFullHouse(), 1, 'house') };
        }
        // Mô hình đã đổi trong lúc tạo file: bỏ kết quả cũ.
        if (generation !== menuState.generation) { Object.values(files).forEach(file => file.url && URL.revokeObjectURL(file.url)); return; }
        menuState.files = files;
      }
    } catch (error) {
      console.warn('[xr] export failed', error);
      showViewerToast(t('Không tạo được mô hình AR trên thiết bị này.'), 3000);
    } finally {
      if (generation === menuState.generation) menuState.preparing = false;
      renderOptions();
    }
  }, 60);
}

/* ---------- bảng chọn ---------- */
const formatMegabytes = bytes => `${(bytes / 1048576).toFixed(1)} MB`;

function optionMarkup({ id, iconName, title, description, href, download, rel, pressed }) {
  const text = `${icon(iconName)}<span class="xr-option-text"><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>`;
  if (rel || download) {
    // AR Quick Look đòi thẻ <a rel="ar"> chỉ chứa đúng một <img>: phủ thẻ đó lên toàn bộ ô.
    const ready = !!href;
    const link = ready
      ? `<a class="xr-option-link" href="${escapeHtml(href)}"${rel ? ' rel="ar"' : ''}${download ? ` download="${escapeHtml(download)}"` : ''}><img src="${TRANSPARENT_PIXEL}" alt="${escapeHtml(title)}"></a>`
      : '';
    return `<li class="xr-option" data-option="${id}"${ready ? '' : ' aria-disabled="true"'}>${text}${link}</li>`;
  }
  return `<li><button type="button" class="xr-option" data-option="${id}"${pressed === undefined ? '' : ` aria-pressed="${pressed}"`}>${text}</button></li>`;
}

/** Số đo gọn: 2 m, 1.5 m, 35 cm, 2 × 1 × 0.8 m. */
const lengthNumber = (value, inCentimeters) => (inCentimeters
  ? String(Math.max(1, Math.round(value * 100)))
  : String(Number(value.toFixed(value >= 10 ? 0 : 2))));
const formatLengths = values => {
  const inCentimeters = Math.max(...values) < 1;
  return `${values.map(value => lengthNumber(value, inCentimeters)).join(' × ')} ${inCentimeters ? 'cm' : 'm'}`;
};
const formatMeters = meters => formatLengths([meters]);
const formatSize = formatLengths;

/** Lựa chọn khi đang xem mô hình người dùng mở. */
function buildCustomOptions(info) {
  const { support, files, preparing } = menuState, options = [], ready = !preparing && files;
  const waiting = t('Đang chuẩn bị mô hình…'), size = formatSize(info.sizeMeters);
  if (support.quickLook) {
    options.push({
      id: 'quick-look-model', iconName: 'arModel', rel: true, href: ready && files.model.url,
      title: t('AR: đặt mô hình lên bàn'),
      description: ready ? t('Thu nhỏ còn khoảng {size}, đặt lên bàn hoặc sàn qua camera. Chụm 2 ngón để phóng to, thu nhỏ.', { size: formatMeters(info.maxMeters * tabletopScale(info)) }) : waiting,
    });
    options.push({
      id: 'quick-look-full', iconName: 'arFull', rel: true, href: ready && `${files.full.url}#allowsContentScaling=0`,
      title: t('AR: kích thước thật'),
      description: ready ? t('Đặt đúng kích thước theo file ({size}).', { size }) : waiting,
    });
  }
  if (support.webxrAr) {
    options.push({
      id: 'webxr-ar', iconName: 'arModel', title: t('AR qua camera'),
      description: t('Hướng camera xuống sàn, chạm để đặt mô hình. Đổi được giữa bản thu nhỏ và kích thước thật ({size}).', { size }),
    });
  }
  if (support.webxrVr) {
    options.push({ id: 'webxr-vr', iconName: 'vr', title: t('Kính VR'), description: t('Đứng cạnh mô hình ở kích thước thật. Bấm cò hoặc chạm màn hình để đi vòng quanh.') });
  }
  if (!support.quickLook) {
    options.push({
      id: 'download', iconName: 'download', download: files ? `${files.name}.usdz` : 'model.usdz', href: ready && files.full.url,
      title: t('Tải file USDZ'),
      description: ready ? t('Mô hình kích thước thật ({size}) để mở bằng Quick Look trên iPhone, iPad, Mac hoặc gửi qua AirDrop.', { size: formatMegabytes(files.full.bytes) }) : waiting,
    });
  }
  options.push({ id: 'open-model', iconName: 'open', title: t('Mở file 3D khác'), description: t('.glb, .gltf, .obj hoặc .stl trên máy. File chỉ đọc trên trình duyệt, không tải lên đâu cả.') });
  options.push({ id: 'house', iconName: 'house', title: t('Về ngôi nhà vườn'), description: t('Đóng mô hình đang xem.') });
  return options;
}

function buildOptions() {
  const custom = isCustomModelActive() ? getCustomModelInfo() : null;
  if (custom) return buildCustomOptions(custom);
  const { support, files, preparing } = menuState, options = [];
  const waiting = t('Đang chuẩn bị mô hình…');
  if (support.quickLook) {
    options.push({
      id: 'quick-look-model', iconName: 'arModel', rel: true, href: files && files.model.url,
      title: t('AR: mô hình thu nhỏ 1:30'),
      description: preparing || !files ? waiting : t('Đặt nhà thu nhỏ lên bàn hoặc sàn qua camera. Chụm 2 ngón để phóng to, thu nhỏ.'),
    });
    options.push({
      id: 'quick-look-full', iconName: 'arFull', rel: true, href: files && `${files.full.url}#allowsContentScaling=0`,
      title: t('AR: kích thước thật 1:1'),
      description: preparing || !files ? waiting : t('Đặt nhà đúng kích thước ra sân hoặc bãi trống rồi đi vào bên trong.'),
    });
  }
  if (support.webxrAr) {
    options.push({
      id: 'webxr-ar', iconName: 'arModel', title: t('AR qua camera'),
      description: t('Hướng camera xuống sàn, chạm để đặt nhà. Đổi được giữa 1:30 và 1:1.'),
    });
  }
  if (support.webxrVr) {
    options.push({ id: 'webxr-vr', iconName: 'vr', title: t('Kính VR'), description: t('Đứng trong nhà đúng tỉ lệ. Bấm cò hoặc chạm màn hình để sang phòng tiếp theo.') });
  }
  if (support.gyro) {
    options.push({
      id: 'gyro', iconName: 'gyro', pressed: isGyroActive() && !isStereoActive(),
      title: isGyroActive() && !isStereoActive() ? t('Tắt nhìn bằng con quay') : t('Nhìn quanh bằng con quay'),
      description: t('Đi dạo ở mắt nhân vật, xoay máy để nhìn quanh như đang đứng trong nhà.'),
    });
    options.push({
      id: 'cardboard', iconName: 'cardboard', pressed: isStereoActive(),
      title: t('Kính Cardboard (2 mắt)'),
      description: t('Chia đôi màn hình cho kính thực tế ảo bằng bìa. Chạm màn hình để đi tới.'),
    });
  }
  if (!support.quickLook) {
    options.push({
      id: 'download', iconName: 'download', download: 'nha-vuon-1-1.usdz', href: files && files.full.url,
      title: t('Tải file USDZ'),
      description: preparing || !files ? waiting : t('Mô hình 1:1 ({size}) để mở bằng Quick Look trên iPhone, iPad, Mac hoặc gửi qua AirDrop.', { size: formatMegabytes(files.full.bytes) }),
    });
  }
  options.push({ id: 'open-model', iconName: 'open', title: t('Mở mô hình 3D của bạn'), description: t('.glb, .gltf, .obj hoặc .stl trên máy, xem 3D rồi xem AR / VR như ngôi nhà. File chỉ đọc trên trình duyệt, không tải lên đâu cả.') });
  return options;
}

function renderOptions() {
  const sheet = getElement('#xr-sheet');
  if (!sheet || sheet.hidden) return;
  sheet.querySelector('.xr-options').innerHTML = buildOptions().map(optionMarkup).join('');
  const { support } = menuState, note = sheet.querySelector('.xr-sheet-note');
  let noteText = '';
  if (!support.quickLook && !support.webxrAr) noteText = t('Muốn xem AR qua camera, mở trang này bằng Safari trên iPhone, iPad hoặc Chrome trên điện thoại Android.');
  else if (support.quickLook) noteText = t('AR Quick Look của Apple sẽ mở camera. Di chuyển máy chậm để dò mặt sàn.');
  note.textContent = noteText;
  note.hidden = !noteText;
}

function setSheetOpen(open) {
  const sheet = getElement('#xr-sheet'), button = getElement('#xr-button');
  if (!sheet || sheet.hidden === !open) return;
  sheet.hidden = !open;
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) { renderOptions(); prepareFiles(); sheet.querySelector('.xr-sheet-close').focus({ preventScroll: true }); }
}

/* ---------- các lựa chọn ---------- */
function pauseMainView() { menuState.sessionActive = true; stopRenderLoop(); }
function resumeMainView() {
  menuState.sessionActive = false;
  if (appState.viewMode === '3d' && !document.hidden) startRenderLoop();
}

async function runOption(id) {
  if (id === 'gyro' || id === 'cardboard') {
    const stereo = id === 'cardboard';
    if (isGyroActive() && (stereo ? isStereoActive() : !isStereoActive())) stopGyroLook();
    else if (await startGyroLook({ stereo })) setSheetOpen(false);
    renderOptions();
    return;
  }
  if (id === 'open-model') { setSheetOpen(false); chooseModelFile(); return; }
  if (id === 'house') { setSheetOpen(false); closeCustomModel(); return; }
  if (menuState.sessionActive) return;
  const custom = isCustomModelActive() ? getCustomModelInfo() : null;
  if (id === 'webxr-ar') {
    const snapshot = menuState.modelSnapshot || (custom ? captureCustomModelSnapshot() : captureCurrentView());
    const options = { onStart: pauseMainView, onEnd: resumeMainView };
    if (custom) {
      Object.assign(options, {
        smallScale: tabletopScale(custom), fullScale: 1,
        labels: { toSmall: t('Bản thu nhỏ'), toFull: t('Kích thước thật'), place: t('Hướng camera xuống sàn rồi chạm để đặt mô hình'), placed: t('Chạm chỗ khác để dời mô hình') },
      });
    }
    setSheetOpen(false);
    try {
      await startWebXrAr(snapshot, options);
    } catch (error) {
      console.warn('[xr] AR session failed', error);
      resumeMainView();
      showViewerToast(t('Không mở được AR trên thiết bị này.'), 3200);
    }
  } else if (id === 'webxr-vr') {
    stopGyroLook();
    setSheetOpen(false);
    const start = !custom && interactionState.walking ? { x: walkState.x, z: walkState.z, heading: walkState.heading } : null;
    try {
      await startWebXrVr({ start, scene: custom ? getCustomVrScene() : null, onStart: () => { menuState.sessionActive = true; }, onEnd: () => { menuState.sessionActive = false; } });
    } catch (error) {
      console.warn('[xr] VR session failed', error);
      menuState.sessionActive = false;
      showViewerToast(t('Không mở được kính VR trên thiết bị này.'), 3200);
    }
  }
}

function createButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.id = 'xr-button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'xr-sheet');
  button.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">${ICONS.vr}</svg>${escapeHtml(t('AR / VR'))}`;
  const anchor = getElement('#first-person-button');
  anchor.after(button);
  return button;
}

function createSheet() {
  const sheet = document.createElement('div');
  sheet.className = 'xr-sheet';
  sheet.id = 'xr-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-labelledby', 'xr-sheet-title');
  sheet.innerHTML = `
    <div class="xr-sheet-head">
      <h2 id="xr-sheet-title">${escapeHtml(t('Xem AR / VR'))}</h2>
      <button type="button" class="xr-sheet-close">${escapeHtml(t('Đóng'))}</button>
    </div>
    <ul class="xr-options"></ul>
    <p class="xr-sheet-note" hidden></p>`;
  getElement('#model-viewport').appendChild(sheet);
  sheet.querySelector('.xr-sheet-close').addEventListener('click', () => setSheetOpen(false));
  sheet.addEventListener('click', event => {
    const option = event.target.closest('button.xr-option');
    if (option) runOption(option.dataset.option);
    else if (event.target.closest('.xr-option-link')) setTimeout(() => setSheetOpen(false), 400);
  });
  return sheet;
}

export function initXrViewing() {
  initGyroLook();
  const button = createButton(), sheet = createSheet();
  button.addEventListener('click', () => { if (viewer.initialized) setSheetOpen(sheet.hidden); });
  detectSupport().then(support => { menuState.support = support; renderOptions(); });
  document.addEventListener('pointerdown', event => {
    if (!sheet.hidden && !sheet.contains(event.target) && !button.contains(event.target)) setSheetOpen(false);
  });
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && !sheet.hidden) { setSheetOpen(false); button.focus(); } });
  onEvent('mode:changed', () => setSheetOpen(false));
  onEvent('tour:starting', () => setSheetOpen(false));
  onEvent('furniture-editor:starting', () => setSheetOpen(false));
  // Mô hình đổi thì file cũ không còn đúng: tạo lại ở lần mở bảng sau.
  const invalidate = () => { menuState.modelSnapshot = null; };
  onEvent('furniture:changed', invalidate);
  onEvent('materials:swapped', invalidate);
  initModelImport();
  onEvent('custom-model:changed', () => {
    menuState.generation++;
    menuState.preparing = false;
    invalidate();
    revokeFiles();
    if (!sheet.hidden) { renderOptions(); prepareFiles(); }
  });
  if (!isTouchDevice) button.title = t('Xem nhà bằng AR qua camera hoặc kính VR');
}
