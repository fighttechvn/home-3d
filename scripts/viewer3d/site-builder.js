/** Sân vườn: bãi cỏ, lối đi, đá bước, cây, bụi cây, hàng rào và đèn trụ. */
import {
  LOT_BOUNDS, TREE_PLACEMENTS, SHRUB_POSITIONS, STEPPING_STONE_POSITIONS, GROUND_LEVEL,
} from '../data/house-plan.js';
import { seededRandom, setRandomSeed } from '../core/random.js';
import { viewer, displaySettings, SCENE_CENTER } from './viewer-context.js';
import { materials, foliageMaterials } from './materials.js';
import { addBox, addCylinder, createBlobGeometry, enableShadows, disposeGroup } from './primitives.js';
import { addGardenBollards } from './lighting.js';

/** Phần tĩnh (không đổi khi đổi vật liệu): bãi cỏ, lối đi trước nhà, đá bước. */
export function addSiteGround(group) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 100), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SCENE_CENTER.x, GROUND_LEVEL, SCENE_CENTER.z);
  const groundUv = ground.geometry.attributes.uv;
  for (let index = 0; index < groundUv.count; index++) groundUv.setXY(index, groundUv.getX(index) * 90, groundUv.getY(index) * 100);
  group.add(ground);
  addBox(group, 1.4, 0.02, 7.9, materials.porchStone, 6.05, GROUND_LEVEL + 0.01, 23.55);
  STEPPING_STONE_POSITIONS.forEach(([x, z]) => {
    const stone = addCylinder(group, 0.3, 0.3, 0.05, materials.steppingStone, x, GROUND_LEVEL + 0.02, z, 20);
    stone.scale.set(1, 1, 0.78);
    stone.rotation.y = seededRandom() * 3;
  });
}

function addTree(group, x, z, scale) {
  const tree = new THREE.Group(), foliage = foliageMaterials(), realistic = displaySettings.realisticMaterials;
  addCylinder(tree, 0.1 * scale, 0.15 * scale, 2.2 * scale, materials.bark, 0, 1.1 * scale + GROUND_LEVEL, 0, realistic ? 16 : 10);
  if (realistic) {
    for (let branch = 0; branch < 3; branch++) {
      const limb = addCylinder(tree, 0.03 * scale, 0.065 * scale, 1.2 * scale, materials.bark, 0, (1.85 + branch * 0.3) * scale + GROUND_LEVEL, 0, 8);
      limb.rotation.set(0, seededRandom() * 6.3, 0.55 + seededRandom() * 0.4);
      limb.translateY(0.5 * scale);
    }
    for (let clump = 0; clump < 7; clump++) {
      const canopy = new THREE.Mesh(createBlobGeometry((0.72 + seededRandom() * 0.5) * scale, 0.26), foliage[clump % 3]);
      canopy.position.set((seededRandom() - 0.5) * 1.7 * scale, (2.3 + seededRandom() * 1.3) * scale + GROUND_LEVEL, (seededRandom() - 0.5) * 1.7 * scale);
      canopy.rotation.set(seededRandom() * 3, seededRandom() * 3, seededRandom() * 3);
      tree.add(canopy);
    }
  } else {
    for (let clump = 0; clump < 4; clump++) {
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + seededRandom() * 0.6) * scale, 1), foliage[clump % 3]);
      canopy.position.set((seededRandom() - 0.5) * 1.4 * scale, (2.4 + seededRandom() * 1.1) * scale + GROUND_LEVEL, (seededRandom() - 0.5) * 1.4 * scale);
      tree.add(canopy);
    }
  }
  tree.position.set(x, 0, z);
  group.add(tree);
}

function addShrub(group, x, z, scale) {
  const foliage = foliageMaterials();
  if (displaySettings.realisticMaterials) {
    for (let clump = 0; clump < 3; clump++) {
      const bush = new THREE.Mesh(createBlobGeometry(0.42 * scale * (0.8 + seededRandom() * 0.4), 0.25, 18, 12), foliage[Math.floor(seededRandom() * 3)]);
      bush.position.set(x + (seededRandom() - 0.5) * 0.5 * scale, GROUND_LEVEL + 0.3 * scale, z + (seededRandom() - 0.5) * 0.5 * scale);
      bush.scale.y = 0.75;
      group.add(bush);
    }
    return;
  }
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * scale, 1), foliage[Math.floor(seededRandom() * 3)]);
  bush.position.set(x, GROUND_LEVEL + 0.35 * scale, z);
  bush.scale.y = 0.7;
  group.add(bush);
}

/** Hàng rào gỗ sơn trắng quanh khu đất, chừa lối vào trước nhà. */
function addPicketFence(group) {
  const picketPositions = [];
  const addFenceRun = (fromX, fromZ, toX, toZ) => {
    const runLength = Math.hypot(toX - fromX, toZ - fromZ), picketCount = Math.floor(runLength / 0.16);
    for (let picket = 0; picket <= picketCount; picket++) {
      const progress = picket / picketCount;
      picketPositions.push([fromX + (toX - fromX) * progress, fromZ + (toZ - fromZ) * progress]);
    }
    const railWidth = Math.abs(toX - fromX) || 0.04, railDepth = Math.abs(toZ - fromZ) || 0.04;
    addBox(group, railWidth, 0.05, railDepth, materials.fencePaint, (fromX + toX) / 2, 0.25, (fromZ + toZ) / 2);
    addBox(group, railWidth, 0.05, railDepth, materials.fencePaint, (fromX + toX) / 2, 0.62, (fromZ + toZ) / 2);
  };
  const { minX, maxX, minZ, maxZ } = LOT_BOUNDS;
  addFenceRun(minX, minZ, maxX, minZ);
  addFenceRun(maxX, minZ, maxX, maxZ);
  addFenceRun(minX, minZ, minX, maxZ);
  addFenceRun(minX, maxZ, 5.2, maxZ);
  addFenceRun(6.9, maxZ, maxX, maxZ);
  const pickets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 1.1, 0.03), materials.fencePaint, picketPositions.length);
  const placement = new THREE.Object3D();
  picketPositions.forEach(([x, z], index) => {
    placement.position.set(x, 0.23, z);
    placement.rotation.y = Math.abs(x - minX) < 0.01 || Math.abs(x - maxX) < 0.01 ? Math.PI / 2 : 0;
    placement.updateMatrix();
    pickets.setMatrixAt(index, placement.matrix);
  });
  group.add(pickets);
}

/** Phần dựng lại khi đổi vật liệu: cây, bụi, hàng rào, đèn trụ. */
export function buildLandscape() {
  disposeGroup(viewer.groups.landscape);
  setRandomSeed(11); // cùng hạt giống để cây giữ nguyên dáng giữa các lần dựng
  const landscape = new THREE.Group();
  TREE_PLACEMENTS.forEach(([x, z, scale]) => addTree(landscape, x, z, scale));
  SHRUB_POSITIONS.forEach(([x, z]) => addShrub(landscape, x, z, 0.8 + seededRandom() * 0.6));
  addPicketFence(landscape);
  addGardenBollards(landscape);
  enableShadows(landscape);
  viewer.scene.add(landscape);
  viewer.groups.landscape = landscape;
}
