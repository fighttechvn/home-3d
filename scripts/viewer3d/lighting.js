/** Ánh sáng ngày và đêm: mặt trời, trăng, bầu trời, đèn trong nhà, đèn sân vườn. */
import { getElement, setPressed, isTouchDevice } from '../core/dom.js';
import { seededRandom } from '../core/random.js';
import { WALL_HEIGHT, GROUND_LEVEL } from '../data/house-plan.js';
import {
  SUN_OFFSET, MOON_OFFSET, ROOM_LIGHTS, OUTDOOR_LIGHTS, LIGHT_INTENSITY_SCALE, DOWNLIGHT_POSITIONS,
  WALL_SCONCES, GARDEN_BOLLARDS, STRING_LIGHT_LINES_X, STRING_LIGHT_RANGE_Z,
} from '../data/lighting-fixtures.js';
import { viewer, displaySettings, SCENE_CENTER } from './viewer-context.js';
import { materials, basicMaterials, realisticMaterials, realisticAssets, lightBulbMaterials } from './materials.js';
import { createCanvas, createCanvasTexture } from './texture-utils.js';
import { equirectangularPixel, drawDistantTreeLine, createEnvironmentMap, forEachRealisticMaterial } from './materials-realistic.js';
import { addBox, addCylinder, enableShadows } from './primitives.js';

const lightingState = { basicSky: null, nightSky: null, nightEnvironmentMap: null, indoorLights: [], outdoorLights: [] };

/* ---------- đèn của cảnh ---------- */
export function createSceneLights() {
  const { scene } = viewer;
  viewer.hemisphereLight = new THREE.HemisphereLight(0xeef4f8, 0xb3aa98, 0.62);
  viewer.ambientLight = new THREE.AmbientLight(0xffffff, 0.14);
  const sun = new THREE.DirectionalLight(0xfff0db, 1.65);
  sun.position.set(SCENE_CENTER.x + SUN_OFFSET[0], SUN_OFFSET[1], SCENE_CENTER.z + SUN_OFFSET[2]);
  sun.target.position.copy(SCENE_CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  viewer.sunLight = sun;
  scene.add(viewer.hemisphereLight, viewer.ambientLight, sun, sun.target);
}

export function createBasicSky() {
  lightingState.basicSky = createCanvasTexture(4, 256, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#9cc0d4'); gradient.addColorStop(0.62, '#dce8ec'); gradient.addColorStop(1, '#eef2ee');
    context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  });
  return lightingState.basicSky;
}

/** Bầu trời đêm toàn cảnh: sao, dải ngân hà, trăng, hàng cây tối. */
function createNightSky(width) {
  const height = width / 2, canvas = createCanvas(width, height), context = canvas.getContext('2d'), horizon = height / 2, pixelScale = width / 4096;
  let gradient = context.createLinearGradient(0, 0, 0, horizon);
  gradient.addColorStop(0, '#02050d'); gradient.addColorStop(0.62, '#0a1430'); gradient.addColorStop(0.93, '#1f2a48'); gradient.addColorStop(1, '#33395a');
  context.fillStyle = gradient; context.fillRect(0, 0, width, horizon);
  gradient = context.createLinearGradient(0, horizon, 0, height);
  gradient.addColorStop(0, '#141824'); gradient.addColorStop(1, '#040507');
  context.fillStyle = gradient; context.fillRect(0, horizon, width, height - horizon);

  for (let dust = 0; dust < width * 1.6; dust++) { // dải ngân hà
    const along = seededRandom(), x = along * width;
    const y = horizon * (0.35 + 0.25 * Math.sin(along * Math.PI * 2 + 0.6)) + (seededRandom() - 0.5) * horizon * 0.16 * (1 + seededRandom());
    context.fillStyle = `rgba(${(190 + seededRandom() * 40) | 0},${(195 + seededRandom() * 40) | 0},255,${0.04 + seededRandom() * 0.06})`;
    context.beginPath(); context.arc(x, y, (0.6 + seededRandom() * 1.6) * pixelScale, 0, 7); context.fill();
  }
  const starCount = Math.round((width * height) / 1100);
  for (let star = 0; star < starCount; star++) {
    const x = seededRandom() * width, y = seededRandom() * horizon * 0.97, isBright = seededRandom() < 0.025;
    const radius = (isBright ? 1.1 + seededRandom() * 1.0 : 0.4 + seededRandom() * 0.6) * pixelScale, alpha = 0.35 + seededRandom() * 0.65, tint = seededRandom();
    const color = tint < 0.15 ? '255,226,190' : tint < 0.3 ? '200,215,255' : '255,255,255';
    if (isBright) {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius * 5);
      glow.addColorStop(0, `rgba(${color},${alpha})`); glow.addColorStop(1, `rgba(${color},0)`);
      context.fillStyle = glow; context.beginPath(); context.arc(x, y, radius * 5, 0, 7); context.fill();
    }
    context.fillStyle = `rgba(${color},${alpha})`; context.beginPath(); context.arc(x, y, radius, 0, 7); context.fill();
  }
  gradient = context.createLinearGradient(0, horizon - height * 0.06, 0, horizon);
  gradient.addColorStop(0, 'rgba(80,70,110,0)'); gradient.addColorStop(1, 'rgba(95,82,120,0.35)');
  context.fillStyle = gradient; context.fillRect(0, horizon - height * 0.06, width, height * 0.06);
  drawDistantTreeLine(context, width, height, '#04070a', 4 * pixelScale);

  const [moonX, moonY] = equirectangularPixel(new THREE.Vector3(...MOON_OFFSET).normalize(), width, height);
  for (const offsetX of [0, -width, width]) {
    const glow = context.createRadialGradient(moonX + offsetX, moonY, 0, moonX + offsetX, moonY, width * 0.07);
    glow.addColorStop(0, 'rgba(210,222,255,0.45)'); glow.addColorStop(1, 'rgba(210,222,255,0)');
    context.fillStyle = glow; context.fillRect(moonX + offsetX - width * 0.07, moonY - width * 0.07, width * 0.14, width * 0.14);
    context.fillStyle = '#f3f0e4'; context.beginPath(); context.arc(moonX + offsetX, moonY, width * 0.0065, 0, 7); context.fill();
    context.fillStyle = 'rgba(180,175,160,0.35)'; context.beginPath(); context.arc(moonX + offsetX - width * 0.0018, moonY + width * 0.0012, width * 0.0018, 0, 7); context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

/* ---------- đèn ban đêm ---------- */
export function buildNightLights() {
  const nightLights = new THREE.Group();
  nightLights.visible = false;
  const addPointLights = (targetList, definitions, color) => definitions.forEach(([x, y, z, intensity, range, keepOnTouchDevices]) => {
    if (isTouchDevice && !keepOnTouchDevices) return;
    const light = new THREE.PointLight(color, intensity * LIGHT_INTENSITY_SCALE, range, 2);
    light.position.set(x, y, z);
    light.userData.baseIntensity = intensity * LIGHT_INTENSITY_SCALE;
    nightLights.add(light);
    targetList.push(light);
  });
  addPointLights(lightingState.indoorLights, ROOM_LIGHTS, 0xffcf96);
  addPointLights(lightingState.outdoorLights, OUTDOOR_LIGHTS, 0xffc98a);
  viewer.scene.add(nightLights);
  viewer.groups.nightLights = nightLights;

  const wallFixtures = new THREE.Group();
  WALL_SCONCES.forEach(([x, z, rotation]) => {
    const sconce = new THREE.Group();
    addBox(sconce, 0.1, 0.26, 0.07, materials.blackMetal, 0, 0, 0);
    addBox(sconce, 0.07, 0.21, 0.012, lightBulbMaterials.outdoor, 0, 0, 0.04);
    sconce.position.set(x, 2.25, z);
    sconce.rotation.y = rotation;
    wallFixtures.add(sconce);
  });
  enableShadows(wallFixtures);
  wallFixtures.traverse(object => { if (object.isMesh) object.castShadow = false; });
  viewer.scene.add(wallFixtures);
  viewer.groups.wallFixtures = wallFixtures;
}

const withoutShadow = mesh => { mesh.userData.noShadow = true; return mesh; };

/** Đèn âm trần và dây đèn dưới mái hiên (thuộc nhóm mái nên chỉ thấy khi bật mái). */
export function addCeilingFixtures(roofGroup) {
  DOWNLIGHT_POSITIONS.forEach(([x, z]) => {
    withoutShadow(addCylinder(roofGroup, 0.075, 0.075, 0.014, lightBulbMaterials.indoor, x, WALL_HEIGHT - 0.006, z, 20));
    withoutShadow(addCylinder(roofGroup, 0.09, 0.09, 0.008, materials.whiteLacquer, x, WALL_HEIGHT - 0.002, z, 20));
  });
  const [startZ, endZ] = STRING_LIGHT_RANGE_Z, span = endZ - startZ;
  const sagHeightAt = (z, top) => top - 0.16 * 4 * ((z - startZ) / span) * (1 - (z - startZ) / span);
  const bulbPositions = [];
  STRING_LIGHT_LINES_X.forEach(x => { for (let z = startZ; z <= endZ; z += 0.34) bulbPositions.push([x, sagHeightAt(z, 2.86), z]); });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.032, 10, 8), lightBulbMaterials.outdoor, bulbPositions.length);
  const placement = new THREE.Object3D();
  bulbPositions.forEach((position, index) => { placement.position.set(...position); placement.updateMatrix(); bulbs.setMatrixAt(index, placement.matrix); });
  roofGroup.add(withoutShadow(bulbs));
  const wireSegments = 6, segmentLength = span / wireSegments;
  STRING_LIGHT_LINES_X.forEach(x => {
    for (let segment = 0; segment < wireSegments; segment++) {
      const fromZ = startZ + segment * segmentLength, toZ = fromZ + segmentLength;
      const fromY = sagHeightAt(fromZ, 2.89), toY = sagHeightAt(toZ, 2.89);
      const wire = withoutShadow(addBox(roofGroup, 0.006, 0.006, Math.hypot(toZ - fromZ, toY - fromY), materials.blackMetal, x, (fromY + toY) / 2, (fromZ + toZ) / 2));
      wire.rotation.x = Math.atan2(fromY - toY, toZ - fromZ);
    }
  });
}

/** Đèn trụ thấp dọc lối đi và sân. */
export function addGardenBollards(group) {
  GARDEN_BOLLARDS.forEach(([x, z]) => {
    withoutShadow(addCylinder(group, 0.05, 0.06, 0.55, materials.blackMetal, x, GROUND_LEVEL + 0.275, z, 12));
    withoutShadow(addCylinder(group, 0.07, 0.07, 0.07, lightBulbMaterials.outdoor, x, GROUND_LEVEL + 0.58, z, 16));
    withoutShadow(addCylinder(group, 0.085, 0.085, 0.02, materials.blackMetal, x, GROUND_LEVEL + 0.625, z, 16));
  });
}

/* ---------- áp dụng ---------- */
/** Trong nhà (bật mái) giảm độ phản chiếu bầu trời của vật liệu thật. */
export function applyEnvironmentIntensity() {
  if (!realisticAssets.built) return;
  const factor = displaySettings.roofVisible ? 0.35 : 1;
  forEachRealisticMaterial(material => {
    if (material.userData.baseEnvironmentIntensity != null) material.envMapIntensity = material.userData.baseEnvironmentIntensity * factor;
  });
}

export function applyLighting() {
  const { scene, sunLight, hemisphereLight, ambientLight, renderer } = viewer;
  if (!scene || !sunLight) return;
  const realistic = displaySettings.realisticMaterials && realisticAssets.built, night = displaySettings.nightMode, roofOn = displaySettings.roofVisible;

  if (night && !lightingState.nightSky) lightingState.nightSky = createNightSky(isTouchDevice ? 2048 : 4096);
  if (night && realistic && !lightingState.nightEnvironmentMap) lightingState.nightEnvironmentMap = createEnvironmentMap(lightingState.nightSky);
  scene.background = night ? lightingState.nightSky : (realistic ? realisticAssets.environmentSky : lightingState.basicSky);
  scene.environment = realistic ? (night ? lightingState.nightEnvironmentMap : realisticAssets.environmentMap) : null;
  scene.fog.color.set(night ? 0x0a1120 : (realistic ? 0xe3eaec : 0xdfe8eb));
  scene.fog.near = night ? 40 : (realistic ? 70 : 55);
  scene.fog.far = night ? 130 : (realistic ? 170 : 130);

  const lightOffset = night ? MOON_OFFSET : SUN_OFFSET;
  sunLight.position.set(SCENE_CENTER.x + lightOffset[0], lightOffset[1], SCENE_CENTER.z + lightOffset[2]);
  sunLight.color.set(night ? 0x9db2e2 : 0xfff0db);
  sunLight.intensity = night ? (realistic ? 0.3 : 0.24) : (realistic ? 2.5 : 1.65);
  hemisphereLight.color.set(night ? 0x2a3a5c : 0xeef4f8);
  hemisphereLight.groundColor.set(night ? 0x0c0e12 : (roofOn ? 0xe2dccf : 0xb3aa98));
  hemisphereLight.intensity = night ? (realistic ? 0.16 : 0.24) : (realistic ? (roofOn ? 0.5 : 0.12) : (roofOn ? 0.8 : 0.62));
  ambientLight.intensity = night ? (realistic ? 0.02 : 0.06) : (realistic ? (roofOn ? 0.06 : 0) : (roofOn ? 0.22 : 0.14));
  renderer.toneMappingExposure = night ? (realistic ? 1.2 : 1.15) : (realistic ? 0.95 : 1.08);

  if (viewer.groups.nightLights) viewer.groups.nightLights.visible = night;
  const indoorOn = night && displaySettings.indoorLightsOn, outdoorOn = night && displaySettings.outdoorLightsOn;
  lightingState.indoorLights.forEach(light => { light.intensity = indoorOn ? light.userData.baseIntensity : 0; });
  lightingState.outdoorLights.forEach(light => { light.intensity = outdoorOn ? light.userData.baseIntensity : 0; });
  if (lightBulbMaterials.indoor) lightBulbMaterials.indoor.emissiveIntensity = indoorOn ? 2.4 : 0;
  if (lightBulbMaterials.outdoor) lightBulbMaterials.outdoor.emissiveIntensity = outdoorOn ? 2.6 : 0;
  [basicMaterials.lampShade, realisticMaterials.lampShade].forEach(shade => { if (shade) shade.emissiveIntensity = indoorOn ? 1.7 : 0.25; });
  applyEnvironmentIntensity();
  getElement('#app').classList.toggle('is-night', night);
}

export function setNightMode(enabled) {
  if (!viewer.initialized) return;
  displaySettings.nightMode = enabled;
  setPressed(getElement('#day-button'), !enabled);
  setPressed(getElement('#night-button'), enabled);
  const tourCheckbox = getElement('#video-tour-night');
  if (tourCheckbox) tourCheckbox.checked = enabled;
  applyLighting();
}

export function bindLightingControls() {
  getElement('#day-button').addEventListener('click', () => setNightMode(false));
  getElement('#night-button').addEventListener('click', () => setNightMode(true));
  getElement('#indoor-lights-toggle').addEventListener('click', event => {
    displaySettings.indoorLightsOn = setPressed(event.currentTarget, !displaySettings.indoorLightsOn);
    applyLighting();
  });
  getElement('#outdoor-lights-toggle').addEventListener('click', event => {
    displaySettings.outdoorLightsOn = setPressed(event.currentTarget, !displaySettings.outdoorLightsOn);
    applyLighting();
  });
}
