/** Đổi đơn vị và tạo hình SVG cơ bản. Bản vẽ dùng đơn vị cm để chữ không bị quá nhỏ trên mọi trình duyệt. */
import { wallIntervalCorners } from '../model/wall-geometry.js';

/** mét → cm (làm tròn 1 chữ số). */
export const toSvgUnits = meters => Math.round(meters * 1000) / 10;
export const toSvgPoints = points => points.map(([x, y]) => `${toSvgUnits(x)},${toSvgUnits(y)}`).join(' ');

/** Đa giác của một khoảng tường đặc; `attributes` là thuộc tính SVG thêm vào (lớp CSS hoặc màu tô). */
export function wallIntervalPolygon(segment, fromDistance, toDistance, attributes = 'class="wall-shape"') {
  return `<polygon ${attributes} points="${toSvgPoints(wallIntervalCorners(segment, fromDistance, toDistance))}"/>`;
}

/** Vành cung của tường bo góc. */
export function arcRingPath(arc) {
  const outerRadius = arc.radius + arc.thickness / 2, innerRadius = arc.radius - arc.thickness / 2;
  const sweepFlag = arc.counterClockwise ? 1 : 0;
  const pointAt = (radius, angle) => [arc.center[0] + radius * Math.cos(angle), arc.center[1] + radius * Math.sin(angle)];
  const outerStart = pointAt(outerRadius, arc.startAngle), outerEnd = pointAt(outerRadius, arc.endAngle);
  const innerEnd = pointAt(innerRadius, arc.endAngle), innerStart = pointAt(innerRadius, arc.startAngle);
  const u = toSvgUnits;
  return `M${u(outerStart[0])} ${u(outerStart[1])} A${u(outerRadius)} ${u(outerRadius)} 0 0 ${sweepFlag} ${u(outerEnd[0])} ${u(outerEnd[1])} `
    + `L${u(innerEnd[0])} ${u(innerEnd[1])} A${u(innerRadius)} ${u(innerRadius)} 0 0 ${1 - sweepFlag} ${u(innerStart[0])} ${u(innerStart[1])} Z`;
}

/** Phần bo lõm ở góc trong phòng. */
export function filletPath(fillet) {
  const u = toSvgUnits, sweepFlag = fillet.counterClockwise ? 1 : 0;
  const { corner, edgePointAlongX: first, edgePointAlongY: second, radius } = fillet;
  return `M${u(corner[0])} ${u(corner[1])} L${u(first[0])} ${u(first[1])} A${u(radius)} ${u(radius)} 0 0 ${sweepFlag} ${u(second[0])} ${u(second[1])} Z`;
}
