/**
 * Mở mô hình 3D của người dùng (.glb, .gltf, .obj, .stl) ngay trên trình duyệt, không tải lên đâu cả,
 * xem trong khung 3D rồi đưa sang AR / VR bằng cùng nút "AR / VR" (xr-menu.js).
 *
 * Mô hình nằm trong một cảnh riêng (đèn, nền đất, ảnh môi trường riêng); khi mở, viewer.scene tạm trỏ
 * sang cảnh đó nên cảnh ngôi nhà không bị đụng tới và trở lại nguyên vẹn khi bấm "Về ngôi nhà".
 *
 * Chọn nhiều file cùng lúc để kèm file phụ: .gltf + .bin + ảnh vân, .obj + .mtl + ảnh vân.
 * Thư viện đọc file (vendor/three/*Loader.js) chỉ tải khi cần.
 */
import { getElement, escapeHtml, isTouchDevice, t } from '../../core/dom.js';
import { interactionState } from '../../core/app-state.js';
import { emitEvent, onEvent } from '../../core/events.js';
import { viewer, SCENE_CENTER, setModelHint } from '../../viewer3d/viewer-context.js';
import { applyCameraView, cancelCameraFlight, clearViewButtons, setEyeLevelMode } from '../../viewer3d/camera-controller.js';
import { exitWalkMode } from '../walk/walk-controller.js';
import { captureSnapshot } from './scene-snapshot.js';
import { showViewerToast, hideViewerToast } from './xr-toast.js';

const MODEL_EXTENSIONS = ['glb', 'gltf', 'obj', 'stl'];
const MAX_FILE_BYTES = 200 * 1048576;
const DISPLAY_SIZE = 7;          // cạnh lớn nhất khi xem trong khung 3D (m)
export const TABLETOP_SIZE = 0.5; // cạnh lớn nhất của bản "đặt lên bàn" trong AR (m)
const LOADER_SCRIPTS = {
  gltf: ['vendor/three/GLTFLoader.js'],
  obj: ['vendor/three/MTLLoader.js', 'vendor/three/OBJLoader.js'],
  stl: ['vendor/three/STLLoader.js'],
  environment: ['vendor/three/RoomEnvironment.js'],
};

const modelState = {
  active: false, loading: false,
  scene: null, holder: null, object: null, ground: null, houseScene: null, environment: null,
  name: '', unitScale: 1, sizeUnits: null,   // sizeUnits: kích thước theo đơn vị của file (THREE.Vector3)
  snapshot: null,
};

const extensionOf = name => (name.split('.').pop() || '').toLowerCase();
const baseNameOf = url => decodeURIComponent(url.split(/[?#]/)[0].split(/[\\/]/).pop() || '');
const displayName = name => name.replace(/\.[^.]+$/, '');

/* ---------- thông tin cho xr-menu ---------- */
export const isCustomModelActive = () => modelState.active;

/** { name, sizeMeters: [x, y, z], maxMeters } của mô hình đang mở, hoặc null. */
export function getCustomModelInfo() {
  if (!modelState.active) return null;
  const sizeMeters = modelState.sizeUnits.clone().multiplyScalar(modelState.unitScale).toArray();
  return { name: modelState.name, sizeMeters, maxMeters: Math.max(...sizeMeters) };
}

/** Ảnh chụp (đơn vị mét, giữ ảnh vân) để ghi USDZ và đặt vào WebXR AR. */
export function captureCustomModelSnapshot() {
  if (!modelState.active) return null;
  if (modelState.snapshot) return modelState.snapshot;
  const { holder } = modelState, previousScale = holder.scale.x;
  holder.scale.setScalar(modelState.unitScale);
  try { modelState.snapshot = captureSnapshot([holder], { keepTextures: true }); }
  finally { holder.scale.setScalar(previousScale); holder.updateWorldMatrix(false, true); }
  return modelState.snapshot;
}

/** Cảnh cho kính VR: mô hình đúng kích thước thật (kẹp trong 0,25–40 m), người xem đứng trước mặt, bấm cò để đi vòng quanh. */
export function getCustomVrScene() {
  if (!modelState.active) return null;
  const info = getCustomModelInfo(), { holder } = modelState;
  const targetSize = Math.min(40, Math.max(0.25, info.maxMeters));
  const vrScale = modelState.unitScale * (targetSize / info.maxMeters);
  const footprint = Math.max(modelState.sizeUnits.x, modelState.sizeUnits.z) * vrScale;
  const distance = Math.max(1.2, footprint * 0.5 + Math.max(1, targetSize * 0.6));
  const spots = [0, 1, 2, 3].map(step => {
    const angle = step * Math.PI / 2; // trước, phải, sau, trái
    const x = SCENE_CENTER.x + Math.sin(angle) * distance, z = SCENE_CENTER.z + Math.cos(angle) * distance;
    return { x, z, heading: Math.atan2(SCENE_CENTER.x - x, SCENE_CENTER.z - z) };
  });
  let displayScale = holder.scale.x;
  return {
    spots, floorY: 0,
    enter() { displayScale = holder.scale.x; holder.scale.setScalar(vrScale); fitGround(footprint); },
    exit() { holder.scale.setScalar(displayScale); fitGround(Math.max(modelState.sizeUnits.x, modelState.sizeUnits.z) * displayScale); },
  };
}

/* ---------- tải thư viện ---------- */
const scriptPromises = new Map();
function loadScript(src) {
  if (!scriptPromises.has(src)) {
    scriptPromises.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => { scriptPromises.delete(src); reject(new Error(`Cannot load ${src}`)); };
      document.head.appendChild(script);
    }));
  }
  return scriptPromises.get(src);
}
const loadScripts = async names => { for (const src of names) await loadScript(src); };

/* ---------- đọc file ---------- */
/** Chỉ cho đọc file người dùng đã chọn: đường dẫn khác (kể cả http) bị chặn để không có gì gửi ra ngoài. */
function createManager(urlsByName) {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if (url.startsWith('data:')) return url;
    if (urlsByName.has(url)) return url;
    const name = baseNameOf(url);
    return urlsByName.get(name) || urlsByName.get(name.toLowerCase()) || 'data:,';
  });
  return manager;
}

function loadWith(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

const neutralMaterial = options => new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.62, metalness: 0.05, ...options });

async function parseFiles(main, files) {
  const extension = extensionOf(main.name), urlsByName = new Map(), blobUrls = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    blobUrls.push(url);
    urlsByName.set(file.name, url);
    urlsByName.set(file.name.toLowerCase(), url);
    urlsByName.set(url, url);
  }
  const manager = createManager(urlsByName), mainUrl = urlsByName.get(main.name);
  try {
    if (extension === 'glb' || extension === 'gltf') {
      await loadScripts(LOADER_SCRIPTS.gltf);
      const gltf = await loadWith(new THREE.GLTFLoader(manager), mainUrl);
      return gltf.scene || (gltf.scenes && gltf.scenes[0]);
    }
    if (extension === 'obj') {
      await loadScripts(LOADER_SCRIPTS.obj);
      const objLoader = new THREE.OBJLoader(manager), mtlFile = files.find(file => extensionOf(file.name) === 'mtl');
      if (mtlFile) {
        const materials = await loadWith(new THREE.MTLLoader(manager), urlsByName.get(mtlFile.name)).catch(() => null);
        if (materials) { materials.preload(); objLoader.setMaterials(materials); }
      }
      const object = objLoader.parse(await main.text());
      if (!mtlFile) object.traverse(child => { if (child.isMesh) child.material = neutralMaterial({ side: THREE.DoubleSide }); });
      return object;
    }
    await loadScripts(LOADER_SCRIPTS.stl);
    const geometry = new THREE.STLLoader().parse(await main.arrayBuffer());
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, neutralMaterial(geometry.hasColors ? { vertexColors: true, color: 0xffffff } : {}));
  } finally {
    // Đợi ảnh vân giải mã xong rồi mới thu hồi địa chỉ tạm.
    setTimeout(() => blobUrls.forEach(url => URL.revokeObjectURL(url)), 4000);
  }
}

/** Mét trên mỗi đơn vị của file. glTF luôn là mét; STL / OBJ thường vẽ theo mm nên đoán theo độ lớn. */
function guessUnitScale(extension, maxUnits) {
  if (extension === 'stl') return maxUnits > 5 ? 0.001 : 1;
  if (extension === 'obj') return maxUnits > 100 ? 0.001 : 1;
  return 1;
}

/* ---------- cảnh của mô hình ---------- */
function createModelScene() {
  const scene = new THREE.Scene();
  scene.background = modelState.houseScene.background;
  scene.fog = modelState.houseScene.fog;
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x8d8a80, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(SCENE_CENTER.x + 9, 16, SCENE_CENTER.z + 11);
  sun.target.position.copy(SCENE_CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 1, metalness: 0 }));
  ground.position.set(SCENE_CENTER.x, -0.003, SCENE_CENTER.z);
  ground.receiveShadow = true;
  ground.userData.excludeFromExport = true;
  scene.add(ground);
  modelState.ground = ground;
  return scene;
}

function fitGround(footprint) {
  if (modelState.ground) modelState.ground.scale.setScalar(Math.max(4, footprint * 0.9 + 2));
}

/** Ảnh môi trường (phòng sáng mờ) để vật liệu kim loại / bóng của glTF trông đúng; không có thì vẫn xem được. */
async function applyEnvironment(scene) {
  try {
    await loadScripts(LOADER_SCRIPTS.environment);
    if (!modelState.environment) {
      const generator = new THREE.PMREMGenerator(viewer.renderer);
      modelState.environment = generator.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      generator.dispose();
    }
    scene.environment = modelState.environment;
  } catch { /* không có ảnh môi trường */ }
}

function disposeObject(object) {
  object.traverse(child => {
    if (!child.isMesh && !child.isLine && !child.isPoints) return;
    child.geometry?.dispose();
    (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => {
      if (!material) return;
      Object.values(material).forEach(value => { if (value && value.isTexture) value.dispose(); });
      material.dispose();
    });
  });
}

function frameModel() {
  const { camera, controls } = viewer, size = modelState.sizeUnits.clone().multiplyScalar(modelState.holder.scale.x);
  const radius = Math.max(0.5, size.length() / 2), fieldOfView = 40;
  const verticalHalf = (fieldOfView * Math.PI) / 360, horizontalHalf = Math.atan(Math.tan(verticalHalf) * (camera.aspect || 1));
  const distance = (radius / Math.sin(Math.min(verticalHalf, horizontalHalf))) * 1.12;
  const target = SCENE_CENTER.clone().add(new THREE.Vector3(0, size.y / 2, 0));
  const direction = new THREE.Vector3(0.58, 0.4, 0.71).normalize();
  cancelCameraFlight();
  setEyeLevelMode(false);
  clearViewButtons();
  camera.fov = fieldOfView;
  camera.updateProjectionMatrix();
  camera.position.copy(target).addScaledVector(direction, distance);
  controls.target.copy(target);
  controls.maxDistance = Math.max(90, distance * 3);
  controls.update();
}

function showModel(object, fileName, extension) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) throw new Error('empty');
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const maxUnits = Math.max(size.x, size.y, size.z);
  if (!(maxUnits > 0) || !Number.isFinite(maxUnits)) throw new Error('empty');

  const wasActive = modelState.active;
  if (wasActive) clearModel();
  else {
    if (interactionState.walking) exitWalkMode();
    modelState.houseScene = viewer.scene;
  }
  if (!modelState.scene) modelState.scene = createModelScene();
  // Mô hình đặt giữa cảnh, đáy chạm nền; holder.scale đổi giữa cỡ xem trong khung, mét (ảnh chụp) và cỡ VR.
  const pivot = new THREE.Group();
  pivot.position.set(-center.x, -box.min.y, -center.z);
  pivot.add(object);
  const holder = new THREE.Group();
  holder.position.copy(SCENE_CENTER);
  holder.scale.setScalar(DISPLAY_SIZE / maxUnits);
  holder.add(pivot);
  object.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = true;
    child.frustumCulled = !child.isSkinnedMesh;
  });
  modelState.scene.add(holder);
  Object.assign(modelState, {
    active: true, holder, object, name: displayName(fileName), sizeUnits: size,
    unitScale: guessUnitScale(extension, maxUnits), snapshot: null,
  });
  fitGround(Math.max(size.x, size.z) * holder.scale.x);
  viewer.scene = modelState.scene;
  applyEnvironment(modelState.scene);
  getElement('#app').classList.add('has-custom-model');
  frameModel();
  setModelHint(t('{name} · Kéo để xoay · Cuộn hoặc chụm để thu phóng · Bấm AR / VR để xem qua camera hoặc kính', { name: modelState.name }));
  emitEvent('custom-model:changed', { active: true });
}

function clearModel() {
  if (!modelState.holder) return;
  modelState.scene.remove(modelState.holder);
  disposeObject(modelState.holder);
  Object.assign(modelState, { holder: null, object: null, snapshot: null });
}

/** Về lại ngôi nhà. resetView: false khi một góc nhìn khác sắp được áp dụng ngay sau đó. */
export function closeCustomModel({ resetView = true } = {}) {
  if (!modelState.active) return;
  modelState.active = false;
  clearModel();
  viewer.scene = modelState.houseScene;
  getElement('#app').classList.remove('has-custom-model');
  emitEvent('custom-model:changed', { active: false });
  if (resetView) applyCameraView('overview');
}

export async function openModelFiles(fileList) {
  if (!viewer.initialized || modelState.loading) return;
  const files = [...fileList], main = files.find(file => MODEL_EXTENSIONS.includes(extensionOf(file.name)));
  if (!main) { showViewerToast(t('Chọn file .glb, .gltf, .obj hoặc .stl.'), 3200); return; }
  if (main.size > MAX_FILE_BYTES) { showViewerToast(t('File lớn quá (tối đa 200 MB).'), 3200); return; }
  modelState.loading = true;
  updateButtons();
  showViewerToast(t('Đang mở {name}…', { name: main.name }), 0);
  try {
    const object = await parseFiles(main, files);
    if (!object) throw new Error('empty');
    if (interactionState.touring) throw new Error('busy');
    showModel(object, main.name, extensionOf(main.name));
    hideViewerToast();
    // .gltf trỏ tới file .bin / ảnh bên ngoài mà người dùng chỉ chọn mỗi file .gltf.
    if (extensionOf(main.name) === 'gltf' && files.length === 1 && /"uri"\s*:\s*"(?!data:)/.test(await main.text())) {
      showViewerToast(t('Nếu thiếu vân hoặc hình, chọn cùng lúc file .gltf với file .bin và ảnh đi kèm.'), 5000);
    }
  } catch (error) {
    console.warn('[model-import] failed', error);
    const message = String(error && error.message || error);
    let text = t('Không mở được file này. Thử xuất lại thành .glb.');
    if (/DRACO|KTX2|meshopt/i.test(message)) text = t('Mô hình nén (Draco / KTX2 / Meshopt) chưa đọc được. Xuất lại .glb không nén.');
    else if (message === 'empty') text = t('File không có hình 3D nào để hiển thị.');
    showViewerToast(text, 4500);
  } finally {
    modelState.loading = false;
    updateButtons();
  }
}

/* ---------- giao diện ---------- */
const OPEN_ICON = '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5 12 12l8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
const HOUSE_ICON = '<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

let fileInput = null;

/** Mở hộp chọn file; gọi trong sự kiện bấm. */
export function chooseModelFile() {
  if (fileInput && viewer.initialized) fileInput.click();
}

function updateButtons() {
  const openButton = getElement('#model-open-button');
  if (openButton) openButton.setAttribute('aria-busy', modelState.loading ? 'true' : 'false');
}

function createChip(id, iconPath, label, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `chip ${extraClass}`.trim();
  button.id = id;
  button.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">${iconPath}</svg>${escapeHtml(label)}`;
  return button;
}

export function initModelImport() {
  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.id = 'model-file-input';
  // Safari iOS và một số máy Android làm mờ file .glb / .stl nếu lọc theo đuôi, nên chỉ lọc trên máy tính.
  if (!isTouchDevice) fileInput.accept = '.glb,.gltf,.obj,.mtl,.stl,.bin,.png,.jpg,.jpeg,.webp,.ktx2';
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) openModelFiles(fileInput.files);
    fileInput.value = '';
  });
  const viewport = getElement('#model-viewport');
  viewport.appendChild(fileInput);

  const anchor = getElement('#xr-button') || getElement('#first-person-button');
  const openButton = createChip('model-open-button', OPEN_ICON, t('Mở file 3D'));
  const houseButton = createChip('model-house-button', HOUSE_ICON, t('Về ngôi nhà'), 'custom-model-only');
  if (!isTouchDevice) openButton.title = t('Mở mô hình .glb, .gltf, .obj hoặc .stl trên máy để xem 3D, AR và VR');
  anchor.after(openButton, houseButton);
  openButton.addEventListener('click', chooseModelFile);
  houseButton.addEventListener('click', () => closeCustomModel());

  // Kéo thả file vào khung 3D.
  viewport.addEventListener('dragover', event => {
    if (!viewer.initialized || ![...(event.dataTransfer?.types || [])].includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    viewport.classList.add('is-drop-target');
  });
  viewport.addEventListener('dragleave', event => { if (!viewport.contains(event.relatedTarget)) viewport.classList.remove('is-drop-target'); });
  viewport.addEventListener('drop', event => {
    viewport.classList.remove('is-drop-target');
    if (!viewer.initialized || !event.dataTransfer?.files?.length) return;
    event.preventDefault();
    openModelFiles(event.dataTransfer.files);
  });

  // Các chế độ dành cho ngôi nhà đưa người xem về nhà.
  onEvent('camera:view-changing', () => closeCustomModel({ resetView: false }));
  onEvent('walk:starting', () => closeCustomModel({ resetView: false }));
  onEvent('tour:starting', () => closeCustomModel({ resetView: false }));
  onEvent('furniture-editor:starting', () => closeCustomModel({ resetView: false }));
}
