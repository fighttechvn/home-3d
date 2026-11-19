/** Dựng ngôi nhà: nền móng và sàn, tường có cửa đi / cửa sổ / cửa kính xếp, mái và mái hiên. */
import {
  WALL_HEIGHT, CUT_WALL_HEIGHT, ROOMS, FOLDING_DOOR_PANELS, GROUND_LEVEL,
} from '../data/house-plan.js';
import { wallSegments, wallArcs, wallFillets, getSolidIntervals } from '../model/wall-geometry.js';
import { subtractVectors, addVectors, scaleVector, vectorLength, normalizeVector } from '../core/geometry.js';
import { viewer, displaySettings } from './viewer-context.js';
import { materials, floorMaterialForFinish } from './materials.js';
import {
  addBox, applyBoxWorldUv, extrudePlanShape, polygonToShape, enableShadows, disposeGroup,
} from './primitives.js';
import { addCeilingFixtures } from './lighting.js';

/* ---------- nền móng, sàn, bậc tam cấp ---------- */
export function buildHouseBase() {
  const base = new THREE.Group();
  addBox(base, 7.1, 0.32, 19.4, materials.concrete, 3.5, -0.16, 9.65);
  ROOMS.forEach(room => {
    if (room.floor === 'deck') extrudePlanShape(base, polygonToShape(room.outline), GROUND_LEVEL, 0.24, materials.deckWood);
    else extrudePlanShape(base, polygonToShape(room.outline), 0, 0.02, floorMaterialForFinish(room.floor));
  });
  addBox(base, 1.8, 0.17, 0.32, materials.steppingStone, 6.05, -0.145, 19.42);
  addBox(base, 1.8, 0.12, 0.3, materials.steppingStone, 6.05, -0.26, 19.72);
  return base;
}

/* ---------- tường ---------- */
/** Nhóm có trục x chạy dọc đoạn tường, gốc ở đầu đoạn. */
function createSegmentGroup(segment) {
  const group = new THREE.Group();
  group.position.set(segment.start[0], 0, segment.start[1]);
  group.rotation.y = -Math.atan2(segment.direction[1], segment.direction[0]);
  return group;
}

/** Khối tường từ fromDistance tới toDistance dọc đoạn, cao từ bottom tới top. Mặt trên tô màu thẫm như mặt cắt. */
function addWallBlock(group, fromDistance, toDistance, bottom, top, thickness) {
  if (top - bottom < 1e-3 || toDistance - fromDistance < 1e-3) return;
  const length = toDistance - fromDistance, height = top - bottom;
  const faceMaterials = [materials.wall, materials.wall, materials.wallCap, materials.wall, materials.wall, materials.wall];
  const mesh = new THREE.Mesh(applyBoxWorldUv(new THREE.BoxGeometry(length, height, thickness), length, height, thickness), faceMaterials);
  mesh.position.set((fromDistance + toDistance) / 2, (bottom + top) / 2, 0);
  group.add(mesh);
}

/** Phần tường phía trên một lỗ vòm. */
function addArchLintel(group, fromDistance, toDistance, springHeight, top, thickness) {
  const radius = (toDistance - fromDistance) / 2, centerDistance = (fromDistance + toDistance) / 2, shape = new THREE.Shape();
  shape.moveTo(fromDistance, top);
  shape.lineTo(fromDistance, springHeight);
  shape.absarc(centerDistance, springHeight, radius, Math.PI, 0, true);
  shape.lineTo(toDistance, top);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  geometry.translate(0, 0, -thickness / 2);
  group.add(new THREE.Mesh(geometry, [materials.wall, materials.wall]));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(toDistance - fromDistance, 0.001, thickness), materials.wallCap);
  cap.position.set(centerDistance, top, 0);
  group.add(cap);
}

/** Khung nhôm đen và kính cho cửa sổ hoặc cánh cửa kính. */
export function addGlazedFrame(group, fromDistance, toDistance, bottom, top, wallThickness, mullionSpacing = 1.25) {
  const frameWidth = 0.05, frameDepth = Math.min(0.07, wallThickness * 0.6), width = toDistance - fromDistance, centerDistance = (fromDistance + toDistance) / 2;
  const addBar = (x, y, barWidth, barHeight) => addBox(group, barWidth, barHeight, frameDepth, materials.blackMetal, x, y, 0);
  addBar(fromDistance + frameWidth / 2, (bottom + top) / 2, frameWidth, top - bottom);
  addBar(toDistance - frameWidth / 2, (bottom + top) / 2, frameWidth, top - bottom);
  addBar(centerDistance, bottom + frameWidth / 2, width, frameWidth);
  addBar(centerDistance, top - frameWidth / 2, width, frameWidth);
  const paneCount = Math.max(1, Math.round(width / mullionSpacing));
  for (let pane = 1; pane < paneCount; pane++) addBar(fromDistance + (pane * width) / paneCount, (bottom + top) / 2, 0.04, top - bottom);
  const glassPane = addBox(group, width - frameWidth, top - bottom - frameWidth, 0.012, materials.glass, centerDistance, (bottom + top) / 2, 0);
  glassPane.userData.noShadow = true;
}

function buildDoorLeaf(opening) {
  const leafWidth = vectorLength(subtractVectors(opening.end, opening.start)) - 0.02, leafHeight = opening.topHeight - 0.01;
  const leaf = new THREE.Group();
  if (opening.style === 'glass') {
    const frameWidth = 0.06, black = materials.blackMetal;
    addBox(leaf, frameWidth, leafHeight, 0.05, black, frameWidth / 2, leafHeight / 2, 0);
    addBox(leaf, frameWidth, leafHeight, 0.05, black, leafWidth - frameWidth / 2, leafHeight / 2, 0);
    addBox(leaf, leafWidth, frameWidth, 0.05, black, leafWidth / 2, frameWidth / 2, 0);
    addBox(leaf, leafWidth, frameWidth, 0.05, black, leafWidth / 2, leafHeight - frameWidth / 2, 0);
    addBox(leaf, leafWidth, 0.03, 0.05, black, leafWidth / 2, 1.0, 0);
    addBox(leaf, leafWidth - frameWidth, leafHeight - frameWidth, 0.012, materials.glass, leafWidth / 2, leafHeight / 2, 0).userData.noShadow = true;
  } else if (opening.arched) {
    const radius = leafWidth / 2, springHeight = leafHeight - radius, shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(leafWidth, 0); shape.lineTo(leafWidth, springHeight);
    shape.absarc(radius, springHeight, radius, 0, Math.PI, false); shape.lineTo(0, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 24 });
    geometry.translate(0, 0, -0.02);
    leaf.add(new THREE.Mesh(geometry, materials.oak));
    addBox(leaf, 0.02, 0.02, 0.1, materials.blackMetal, leafWidth - 0.08, 1.0, 0);
  } else {
    const isMainDoor = opening.style === 'main';
    addBox(leaf, leafWidth, leafHeight, 0.045, isMainDoor ? materials.darkOak : materials.oak, leafWidth / 2, leafHeight / 2, 0);
    if (isMainDoor) {
      for (let groove = 1; groove < 5; groove++) addBox(leaf, 0.006, leafHeight - 0.2, 0.05, materials.darkTrim, (groove * leafWidth) / 5, leafHeight / 2, 0);
      addBox(leaf, 0.03, 0.9, 0.03, materials.steel, leafWidth - 0.1, 1.1, 0.05);
    } else {
      addBox(leaf, 0.02, 0.02, 0.1, materials.blackMetal, leafWidth - 0.08, 1.0, 0);
    }
  }
  const closedDirection = normalizeVector(subtractVectors(opening.end, opening.start));
  const openAngle = ((opening.openAngleDegrees || 0) * Math.PI) / 180;
  const leafDirection = addVectors(scaleVector(closedDirection, Math.cos(openAngle)), scaleVector(opening.swingDirection, Math.sin(openAngle)));
  leaf.position.set(opening.start[0] + closedDirection[0] * 0.01, 0, opening.start[1] + closedDirection[1] * 0.01);
  leaf.rotation.y = -Math.atan2(leafDirection[1], leafDirection[0]);
  return leaf;
}

function addCurvedWalls(root, wallTop) {
  for (const arc of wallArcs) {
    const outerRadius = arc.radius + arc.thickness / 2, innerRadius = arc.radius - arc.thickness / 2, shape = new THREE.Shape();
    shape.moveTo(arc.center[0] + outerRadius * Math.cos(arc.startAngle), arc.center[1] + outerRadius * Math.sin(arc.startAngle));
    shape.absarc(arc.center[0], arc.center[1], outerRadius, arc.startAngle, arc.endAngle, !arc.counterClockwise);
    shape.lineTo(arc.center[0] + innerRadius * Math.cos(arc.endAngle), arc.center[1] + innerRadius * Math.sin(arc.endAngle));
    shape.absarc(arc.center[0], arc.center[1], innerRadius, arc.endAngle, arc.startAngle, arc.counterClockwise);
    shape.closePath();
    extrudePlanShape(root, shape, 0, wallTop, materials.wall, 20).material = [materials.wallCap, materials.wall];
  }
  for (const fillet of wallFillets) {
    const shape = new THREE.Shape();
    shape.moveTo(fillet.corner[0], fillet.corner[1]);
    shape.lineTo(fillet.edgePointAlongX[0], fillet.edgePointAlongX[1]);
    shape.absarc(fillet.arcCenter[0], fillet.arcCenter[1], fillet.radius, fillet.startAngle, fillet.endAngle, !fillet.counterClockwise);
    shape.closePath();
    extrudePlanShape(root, shape, 0, wallTop, materials.wall, 20).material = [materials.wallCap, materials.wall];
  }
}

function addFoldingDoorPanels(root, wallTop) {
  const panels = new THREE.Group();
  FOLDING_DOOR_PANELS.forEach(panelPoints => {
    for (let index = 0; index < panelPoints.length - 1; index++) {
      const from = panelPoints[index], to = panelPoints[index + 1], direction = normalizeVector(subtractVectors(to, from));
      const panel = new THREE.Group();
      panel.position.set(from[0], 0, from[1]);
      panel.rotation.y = -Math.atan2(direction[1], direction[0]);
      addGlazedFrame(panel, 0.01, vectorLength(subtractVectors(to, from)) - 0.01, 0, Math.min(2.84, wallTop), 0.06, 5);
      panels.add(panel);
    }
  });
  root.add(panels);
}

/** Dựng (lại) toàn bộ tường theo cài đặt "cắt tường". */
export function buildWalls() {
  disposeGroup(viewer.groups.walls);
  const root = new THREE.Group(), wallTop = displaySettings.cutWalls ? CUT_WALL_HEIGHT : WALL_HEIGHT;
  for (const segment of wallSegments) {
    const segmentGroup = createSegmentGroup(segment);
    for (const [fromDistance, toDistance] of getSolidIntervals(segment)) addWallBlock(segmentGroup, fromDistance, toDistance, 0, wallTop, segment.thickness);
    for (const opening of segment.openings) {
      const openingTop = opening.topHeight || WALL_HEIGHT, sillHeight = opening.kind === 'window' ? opening.sillHeight : 0;
      if (sillHeight > 0) addWallBlock(segmentGroup, opening.fromDistance, opening.toDistance, 0, Math.min(sillHeight, wallTop), segment.thickness);
      if (openingTop < wallTop - 1e-3) {
        if (opening.arched) addArchLintel(segmentGroup, opening.fromDistance, opening.toDistance, openingTop - (opening.toDistance - opening.fromDistance) / 2, wallTop, segment.thickness);
        else addWallBlock(segmentGroup, opening.fromDistance, opening.toDistance, openingTop, wallTop, segment.thickness);
      }
      if (opening.kind === 'window' && sillHeight < wallTop) addGlazedFrame(segmentGroup, opening.fromDistance, opening.toDistance, sillHeight, Math.min(openingTop, wallTop), segment.thickness);
      if (opening.kind === 'door' && !displaySettings.cutWalls) root.add(buildDoorLeaf(opening));
    }
    root.add(segmentGroup);
  }
  addCurvedWalls(root, wallTop);
  addFoldingDoorPanels(root, wallTop);
  enableShadows(root);
  viewer.scene.add(root);
  viewer.groups.walls = root;
}

/* ---------- mái ---------- */
export function buildRoof() {
  const roof = new THREE.Group();
  addBox(roof, 7.7, 0.28, 20.0, materials.roofSlab, 3.5, WALL_HEIGHT + 0.14, 9.65);
  addBox(roof, 7.74, 0.06, 20.04, materials.wallCap, 3.5, WALL_HEIGHT + 0.31, 9.65);
  addBox(roof, 1.35, 0.1, 6.8, materials.roofSlab, 7.98, 2.97, 13.8); // mái hiên sảnh bên
  [[8.55, 10.5], [8.55, 17.1]].forEach(([x, z]) => addBox(roof, 0.06, 3.0, 0.06, materials.blackMetal, x, 1.34, z));
  addCeilingFixtures(roof);
  enableShadows(roof);
  roof.visible = displaySettings.roofVisible;
  viewer.scene.add(roof);
  viewer.groups.roof = roof;
}
