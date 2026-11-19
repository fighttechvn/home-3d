/**
 * Va chạm của nhân vật (hình tròn bán kính CHARACTER_RADIUS) với tường, cửa sổ, cửa kính xếp,
 * đồ nội thất lớn và thân cây. Cửa đi và lối vòm để trống nên đi qua được.
 */
import {
  subtractVectors, addVectors, scaleVector, vectorLength, normalizeVector, dotProduct, clamp,
} from '../../core/geometry.js';
import { wallSegments, wallArcs, getSolidIntervals, pointOnSegment } from '../../model/wall-geometry.js';
import { FOLDING_DOOR_PANELS, LOT_BOUNDS, TREE_PLACEMENTS } from '../../data/house-plan.js';
import { furnitureItems } from '../../model/furniture-store.js';
import { displaySettings } from '../../viewer3d/viewer-context.js';

export const CHARACTER_RADIUS = 0.22;
/** Đồ nhỏ hoặc treo tường không chặn đường. */
const PASSABLE_FURNITURE_TYPES = new Set(['chair', 'barStool', 'rug', 'painting', 'pendantLamp', 'tv', 'shower', 'sink', 'cooktop']);
const ROUND_FURNITURE_TYPES = new Set(['roundTable', 'plant', 'floorLamp']);

const obstacles = {
  segments: [],    // { start, end, radius }: đoạn thẳng có bề dày
  boxes: [],       // { minX, maxX, minZ, maxZ }: đồ nội thất chữ nhật
  circles: [],     // { center, radius, isFurniture }
};

export function buildCollisionObstacles() {
  obstacles.segments.length = 0;
  obstacles.boxes.length = 0;
  obstacles.circles.length = 0;

  for (const segment of wallSegments) {
    const blockedIntervals = getSolidIntervals(segment);
    segment.openings.forEach(opening => { if (opening.kind === 'window') blockedIntervals.push([opening.fromDistance, opening.toDistance]); });
    blockedIntervals.forEach(([fromDistance, toDistance]) => obstacles.segments.push({
      start: pointOnSegment(segment, fromDistance), end: pointOnSegment(segment, toDistance), radius: segment.thickness / 2,
    }));
  }
  for (const arc of wallArcs) {
    let sweep = arc.endAngle - arc.startAngle;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    let previousPoint = null;
    for (let step = 0; step <= 6; step++) {
      const angle = arc.startAngle + (sweep * step) / 6;
      const point = [arc.center[0] + arc.radius * Math.cos(angle), arc.center[1] + arc.radius * Math.sin(angle)];
      if (previousPoint) obstacles.segments.push({ start: previousPoint, end: point, radius: arc.thickness / 2 });
      previousPoint = point;
    }
  }
  FOLDING_DOOR_PANELS.forEach(panelPoints => {
    for (let index = 0; index < panelPoints.length - 1; index++) obstacles.segments.push({ start: panelPoints[index], end: panelPoints[index + 1], radius: 0.04 });
  });
  furnitureItems.forEach(item => {
    if (item.hidden || PASSABLE_FURNITURE_TYPES.has(item.type)) return;
    if (ROUND_FURNITURE_TYPES.has(item.type)) {
      obstacles.circles.push({ center: item.center, radius: (item.size[0] / 2) * (item.type === 'plant' ? 0.62 : 1), isFurniture: true });
      return;
    }
    const quarterTurn = (((item.rotation || 0) % 180) + 180) % 180, isSideways = quarterTurn > 45 && quarterTurn < 135;
    const halfWidthX = (isSideways ? item.size[1] : item.size[0]) / 2, halfDepthZ = (isSideways ? item.size[0] : item.size[1]) / 2;
    obstacles.boxes.push({ minX: item.center[0] - halfWidthX, maxX: item.center[0] + halfWidthX, minZ: item.center[1] - halfDepthZ, maxZ: item.center[1] + halfDepthZ });
  });
  TREE_PLACEMENTS.forEach(([x, z, scale]) => obstacles.circles.push({ center: [x, z], radius: 0.18 * scale, isFurniture: false }));
}

function pushOutOfSegment(position, obstacle) {
  const segmentVector = subtractVectors(obstacle.end, obstacle.start), lengthSquared = dotProduct(segmentVector, segmentVector);
  const projection = lengthSquared ? clamp(dotProduct(subtractVectors(position, obstacle.start), segmentVector) / lengthSquared, 0, 1) : 0;
  const closestPoint = addVectors(obstacle.start, scaleVector(segmentVector, projection));
  const away = subtractVectors(position, closestPoint), distance = vectorLength(away), minimumDistance = CHARACTER_RADIUS + obstacle.radius;
  if (distance >= minimumDistance) return position;
  if (distance > 1e-6) return addVectors(closestPoint, scaleVector(away, minimumDistance / distance));
  const sideways = lengthSquared ? normalizeVector([-segmentVector[1], segmentVector[0]]) : [1, 0];
  return addVectors(closestPoint, scaleVector(sideways, minimumDistance));
}

function pushOutOfBox(position, box) {
  const closestX = clamp(position[0], box.minX, box.maxX), closestZ = clamp(position[1], box.minZ, box.maxZ);
  const awayX = position[0] - closestX, awayZ = position[1] - closestZ, distance = Math.hypot(awayX, awayZ);
  if (distance >= CHARACTER_RADIUS) return position;
  if (distance > 1e-6) return [closestX + (awayX / distance) * CHARACTER_RADIUS, closestZ + (awayZ / distance) * CHARACTER_RADIUS];
  // Tâm nằm trong hộp: đẩy ra cạnh gần nhất.
  const edgeDistances = [position[0] - box.minX, box.maxX - position[0], position[1] - box.minZ, box.maxZ - position[1]];
  const nearestEdge = edgeDistances.indexOf(Math.min(...edgeDistances));
  if (nearestEdge === 0) return [box.minX - CHARACTER_RADIUS, position[1]];
  if (nearestEdge === 1) return [box.maxX + CHARACTER_RADIUS, position[1]];
  if (nearestEdge === 2) return [position[0], box.minZ - CHARACTER_RADIUS];
  return [position[0], box.maxZ + CHARACTER_RADIUS];
}

function pushOutOfCircle(position, circle) {
  const away = subtractVectors(position, circle.center), distance = vectorLength(away), minimumDistance = CHARACTER_RADIUS + circle.radius;
  if (distance >= minimumDistance) return position;
  return distance > 1e-6 ? addVectors(circle.center, scaleVector(away, minimumDistance / distance)) : [circle.center[0] + minimumDistance, circle.center[1]];
}

/** Vị trí gần nhất không chạm vật cản, trong phạm vi hàng rào. */
export function resolveCollision(x, z) {
  let position = [x, z];
  for (let iteration = 0; iteration < 3; iteration++) {
    for (const segment of obstacles.segments) position = pushOutOfSegment(position, segment);
    if (displaySettings.furnitureVisible) for (const box of obstacles.boxes) position = pushOutOfBox(position, box);
    for (const circle of obstacles.circles) {
      if (circle.isFurniture && !displaySettings.furnitureVisible) continue;
      position = pushOutOfCircle(position, circle);
    }
  }
  const fenceMargin = 0.35;
  return [
    clamp(position[0], LOT_BOUNDS.minX + fenceMargin, LOT_BOUNDS.maxX - fenceMargin),
    clamp(position[1], LOT_BOUNDS.minZ + fenceMargin, LOT_BOUNDS.maxZ - fenceMargin),
  ];
}
