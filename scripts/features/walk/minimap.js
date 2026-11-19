/** Bản đồ nhỏ khi đi dạo: hiện vị trí và hướng nhân vật, chạm vào để dịch chuyển tới đó. */
import { getElement, t } from '../../core/dom.js';
import { clamp } from '../../core/geometry.js';
import { ROOMS } from '../../data/house-plan.js';
import { wallSegments, wallArcs, getSolidIntervals } from '../../model/wall-geometry.js';
import { toSvgPoints, arcRingPath, wallIntervalPolygon } from '../../plan2d/svg-shapes.js';

const FLOOR_COLORS = { wood: '#ead6bf', tile: '#eef0ee', wet: '#d5e2e7', porch: '#d3dccb', deck: '#d9c3a6' };
const WALL_COLOR = '#2a3132';
let positionMarker = null;

/** onTeleportRequest(x, z) được gọi với toạ độ mét khi người dùng chạm vào bản đồ. */
export function buildMinimap(onTeleportRequest) {
  let markup = `<svg viewBox="-50 -50 990 2070" role="img" aria-label="${t('Bản đồ nhỏ, chạm để đưa nhân vật tới đó')}">`
    + '<rect x="-50" y="-50" width="990" height="2070" fill="#dfe9d6"/>';
  ROOMS.forEach(room => { markup += `<polygon points="${toSvgPoints(room.outline)}" fill="${FLOOR_COLORS[room.floor]}"/>`; });
  wallSegments.forEach(segment => getSolidIntervals(segment).forEach(([fromDistance, toDistance]) => {
    markup += wallIntervalPolygon(segment, fromDistance, toDistance, `fill="${WALL_COLOR}"`);
  }));
  wallArcs.forEach(arc => { markup += `<path fill="${WALL_COLOR}" d="${arcRingPath(arc)}"/>`; });
  markup += '<g id="minimap-marker"><path d="M0 -92 L30 -36 L-30 -36Z" fill="#c0612a" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>'
    + `<circle r="36" fill="#c0612a" stroke="#fff" stroke-width="10"/></g></svg><small>${t('Chạm để dịch chuyển')}</small>`;

  const container = getElement('#minimap');
  container.innerHTML = markup;
  positionMarker = getElement('#minimap-marker');
  const svg = getElement('svg', container);
  svg.addEventListener('pointerdown', event => {
    event.preventDefault();
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapPoint = point.matrixTransform(svg.getScreenCTM().inverse());
    onTeleportRequest(mapPoint.x / 100, mapPoint.y / 100);
  });
}

/** heading: góc quay quanh trục đứng (hướng đi = [sin, cos] trên mặt bằng). */
export function updateMinimapMarker(x, z, heading) {
  if (!positionMarker) return;
  const markerX = clamp(x, -0.4, 9.3) * 100, markerY = clamp(z, -0.4, 20.1) * 100;
  const markerRotation = (Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180) / Math.PI;
  positionMarker.setAttribute('transform', `translate(${markerX.toFixed(0)} ${markerY.toFixed(0)}) rotate(${markerRotation.toFixed(1)})`);
}
