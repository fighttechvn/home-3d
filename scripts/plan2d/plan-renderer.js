/** Dựng bản vẽ mặt bằng SVG: phòng, trục, kích thước, tường, cửa, nhãn và lớp đồ nội thất. */
import { ROOMS, FOLDING_DOOR_PANELS } from '../data/house-plan.js';
import { PLAN_FURNITURE_TAGS, PLAN_TEXT_NOTES } from '../data/furniture-catalog.js';
import { wallSegments, wallArcs, wallFillets, placedOpenings, getSolidIntervals, pointOnSegment, wallIntervalCorners } from '../model/wall-geometry.js';
import { furnitureItems } from '../model/furniture-store.js';
import { appState, interactionState } from '../core/app-state.js';
import { onEvent } from '../core/events.js';
import { formatDecimal, getElement, getElements, t } from '../core/dom.js';
import { subtractVectors, addVectors, scaleVector, vectorLength, crossProduct } from '../core/geometry.js';
import { toSvgUnits as u, toSvgPoints, arcRingPath, filletPath, wallIntervalPolygon } from './svg-shapes.js';
import { drawFurnitureSymbol } from './furniture-symbols.js';

/** Khung nội dung bản vẽ (cm), gồm cả trục và kích thước. */
export const PLAN_CONTENT_BOUNDS = { x: -215, y: -215, width: 1110, height: 2265 };

const HORIZONTAL_GRID_AXES = [[0.1, '1'], [6.1, '2'], [10.55, '3'], [15.7, '4'], [19.2, '5']];
const VERTICAL_GRID_AXES = [[0.1, 'A'], [6.9, 'B']];
/** Ký hiệu R350 tại các góc bo: [điểm trên tường, điểm đặt chữ, căn lề chữ]. */
const CORNER_RADIUS_NOTES = [[[1.56, 6.04], [1.05, 6.55], 'end'], [[2.89, 3.88], [3.35, 4.32], 'start'], [[3.86, 10.49], [3.4, 10.98], 'end']];

let planSvg = null;
export const getPlanSvg = () => planSvg;

/* ---------- kích thước ---------- */
function dimensionTicks(points) {
  return points.map(([x, y]) => `<line class="dimension-tick" x1="${x - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y - 6}"/>`).join('');
}
function horizontalDimension(fromX, toX, y, label) {
  return `<g class="dimension"><line x1="${u(fromX)}" y1="${u(y)}" x2="${u(toX)}" y2="${u(y)}"/>`
    + dimensionTicks([[u(fromX), u(y)], [u(toX), u(y)]])
    + `<text x="${u((fromX + toX) / 2)}" y="${u(y) - 7}">${label}</text></g>`;
}
function verticalDimension(fromY, toY, x, label) {
  const labelX = u(x) - 7, labelY = u((fromY + toY) / 2);
  return `<g class="dimension"><line x1="${u(x)}" y1="${u(fromY)}" x2="${u(x)}" y2="${u(toY)}"/>`
    + dimensionTicks([[u(x), u(fromY)], [u(x), u(toY)]])
    + `<text x="${labelX}" y="${labelY}" transform="rotate(-90 ${labelX} ${labelY})">${label}</text></g>`;
}

function gridAndDimensionsMarkup() {
  let markup = '<g class="dimension-layer no-pointer">';
  HORIZONTAL_GRID_AXES.forEach(([y, label]) => {
    markup += `<line class="axis-line" x1="${u(-1.55)}" y1="${u(y)}" x2="${u(8.75)}" y2="${u(y)}"/>`
      + `<g class="axis-bubble"><circle cx="${u(-1.82)}" cy="${u(y)}" r="25"/><text x="${u(-1.82)}" y="${u(y)}">${label}</text></g>`;
  });
  VERTICAL_GRID_AXES.forEach(([x, label]) => {
    markup += `<line class="axis-line" x1="${u(x)}" y1="${u(-1.55)}" x2="${u(x)}" y2="${u(20.1)}"/>`
      + `<g class="axis-bubble"><circle cx="${u(x)}" cy="${u(-1.82)}" r="25"/><text x="${u(x)}" y="${u(-1.82)}">${label}</text></g>`;
  });
  for (let index = 0; index < HORIZONTAL_GRID_AXES.length - 1; index++) {
    const fromY = HORIZONTAL_GRID_AXES[index][0], toY = HORIZONTAL_GRID_AXES[index + 1][0];
    markup += verticalDimension(fromY, toY, -0.62, Math.round((toY - fromY) * 1000));
  }
  markup += verticalDimension(0, 19.3, -1.12, '19300');
  markup += horizontalDimension(0.1, 6.9, -0.62, '6800') + horizontalDimension(0, 7.0, -1.12, '7000');
  markup += horizontalDimension(3.8, 6.8, 12.3, '3000');
  markup += `<line class="dimension-extension" x1="${u(3.8)}" y1="${u(11.95)}" x2="${u(3.8)}" y2="${u(12.4)}"/>`;
  markup += '</g>';
  return markup;
}

/* ---------- tường và lỗ mở ---------- */
function wallsMarkup() {
  let markup = '';
  for (const segment of wallSegments) {
    for (const [fromDistance, toDistance] of getSolidIntervals(segment)) markup += wallIntervalPolygon(segment, fromDistance, toDistance);
  }
  wallArcs.forEach(arc => { markup += `<path class="wall-shape" d="${arcRingPath(arc)}"/>`; });
  wallFillets.forEach(fillet => { markup += `<path class="wall-shape" d="${filletPath(fillet)}"/>`; });
  return markup;
}

function lineBetween(from, to, className) {
  return `<line class="${className}" x1="${u(from[0])}" y1="${u(from[1])}" x2="${u(to[0])}" y2="${u(to[1])}"/>`;
}

function openingsMarkup() {
  let markup = '';
  for (const opening of placedOpenings) {
    const { segment, fromDistance, toDistance } = opening, halfThickness = segment.thickness / 2;
    const jambLine = distance => lineBetween(pointOnSegment(segment, distance, -halfThickness), pointOnSegment(segment, distance, halfThickness), 'window-line');
    const parallelLine = (offset, className) => lineBetween(pointOnSegment(segment, fromDistance, offset), pointOnSegment(segment, toDistance, offset), className);

    if (opening.kind === 'window') {
      markup += `<polygon class="window-fill" points="${toSvgPoints(wallIntervalCorners(segment, fromDistance, toDistance))}"/>`;
      [-halfThickness, 0, halfThickness].forEach(offset => { markup += parallelLine(offset, 'window-line'); });
    } else if (opening.kind === 'door') {
      const leafWidth = vectorLength(subtractVectors(opening.end, opening.start));
      const leafTip = addVectors(opening.start, scaleVector(opening.swingDirection, leafWidth));
      const sweepFlag = crossProduct(subtractVectors(leafTip, opening.start), subtractVectors(opening.end, opening.start)) > 0 ? 1 : 0;
      markup += lineBetween(opening.start, leafTip, 'door-leaf');
      markup += `<path class="door-swing" d="M${u(leafTip[0])} ${u(leafTip[1])} A${u(leafWidth)} ${u(leafWidth)} 0 0 ${sweepFlag} ${u(opening.end[0])} ${u(opening.end[1])}"/>`;
    } else if (opening.kind === 'archway') {
      [-halfThickness, halfThickness].forEach(offset => { markup += parallelLine(offset, 'opening-line'); });
    } else if (opening.kind === 'folding') {
      FOLDING_DOOR_PANELS.forEach(panelPoints => { markup += `<polyline class="folding-door" points="${toSvgPoints(panelPoints)}"/>`; });
      markup += parallelLine(0, 'opening-line');
    }
    markup += jambLine(fromDistance) + jambLine(toDistance);
  }
  return markup;
}

/* ---------- nhãn ---------- */
function labelsMarkup() {
  let markup = '<g class="no-pointer">';
  ROOMS.forEach(room => {
    const [x, y] = room.labelPosition, fontSize = room.labelFontSize || 27;
    const name = (room.shortName || room.name).toUpperCase(), area = `${formatDecimal(room.area)} m²`;
    const rotation = room.labelVertical ? ` transform="rotate(-90 ${u(x)} ${u(y)})"` : '';
    markup += `<g${rotation}><text class="room-name" x="${u(x)}" y="${u(y)}" style="font-size:${fontSize}px">${name}</text>`
      + `<text class="room-area" x="${u(x)}" y="${u(y) + fontSize * 0.95}" style="font-size:${Math.round(fontSize * 0.78)}px">${area}</text></g>`;
  });
  markup += `<text class="site-label" x="${u(7.95)}" y="${u(4.6)}" transform="rotate(90 ${u(7.95)} ${u(4.6)})">${t('SÂN VƯỜN')}</text>`;
  markup += `<text class="site-label" x="${u(2.65)}" y="${u(19.85)}">${t('MẶT TIỀN')}</text>`;
  return markup + '</g>';
}

function cornerRadiusNotesMarkup() {
  let markup = '<g class="radius-note dimension-layer no-pointer">';
  CORNER_RADIUS_NOTES.forEach(([wallPoint, textPoint, anchor]) => {
    markup += lineBetween(wallPoint, textPoint, '')
      + `<text x="${u(textPoint[0]) + (anchor === 'end' ? -4 : 4)}" y="${u(textPoint[1]) + 12}" text-anchor="${anchor}">R350</text>`;
  });
  return markup + '</g>';
}

function planMarkup() {
  const roomShapes = ROOMS.map(room =>
    `<polygon class="room-shape ${room.floor}" data-room-id="${room.id}" points="${toSvgPoints(room.outline)}"><title>${room.name}</title></polygon>`).join('');
  const textNotes = PLAN_TEXT_NOTES.map(note => `<text class="plan-note" x="${u(note.x)}" y="${u(note.y)}">${note.text}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" id="plan-svg" role="img" aria-label="${t('Mặt bằng nhà vườn cấp 4')}">`
    + `<defs><pattern id="wardrobe-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line class="hatch-line" x1="0" y1="0" x2="0" y2="7"/></pattern></defs>`
    + `<g>`
    + `<g>${roomShapes}</g>`
    + gridAndDimensionsMarkup()
    + `<g class="furniture-layer" id="plan-furniture-layer"></g><g class="furniture-layer no-pointer">${textNotes}</g>`
    + `<g class="no-pointer">${wallsMarkup()}${openingsMarkup()}</g>`
    + `<g class="no-pointer"><rect class="symbol-line" x="${u(5.15)}" y="${u(19.3)}" width="${u(1.8)}" height="${u(0.3)}"/></g>`
    + cornerRadiusNotesMarkup()
    + labelsMarkup()
    + `</g></svg>`;
}

/* ---------- lớp đồ nội thất ---------- */
const furnitureTransform = item => `translate(${u(item.center[0])} ${u(item.center[1])}) rotate(${item.rotation || 0})`;

function furnitureSymbolMarkup(item) {
  const [width, depth] = item.size;
  const isSelected = interactionState.editingFurniture && appState.selectedFurnitureId === item.id;
  const hitArea = `<rect class="hit-area" x="${u(-width / 2 - 0.06)}" y="${u(-depth / 2 - 0.06)}" width="${u(width + 0.12)}" height="${u(depth + 0.12)}"/>`;
  const selectionOutline = isSelected
    ? `<rect class="selection-outline" x="${u(-width / 2 - 0.07)}" y="${u(-depth / 2 - 0.07)}" width="${u(width + 0.14)}" height="${u(depth + 0.14)}" rx="4"/>` : '';
  return `<g class="furniture-symbol${isSelected ? ' is-selected' : ''}" data-furniture-id="${item.id}" transform="${furnitureTransform(item)}">${hitArea}${drawFurnitureSymbol(item)}${selectionOutline}</g>`;
}

function furnitureTagMarkup(item) {
  const tag = PLAN_FURNITURE_TAGS[item.type];
  if (!tag) return '';
  const quarterTurn = ((((item.rotation || 0) % 180) + 180) % 180);
  const isSideways = quarterTurn > 45 && quarterTurn < 135;
  const isVertical = isSideways ? item.size[0] > item.size[1] : item.size[1] > item.size[0];
  const [x, y] = [u(item.center[0]), u(item.center[1])];
  return `<text class="furniture-tag" x="${x}" y="${y}"${isVertical ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${tag}</text>`;
}

export function renderFurnitureLayer() {
  const layer = planSvg && getElement('#plan-furniture-layer', planSvg);
  if (!layer) return;
  const visibleItems = furnitureItems.filter(item => !item.hidden);
  const drawOrder = [...visibleItems.filter(item => item.type === 'rug'), ...visibleItems.filter(item => item.type !== 'rug')];
  layer.innerHTML = drawOrder.map(furnitureSymbolMarkup).join('') + drawOrder.map(furnitureTagMarkup).join('');
}

/** Cập nhật nhanh vị trí khi đang kéo (không vẽ lại cả lớp). */
export function moveFurnitureSymbol(item) {
  const symbol = planSvg && planSvg.querySelector(`.furniture-symbol[data-furniture-id="${item.id}"]`);
  if (symbol) symbol.setAttribute('transform', furnitureTransform(item));
}

export function highlightPlanRoom(roomId) {
  getElements('.room-shape', planSvg).forEach(shape => shape.classList.toggle('is-selected', shape.dataset.roomId === roomId));
}

export function setPlanFurnitureVisible(visible) { planSvg.classList.toggle('hide-furniture', !visible); }
export function setPlanDimensionsVisible(visible) { planSvg.classList.toggle('hide-dimensions', !visible); }
export function setPlanEditingMode(enabled) { planSvg.classList.toggle('is-editing', enabled); }

export function initPlanRenderer(hostElement) {
  hostElement.innerHTML = planMarkup();
  planSvg = getElement('#plan-svg', hostElement);
  renderFurnitureLayer();
  onEvent('furniture:changed', renderFurnitureLayer);
  onEvent('furniture:selected', renderFurnitureLayer);
  onEvent('furniture:moved', ({ item }) => moveFurnitureSymbol(item));
  onEvent('room:selected', ({ roomId }) => highlightPlanRoom(roomId));
}
