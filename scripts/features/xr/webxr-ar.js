/**
 * AR qua camera bằng WebXR (Chrome trên Android có ARCore): dò mặt sàn, chạm để đặt nhà (hoặc mô hình
 * người dùng mở), đổi giữa bản thu nhỏ (nhà: 1:30) và kích thước thật 1:1.
 *
 * Dùng một bộ vẽ riêng có kênh alpha (bộ vẽ chính không có, nên nền camera sẽ bị đen) và cảnh riêng
 * dựng từ ảnh chụp đã gộp, để cảnh chính không bị đụng tới.
 */
import { t } from '../../core/dom.js';
import { buildSnapshotGroup, disposeSnapshotGroup } from './scene-snapshot.js';

export const MODEL_SCALE = 1 / 30;

function createOverlay(onToggleScale, onExit) {
  const overlay = document.createElement('div');
  overlay.className = 'xr-ar-overlay';
  overlay.innerHTML = `
    <p class="xr-ar-hint" aria-live="polite"></p>
    <div class="xr-ar-actions">
      <button type="button" class="xr-ar-scale"></button>
      <button type="button" class="xr-ar-exit">${t('Thoát AR')}</button>
    </div>`;
  // Chạm vào nút không được tính là chạm để đặt nhà.
  overlay.addEventListener('beforexrselect', event => { if (event.target.closest('button')) event.preventDefault(); });
  overlay.querySelector('.xr-ar-scale').addEventListener('click', onToggleScale);
  overlay.querySelector('.xr-ar-exit').addEventListener('click', onExit);
  document.body.appendChild(overlay);
  return overlay;
}

function createReticle() {
  const geometry = new THREE.RingGeometry(0.09, 0.12, 40).rotateX(-Math.PI / 2);
  const reticle = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  return reticle;
}

/**
 * Phải gọi trực tiếp trong sự kiện bấm (trình duyệt đòi thao tác của người dùng).
 * onEnd được gọi khi phiên kết thúc (kể cả khi lỗi).
 */
export async function startWebXrAr(snapshot, { onStart, onEnd, smallScale = MODEL_SCALE, fullScale: realScale = 1, labels = {} } = {}) {
  const text = {
    toSmall: t('Thu nhỏ 1:30'), toFull: t('Kích thước thật 1:1'),
    place: t('Hướng camera xuống sàn, chạm vào vòng tròn để đặt nhà'), placed: t('Chạm chỗ khác để dời nhà · Đi quanh để xem'),
    ...labels,
  };
  let session = null, renderer = null, overlay = null, model = null, hitTestSource = null, fullScale = false, placed = false;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.02, 200);

  const updateLabels = () => {
    if (!overlay) return;
    overlay.querySelector('.xr-ar-scale').textContent = fullScale ? text.toSmall : text.toFull;
    overlay.querySelector('.xr-ar-hint').textContent = placed ? text.placed : text.place;
  };
  const toggleScale = () => {
    fullScale = !fullScale;
    model.scale.setScalar(fullScale ? realScale : smallScale);
    updateLabels();
  };
  const exit = () => { if (session) session.end().catch(() => {}); };

  overlay = createOverlay(toggleScale, exit);
  updateLabels();
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor'],
      domOverlay: { root: overlay },
    });
  } catch (error) {
    overlay.remove();
    onEnd?.(error);
    throw error;
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8a80, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 8, 4);
  scene.add(sun);
  model = buildSnapshotGroup(snapshot);
  model.scale.setScalar(smallScale);
  model.visible = false;
  scene.add(model);
  const reticle = createReticle();
  scene.add(reticle);

  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (!reticle.visible) return;
    model.position.setFromMatrixPosition(reticle.matrix);
    // Quay mặt tiền (phía +z của mô hình) về phía người xem.
    const viewerPosition = new THREE.Vector3().setFromMatrixPosition(renderer.xr.getCamera().matrixWorld);
    model.rotation.y = Math.atan2(viewerPosition.x - model.position.x, viewerPosition.z - model.position.z);
    model.visible = true;
    placed = true;
    updateLabels();
  });
  scene.add(controller);

  const cleanUp = () => {
    renderer.setAnimationLoop(null);
    if (hitTestSource) { try { hitTestSource.cancel(); } catch { /* đã huỷ */ } }
    disposeSnapshotGroup(model);
    reticle.geometry.dispose();
    reticle.material.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch { /* không sao */ }
    overlay.remove();
    session = null;
    onEnd?.();
  };
  session.addEventListener('end', cleanUp);

  try {
    await renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (error) {
    exit();
    throw error;
  }
  onStart?.();

  renderer.setAnimationLoop((time, frame) => {
    if (frame && hitTestSource) {
      const results = frame.getHitTestResults(hitTestSource);
      const pose = results.length ? results[0].getPose(renderer.xr.getReferenceSpace()) : null;
      reticle.visible = !!pose;
      if (pose) reticle.matrix.fromArray(pose.transform.matrix);
    }
    renderer.render(scene, camera);
  });
}
