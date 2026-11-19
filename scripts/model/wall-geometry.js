/**
 * Tách tường thành đoạn thẳng và cung bo góc, gắn cửa/cửa sổ vào đúng đoạn.
 * Dùng chung cho bản vẽ 2D, mô hình 3D và va chạm của nhân vật.
 */
import {
  subtractVectors, addVectors, scaleVector, vectorLength, normalizeVector, dotProduct, crossProduct,
} from '../core/geometry.js';
import { WALLS, OPENINGS, WALL_FILLETS } from '../data/house-plan.js';

/** Đoạn tường: start, end, direction, normal, length, thickness, startExtension, endExtension, openings[]. */
export const wallSegments = [];
/** Cung tường bo góc: center, radius, thickness, startAngle, endAngle, counterClockwise. */
export const wallArcs = [];
/** Lỗ mở đã gắn vào đoạn tường: dữ liệu gốc + segment, fromDistance, toDistance. */
export const placedOpenings = [];

function buildSegmentsAndArcs() {
  for (const wall of WALLS) {
    const { points, thickness } = wall;
    const cornerRadii = wall.cornerRadii || [];
    const roundedCorners = [];

    for (let index = 1; index < points.length - 1; index++) {
      const radius = cornerRadii[index] || 0;
      if (!radius) continue;
      const vertex = points[index];
      const incomingDirection = normalizeVector(subtractVectors(vertex, points[index - 1]));
      const outgoingDirection = normalizeVector(subtractVectors(points[index + 1], vertex));
      const arcStart = subtractVectors(vertex, scaleVector(incomingDirection, radius));
      const arcEnd = addVectors(vertex, scaleVector(outgoingDirection, radius));
      const center = addVectors(arcStart, scaleVector(outgoingDirection, radius));
      roundedCorners[index] = { arcStart, arcEnd };
      wallArcs.push({
        center, radius, thickness,
        startAngle: Math.atan2(arcStart[1] - center[1], arcStart[0] - center[0]),
        endAngle: Math.atan2(arcEnd[1] - center[1], arcEnd[0] - center[0]),
        counterClockwise: crossProduct(subtractVectors(arcStart, center), subtractVectors(arcEnd, center)) > 0,
      });
    }

    for (let index = 0; index < points.length - 1; index++) {
      let start = points[index], end = points[index + 1];
      // Đầu đoạn kéo dài nửa bề dày để lấp góc vuông; đầu nối với cung bo thì không kéo dài.
      let startExtension = thickness / 2, endExtension = thickness / 2;
      if (roundedCorners[index]) { start = roundedCorners[index].arcEnd; startExtension = 0; }
      if (roundedCorners[index + 1]) { end = roundedCorners[index + 1].arcStart; endExtension = 0; }
      const direction = normalizeVector(subtractVectors(end, start));
      wallSegments.push({
        start, end, direction, normal: [-direction[1], direction[0]],
        length: vectorLength(subtractVectors(end, start)),
        thickness, startExtension, endExtension, openings: [],
      });
    }
  }
}

function attachOpenings() {
  const tolerance = 0.02;
  for (const opening of OPENINGS) {
    for (const segment of wallSegments) {
      const offsetToStart = subtractVectors(opening.start, segment.start);
      const offsetToEnd = subtractVectors(opening.end, segment.start);
      const isOnLine = Math.abs(crossProduct(segment.direction, offsetToStart)) <= tolerance
        && Math.abs(crossProduct(segment.direction, offsetToEnd)) <= tolerance;
      if (!isOnLine) continue;
      const distanceToStart = dotProduct(offsetToStart, segment.direction);
      const distanceToEnd = dotProduct(offsetToEnd, segment.direction);
      const fromDistance = Math.min(distanceToStart, distanceToEnd), toDistance = Math.max(distanceToStart, distanceToEnd);
      if (fromDistance < -0.01 || toDistance > segment.length + 0.01) continue;
      const placedOpening = { ...opening, segment, fromDistance, toDistance };
      segment.openings.push(placedOpening);
      placedOpenings.push(placedOpening);
      break;
    }
  }
  wallSegments.forEach(segment => segment.openings.sort((a, b) => a.fromDistance - b.fromDistance));
}

buildSegmentsAndArcs();
attachOpenings();

/** Các khoảng tường đặc (không có lỗ mở) dọc theo đoạn, dạng [từ, đến] tính bằng mét. */
export function getSolidIntervals(segment) {
  const intervals = [];
  let cursor = -segment.startExtension;
  for (const opening of segment.openings) {
    if (opening.fromDistance > cursor + 1e-4) intervals.push([cursor, opening.fromDistance]);
    cursor = opening.toDistance;
  }
  if (segment.length + segment.endExtension > cursor + 1e-4) intervals.push([cursor, segment.length + segment.endExtension]);
  return intervals;
}

/** Điểm nằm cách đầu đoạn một khoảng `distance`, lệch ngang `offset` theo pháp tuyến. */
export function pointOnSegment(segment, distance, offset = 0) {
  return addVectors(addVectors(segment.start, scaleVector(segment.direction, distance)), scaleVector(segment.normal, offset));
}

/** Bốn góc của một khoảng tường đặc (để vẽ đa giác). */
export function wallIntervalCorners(segment, fromDistance, toDistance) {
  const halfThickness = segment.thickness / 2;
  return [
    pointOnSegment(segment, fromDistance, -halfThickness), pointOnSegment(segment, toDistance, -halfThickness),
    pointOnSegment(segment, toDistance, halfThickness), pointOnSegment(segment, fromDistance, halfThickness),
  ];
}

/** Hình học của phần bo lõm ở góc trong. */
function describeFillet({ innerCorner, roomDirection, radius }) {
  const edgePointAlongX = [innerCorner[0] + roomDirection[0] * radius, innerCorner[1]];
  const edgePointAlongY = [innerCorner[0], innerCorner[1] + roomDirection[1] * radius];
  const arcCenter = [innerCorner[0] + roomDirection[0] * radius, innerCorner[1] + roomDirection[1] * radius];
  return {
    corner: innerCorner, edgePointAlongX, edgePointAlongY, arcCenter, radius,
    startAngle: Math.atan2(edgePointAlongX[1] - arcCenter[1], edgePointAlongX[0] - arcCenter[0]),
    endAngle: Math.atan2(edgePointAlongY[1] - arcCenter[1], edgePointAlongY[0] - arcCenter[0]),
    counterClockwise: crossProduct(subtractVectors(edgePointAlongX, arcCenter), subtractVectors(edgePointAlongY, arcCenter)) > 0,
  };
}
export const wallFillets = WALL_FILLETS.map(describeFillet);
