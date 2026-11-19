/**
 * Mô hình 3D của từng loại đồ. Toạ độ cục bộ: x theo chiều rộng, z theo chiều sâu, mặt trước hướng +z.
 * Mô hình được đặt vào vị trí và góc xoay của món đồ ở cuối hàm.
 */
import { WALL_HEIGHT, floorHeightAt } from '../data/house-plan.js';
import { WALL_MOUNTED_TYPES } from '../data/furniture-catalog.js';
import { seededRandom } from '../core/random.js';
import { materials, foliageMaterials } from './materials.js';
import { displaySettings } from './viewer-context.js';
import { addBox, addCylinder, extrudePlanShape, roundedRectangleShape, createBlobGeometry } from './primitives.js';

function placeModel(group, item) {
  group.position.set(item.center[0], floorHeightAt(item.center[0], item.center[1]) + 0.02, item.center[1]);
  group.rotation.y = -(item.rotation || 0) * Math.PI / 180;
  group.userData.wallMounted = WALL_MOUNTED_TYPES.has(item.type);
  return group;
}

function addDeskFrame(group, width, depth) {
  addBox(group, width, 0.04, depth, materials.oak, 0, 0.74, 0);
  addBox(group, 0.04, 0.72, depth - 0.04, materials.whiteLacquer, -width / 2 + 0.03, 0.36, 0);
  addBox(group, 0.04, 0.72, depth - 0.04, materials.whiteLacquer, width / 2 - 0.03, 0.36, 0);
}

function addMonitor(group, x, depth) {
  addBox(group, 0.52, 0.32, 0.025, materials.screen, x, 1.0, -depth / 2 + 0.12);
  addBox(group, 0.04, 0.2, 0.04, materials.blackMetal, x, 0.85, -depth / 2 + 0.1);
}

function addPlantFoliage(group, scale) {
  const foliage = foliageMaterials();
  if (displaySettings.realisticMaterials) {
    for (let clump = 0; clump < 6; clump++) {
      const mesh = new THREE.Mesh(createBlobGeometry(0.2 * scale * (0.8 + seededRandom() * 0.5), 0.24, 16, 12), foliage[clump % 3]);
      mesh.position.set((seededRandom() - 0.5) * 0.32 * scale, (0.62 + clump * 0.13) * scale, (seededRandom() - 0.5) * 0.32 * scale);
      mesh.rotation.set(seededRandom() * 3, seededRandom() * 3, 0);
      group.add(mesh);
    }
  } else {
    for (let clump = 0; clump < 5; clump++) {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 * scale * (0.8 + seededRandom() * 0.5), 0), foliage[clump % 3]);
      mesh.position.set((seededRandom() - 0.5) * 0.3 * scale, (0.6 + clump * 0.16) * scale, (seededRandom() - 0.5) * 0.3 * scale);
      mesh.rotation.set(seededRandom() * 3, seededRandom() * 3, 0);
      group.add(mesh);
    }
  }
}

const MODEL_BUILDERS = {
  bed(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.14, depth - 0.04, m.oak, 0, 0.17, 0.02);                 // bệ giường
    addBox(group, width - 0.3, 0.1, depth - 0.35, m.darkTrim, 0, 0.05, 0.05);       // chân lõm tạo cảm giác bệ nổi
    addBox(group, width - 0.16, 0.22, depth - 0.2, m.linen, 0, 0.35, 0.06);          // nệm
    addBox(group, width, 0.8, 0.06, m.oak, 0, 0.5, -depth / 2 + 0.03);               // đầu giường
    const pillowWidth = (width - 0.16) / 2 - 0.08;
    addBox(group, pillowWidth, 0.12, 0.34, m.whiteLacquer, -(width - 0.16) / 4, 0.52, -depth / 2 + 0.3);
    addBox(group, pillowWidth, 0.12, 0.34, m.whiteLacquer, (width - 0.16) / 4, 0.52, -depth / 2 + 0.3);
    const duvetLength = (depth - 0.2) * 0.6;
    addBox(group, width - 0.12, 0.05, duvetLength, m.stripedBedding, 0, 0.485, depth / 2 - 0.04 - duvetLength / 2);
  },
  nightstand(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.42, depth, m.oak, 0, 0.21, 0);
    addCylinder(group, 0.07, 0.09, 0.05, m.whiteLacquer, 0, 0.445, 0);
    addCylinder(group, 0.012, 0.012, 0.22, m.blackMetal, 0, 0.58, 0);
    addCylinder(group, 0.1, 0.13, 0.16, m.lampShade, 0, 0.74, 0);
  },
  lowCabinet(group, width, depth) { addBox(group, width, 0.55, depth, materials.oak, 0, 0.275, 0); },
  shoeCabinet(group, width, depth) {
    addBox(group, width, 0.9, depth, materials.oak, 0, 0.55, 0);
    addBox(group, width - 0.04, 0.08, depth - 0.04, materials.darkTrim, 0, 0.06, 0);
  },
  pantry(group, width, depth) {
    addBox(group, width, 2.3, depth, materials.whiteLacquer, 0, 1.15, 0);
    addBox(group, 0.006, 2.2, 0.01, materials.darkTrim, 0, 1.15, depth / 2);
  },
  wardrobe(group, width, depth) {
    const m = materials;
    addBox(group, width, 2.45, depth, m.whiteLacquer, 0, 1.225, 0);
    const doorCount = Math.max(2, Math.round(width / 0.55));
    for (let door = 1; door < doorCount; door++) addBox(group, 0.008, 2.35, 0.01, m.darkTrim, -width / 2 + (door * width) / doorCount, 1.225, depth / 2 + 0.003);
    for (let door = 0; door < doorCount; door++) {
      const handleX = -width / 2 + ((door + 0.5) * width) / doorCount + (door % 2 ? -0.1 : 0.1);
      addBox(group, 0.02, 0.4, 0.02, m.darkOak, handleX, 1.1, depth / 2 + 0.015);
    }
  },
  desk(group, width, depth, item) {
    addDeskFrame(group, width, depth);
    if (item.hasMonitor) addMonitor(group, 0, depth);
    else addBox(group, 0.32, 0.02, 0.22, materials.steel, 0, 0.77, 0); // máy tính xách tay
  },
  workDesk(group, width, depth) {
    addDeskFrame(group, width, depth);
    addMonitor(group, -0.4, depth);
    addMonitor(group, 0.4, depth);
  },
  chair(group) {
    const oak = materials.oak;
    addBox(group, 0.44, 0.045, 0.42, oak, 0, 0.45, 0.01);
    [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.18], [0.18, 0.18]].forEach(([x, z]) => addBox(group, 0.035, 0.45, 0.035, oak, x, 0.225, z));
    addBox(group, 0.42, 0.12, 0.03, oak, 0, 0.76, -0.19);
    addBox(group, 0.03, 0.3, 0.03, oak, -0.18, 0.62, -0.19);
    addBox(group, 0.03, 0.3, 0.03, oak, 0.18, 0.62, -0.19);
  },
  diningTable(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.045, depth, m.oak, 0, 0.74, 0);
    [-1, 1].forEach(side => {
      const legZ = side * (depth / 2 - 0.18);
      addBox(group, width - 0.2, 0.04, 0.05, m.blackMetal, 0, 0.03, legZ);
      addBox(group, 0.05, 0.7, 0.05, m.blackMetal, -(width / 2 - 0.12), 0.37, legZ);
      addBox(group, 0.05, 0.7, 0.05, m.blackMetal, width / 2 - 0.12, 0.37, legZ);
    });
  },
  sofa(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.08, depth - 0.06, m.darkTrim, 0, 0.04, 0);
    addBox(group, width, 0.32, depth, m.sofaFabric, 0, 0.24, 0);
    addBox(group, width - 0.04, 0.48, 0.2, m.sofaFabric, 0, 0.62, -depth / 2 + 0.1);
    addBox(group, 0.16, 0.22, depth, m.sofaFabric, -width / 2 + 0.08, 0.5, 0);
    addBox(group, 0.16, 0.22, depth, m.sofaFabric, width / 2 - 0.08, 0.5, 0);
    const cushionCount = 4, cushionWidth = (width - 0.32) / cushionCount;
    for (let cushion = 0; cushion < cushionCount; cushion++) addBox(group, cushionWidth - 0.02, 0.1, depth - 0.24, m.boucle, -width / 2 + 0.16 + cushionWidth * (cushion + 0.5), 0.45, 0.1);
    [[-0.5, 0x7f8f7a], [0.5, 0xb98a5a]].forEach(([x, color]) => {
      const throwPillow = addBox(group, 0.42, 0.38, 0.12, m.darkOak.clone(), x, 0.7, -depth / 2 + 0.26);
      throwPillow.material.color.set(color);
    });
  },
  loveseat(group, width, depth) {
    const m = materials;
    extrudePlanShape(group, roundedRectangleShape(-width / 2 + 0.08, -depth / 2 + 0.08, width - 0.16, depth - 0.16, 0.25), 0, 0.06, m.darkTrim);
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, depth, 0.3), 0.06, 0.34, m.boucle);
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, 0.28, 0.14), 0.4, 0.38, m.boucle);
    extrudePlanShape(group, roundedRectangleShape(-width / 2 + 0.06, -depth / 2 + 0.28, width - 0.12, depth - 0.34, 0.2), 0.4, 0.1, m.boucle);
  },
  roundTable(group, width, depth, item) {
    const m = materials, height = item.height || 0.45, topMaterial = item.topFinish === 'white' ? m.whiteLacquer : m.oak;
    addCylinder(group, width / 2, width / 2, 0.035, topMaterial, 0, height - 0.018, 0, 40);
    addCylinder(group, 0.04, 0.04, height - 0.03, m.blackMetal, 0, (height - 0.03) / 2, 0);
    addCylinder(group, width * 0.28, width * 0.28, 0.02, m.blackMetal, 0, 0.01, 0, 32);
  },
  barStool(group, width, depth, item) {
    const m = materials, height = item.height || 0.65;
    addCylinder(group, width / 2, width / 2, 0.05, m.oak, 0, height, 0);
    addCylinder(group, 0.025, 0.025, height, m.blackMetal, 0, height / 2, 0);
    addCylinder(group, 0.18, 0.18, 0.02, m.blackMetal, 0, 0.01, 0);
  },
  plant(group, width, depth, item) {
    const scale = item.plantScale || 1;
    addCylinder(group, 0.2 * scale, 0.15 * scale, 0.42 * scale, materials.ceramicPot, 0, 0.21 * scale, 0);
    addPlantFoliage(group, scale);
    addCylinder(group, 0.02 * scale, 0.025 * scale, 0.5 * scale, materials.bark, 0, 0.55 * scale, 0, 8);
  },
  floorLamp(group) {
    addCylinder(group, 0.15, 0.17, 0.03, materials.blackMetal, 0, 0.015, 0);
    addCylinder(group, 0.012, 0.012, 1.45, materials.blackMetal, 0, 0.74, 0);
    addCylinder(group, 0.17, 0.2, 0.28, materials.lampShade, 0, 1.55, 0, 32);
  },
  rug(group, width, depth) { addBox(group, width, 0.012, depth, materials.rugWool, 0, 0.006, 0); },
  fridge(group, width, depth) {
    const m = materials;
    addBox(group, width, 1.85, depth, m.fridgeSteel, 0, 0.925, 0);
    addBox(group, width + 0.002, 0.008, 0.004, m.darkTrim, 0, 1.22, depth / 2);
    addBox(group, 0.025, 0.5, 0.03, m.darkTrim, width / 2 - 0.08, 1.5, depth / 2 + 0.02);
    addBox(group, 0.025, 0.4, 0.03, m.darkTrim, width / 2 - 0.08, 0.9, depth / 2 + 0.02);
  },
  kitchenCounter(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.1, depth - 0.08, m.darkTrim, 0, 0.05, -0.03);
    addBox(group, width, 0.76, depth - 0.02, m.whiteLacquer, 0, 0.48, -0.01);
    addBox(group, width, 0.04, depth, m.countertopStone, 0, 0.88, 0);
    for (let x = -width / 2 + 0.6; x < width / 2 - 0.1; x += 0.6) addBox(group, 0.006, 0.7, 0.01, m.darkTrim, x, 0.48, depth / 2 - 0.01);
  },
  sink(group, width, depth) {
    const steel = materials.steel;
    addBox(group, width - 0.1, 0.012, depth - 0.12, steel, 0, 0.905, 0);
    addCylinder(group, 0.015, 0.015, 0.3, steel, 0, 1.05, -depth / 2 + 0.04, 12);
    addBox(group, 0.022, 0.022, 0.16, steel, 0, 1.19, -depth / 2 + 0.11);
  },
  cooktop(group, width, depth) { addBox(group, width, 0.012, depth, materials.blackMetal, 0, 0.906, 0); },
  kitchenIsland(group, width, depth) {
    const m = materials;
    extrudePlanShape(group, roundedRectangleShape(-width / 2 + 0.05, -depth / 2 + 0.05, width - 0.1, depth - 0.1, width / 2 - 0.05), 0, 0.1, m.darkTrim);
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, depth, width / 2), 0.1, 0.8, m.whiteLacquer, 24);
    extrudePlanShape(group, roundedRectangleShape(-width / 2 - 0.03, -depth / 2 - 0.03, width + 0.06, depth + 0.06, width / 2 + 0.03), 0.9, 0.045, m.oak, 24);
  },
  toilet(group, width, depth) {
    const bowl = addCylinder(group, 0.18, 0.15, 0.4, materials.whiteLacquer, 0, 0.2, 0.08, 24);
    bowl.scale.z = 1.35;
    addBox(group, width - 0.04, 0.38, 0.18, materials.whiteLacquer, 0, 0.6, -depth / 2 + 0.09);
  },
  washbasin(group, width, depth) {
    const m = materials;
    addBox(group, width, 0.08, depth, m.oak, 0, 0.8, 0);
    const basin = addCylinder(group, 0.2, 0.15, 0.13, m.whiteLacquer, 0, 0.905, 0.02, 28);
    basin.scale.z = 0.72;
    addCylinder(group, 0.012, 0.012, 0.22, m.steel, 0, 0.95, -depth / 2 + 0.05, 10);
    addBox(group, 0.55, 0.75, 0.02, m.mirror, 0, 1.6, -depth / 2 + 0.01);
  },
  shower(group) {
    const steel = materials.steel;
    addCylinder(group, 0.12, 0.12, 0.015, steel, 0, 2.15, 0.05, 24);
    addBox(group, 0.02, 0.02, 0.18, steel, 0, 2.17, -0.04);
    addBox(group, 0.02, 1.2, 0.02, steel, 0, 1.5, -0.14);
  },
  showerGlass(group, width, depth, item) {
    const height = item.height || 2;
    addBox(group, width, height, 0.012, materials.glass, 0, height / 2, 0).userData.noShadow = true;
    addBox(group, width, 0.025, 0.03, materials.blackMetal, 0, height, 0);
    addBox(group, 0.025, height, 0.03, materials.blackMetal, -width / 2, height / 2, 0);
  },
  tvConsole(group, width, depth) {
    addBox(group, width, 0.38, depth, materials.oak, 0, 0.3, 0);
    addBox(group, width - 0.1, 0.11, depth - 0.06, materials.darkTrim, 0, 0.055, 0);
  },
  tv(group, width, depth, item) { addBox(group, width, 0.83, 0.04, materials.screen, 0, item.mountHeight || 1.3, 0); },
  painting(group, width, depth, item) {
    const height = item.height || 1.2, centerHeight = item.mountHeight || 2;
    addBox(group, width, height, 0.03, materials.blackMetal, 0, centerHeight, 0);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.06, height - 0.06), materials.paintingCanvas);
    canvas.position.set(0, centerHeight, 0.017);
    group.add(canvas);
  },
  pendantLamp(group, width) {
    const m = materials;
    addBox(group, width, 0.05, 0.07, m.oak, 0, 2.3, 0);
    [-0.6, 0.6].forEach(position => addBox(group, 0.004, WALL_HEIGHT - 2.33, 0.004, m.blackMetal, (position * width) / 1.5, (2.33 + WALL_HEIGHT) / 2, 0));
    addBox(group, width - 0.1, 0.008, 0.04, m.lampShade, 0, 2.272, 0);
  },
  armchair(group, width, depth) {
    const m = materials;
    addBox(group, width - 0.04, 0.08, depth - 0.1, m.darkTrim, 0, 0.04, 0);
    addBox(group, width, 0.3, depth, m.sofaFabric, 0, 0.23, 0);
    addBox(group, width - 0.28, 0.1, depth - 0.22, m.boucle, 0, 0.43, 0.08);
    addBox(group, width, 0.42, 0.18, m.sofaFabric, 0, 0.59, -depth / 2 + 0.09);
    addBox(group, 0.14, 0.2, depth, m.sofaFabric, -width / 2 + 0.07, 0.48, 0);
    addBox(group, 0.14, 0.2, depth, m.sofaFabric, width / 2 - 0.07, 0.48, 0);
  },
  bookshelf(group, width, depth) {
    const m = materials, height = 1.9, shelfCount = 5;
    addBox(group, 0.03, height, depth, m.oak, -width / 2 + 0.015, height / 2, 0);
    addBox(group, 0.03, height, depth, m.oak, width / 2 - 0.015, height / 2, 0);
    addBox(group, width, height, 0.015, m.whiteLacquer, 0, height / 2, -depth / 2 + 0.008);
    for (let shelf = 0; shelf <= shelfCount; shelf++) addBox(group, width, 0.025, depth, m.oak, 0, 0.0125 + (shelf * (height - 0.025)) / shelfCount, 0);
    for (let shelf = 0; shelf < shelfCount; shelf++) {
      let x = -width / 2 + 0.05;
      const shelfTop = 0.025 + (shelf * (height - 0.025)) / shelfCount;
      while (x < width / 2 - 0.08) {
        const bookWidth = 0.025 + seededRandom() * 0.035, bookHeight = 0.18 + seededRandom() * 0.12;
        const cover = m.bookCovers[Math.floor(seededRandom() * m.bookCovers.length)];
        addBox(group, bookWidth, bookHeight, depth * 0.75, cover, x + bookWidth / 2, shelfTop + bookHeight / 2, 0.01);
        x += bookWidth + 0.004;
        if (seededRandom() < 0.08) x += 0.08;
      }
    }
  },
  dresser(group, width, depth) {
    const m = materials;
    addBox(group, width - 0.06, 0.05, depth - 0.06, m.darkTrim, 0, 0.025, 0);
    addBox(group, width, 0.76, depth, m.oak, 0, 0.43, 0);
    for (let drawer = 1; drawer < 3; drawer++) addBox(group, width - 0.04, 0.006, 0.01, m.darkTrim, 0, 0.05 + drawer * 0.253, depth / 2);
  },
  bathtub(group, width, depth) {
    const m = materials;
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, depth, 0.12), 0, 0.56, m.whiteLacquer, 20);
    extrudePlanShape(group, roundedRectangleShape(-width / 2 + 0.07, -depth / 2 + 0.07, width - 0.14, depth - 0.14, 0.22), 0.5, 0.065, m.water, 20);
    addCylinder(group, 0.015, 0.015, 0.2, m.steel, 0, 0.66, -depth / 2 + 0.05, 10);
  },
  bench(group, width, depth) {
    const m = materials;
    for (let slat = 0; slat < 3; slat++) addBox(group, width, 0.035, depth / 3 - 0.02, m.oak, 0, 0.44, -depth / 3 + (slat * depth) / 3);
    [-1, 1].forEach(side => addBox(group, 0.05, 0.42, depth - 0.06, m.blackMetal, side * (width / 2 - 0.16), 0.21, 0));
  },
  loungeChair(group, width, depth) {
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, depth, 0.3), 0, 0.32, materials.terracottaFabric);
    extrudePlanShape(group, roundedRectangleShape(-width / 2, -depth / 2, width, 0.3, 0.15), 0.32, 0.42, materials.terracottaFabric);
  },
};

export function buildFurnitureModel(item) {
  const group = new THREE.Group(), [width, depth] = item.size;
  const builder = MODEL_BUILDERS[item.type];
  if (builder) builder(group, width, depth, item);
  return placeModel(group, item);
}
