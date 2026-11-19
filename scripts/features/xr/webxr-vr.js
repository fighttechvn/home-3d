/**
 * Kính VR bằng WebXR (Quest, Pico, Chrome trên Android với kính Cardboard): đứng trong nhà ở đúng tỉ lệ,
 * bấm cò (hoặc chạm màn hình) để sang phòng tiếp theo. Dùng cảnh và bộ vẽ chính; vòng lặp vẽ thường
 * dừng trong lúc xem và chạy lại khi thoát.
 */
import { CAMERA_VIEWS } from '../../data/camera-views.js';
import { floorHeightAt } from '../../data/house-plan.js';
import { viewer, displaySettings } from '../../viewer3d/viewer-context.js';
import { startRenderLoop, stopRenderLoop } from '../../viewer3d/viewer.js';
import { setRoofVisible, setCutWalls } from '../../viewer3d/display-settings.js';

/** Các điểm đứng: hiên trước rồi lần lượt các phòng (lấy từ góc nhìn trong phòng). */
function standingSpots() {
  const names = ['porch', 'foyer', 'living-room', 'family-area', 'kitchen', 'dining-room', 'bedroom-2', 'hallway', 'master-bedroom', 'bathroom'];
  return names.filter(name => CAMERA_VIEWS[name]).map(name => {
    const { position: [x, , z], target } = CAMERA_VIEWS[name];
    return { x, z, heading: Math.atan2(target[0] - x, target[2] - z) };
  });
}

/**
 * Phải gọi trực tiếp trong sự kiện bấm. start: { x, z, heading } nếu muốn bắt đầu ở chỗ nhân vật đang đứng.
 * scene: thay cho ngôi nhà (mô hình người dùng mở): { spots: [{ x, z, heading }], floorY, enter(), exit() };
 * enter() dựng cảnh trước khi vào kính, exit() trả lại khi thoát.
 */
export async function startWebXrVr({ start = null, onStart, onEnd, scene: custom = null } = {}) {
  const renderer = viewer.renderer;
  let session, floorOffset = 0;
  try {
    session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
  } catch {
    // Thiết bị không có mặt sàn (kính Cardboard): dùng 'local' và tự cộng chiều cao mắt.
    session = await navigator.xr.requestSession('immersive-vr');
    renderer.xr.setReferenceSpaceType('local');
    floorOffset = 1.6;
  }

  const previous = { roof: displaySettings.roofVisible, cutWalls: displaySettings.cutWalls };
  if (custom) custom.enter?.();
  else { setCutWalls(false); setRoofVisible(true); }
  const xrCamera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
  const spots = custom ? custom.spots : standingSpots();
  const floorAt = (x, z) => (custom ? custom.floorY || 0 : floorHeightAt(x, z));
  let spotIndex = 0, baseSpace = null;

  const standAt = ({ x, z, heading }) => {
    if (!baseSpace) return;
    // Người xem nhìn theo -z của không gian XR; heading của nhà: hướng [sin, cos] trên mặt bằng.
    const transform = new THREE.Matrix4().makeRotationY(heading + Math.PI).setPosition(x, floorAt(x, z) + floorOffset, z).invert();
    const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    transform.decompose(position, rotation, scale);
    renderer.xr.setReferenceSpace(baseSpace.getOffsetReferenceSpace(new XRRigidTransform(
      { x: position.x, y: position.y, z: position.z, w: 1 }, { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    )));
  };
  const nextSpot = () => { spotIndex = (spotIndex + 1) % spots.length; standAt(spots[spotIndex]); };
  const controllers = [0, 1].map(index => {
    const controller = renderer.xr.getController(index);
    controller.addEventListener('select', nextSpot);
    viewer.scene.add(controller);
    return controller;
  });

  stopRenderLoop();
  renderer.xr.enabled = true;
  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null);
    renderer.xr.enabled = false;
    controllers.forEach(controller => { controller.removeEventListener('select', nextSpot); viewer.scene.remove(controller); });
    if (custom) custom.exit?.();
    else { setRoofVisible(previous.roof); setCutWalls(previous.cutWalls); }
    startRenderLoop();
    onEnd?.();
  });
  try {
    await renderer.xr.setSession(session);
  } catch (error) {
    session.end().catch(() => {});
    throw error;
  }
  baseSpace = renderer.xr.getReferenceSpace();
  const firstSpot = custom ? 0 : 1;
  standAt(start || spots[firstSpot] || spots[0]);
  if (!start) spotIndex = Math.min(firstSpot, spots.length - 1);
  onStart?.();
  renderer.setAnimationLoop(() => renderer.render(viewer.scene, xrCamera));
}
