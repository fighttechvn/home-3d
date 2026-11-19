/**
 * Ký hiệu đồ nội thất trên bản vẽ (nhìn từ trên xuống), vẽ trong toạ độ cục bộ của món đồ:
 * tâm ở gốc, rộng theo x, sâu theo y, mặt trước hướng +y.
 */
import { toSvgUnits as u } from './svg-shapes.js';

const rectangle = (x, y, width, depth, className = 'symbol-fill', cornerRadius = 0) =>
  `<rect class="${className}" x="${u(x)}" y="${u(y)}" width="${u(width)}" height="${u(depth)}"${cornerRadius ? ` rx="${u(cornerRadius)}"` : ''}/>`;
const line = (x1, y1, x2, y2, className = 'symbol-line') =>
  `<line class="${className}" x1="${u(x1)}" y1="${u(y1)}" x2="${u(x2)}" y2="${u(y2)}"/>`;
const circle = (x, y, radius, className = 'symbol-fill') =>
  `<circle class="${className}" cx="${u(x)}" cy="${u(y)}" r="${u(radius)}"/>`;
const ellipse = (x, y, radiusX, radiusY, className = 'symbol-fill') =>
  `<ellipse class="${className}" cx="${u(x)}" cy="${u(y)}" rx="${u(radiusX)}" ry="${u(radiusY)}"/>`;

export function drawFurnitureSymbol(item) {
  const [width, depth] = item.size, left = -width / 2, top = -depth / 2;
  switch (item.type) {
    case 'bed': {
      const pillowWidth = width / 2 - 0.16;
      return rectangle(left, top, width, depth) + rectangle(left, top, width, 0.07, 'symbol-solid')
        + rectangle(left + 0.1, top + 0.14, pillowWidth, 0.3, 'symbol-fill', 0.06) + rectangle(0.06, top + 0.14, pillowWidth, 0.3, 'symbol-fill', 0.06)
        + line(left, top + 0.6, left + width, top + 0.6)
        + `<path class="symbol-line" d="M${u(left + width)} ${u(top + 0.6)} L${u(left + width - 0.4)} ${u(top + 0.95)} L${u(left + width - 0.4)} ${u(top + 0.6)}"/>`;
    }
    case 'nightstand':
      return rectangle(left, top, width, depth) + circle(0, 0, 0.11, 'symbol-line') + line(-0.11, 0, 0.11, 0) + line(0, -0.11, 0, 0.11);
    case 'lowCabinet': case 'tvConsole':
      return rectangle(left, top, width, depth);
    case 'wardrobe': case 'shoeCabinet': case 'pantry':
      return rectangle(left, top, width, depth, 'symbol-hatch');
    case 'desk':
      return rectangle(left, top, width, depth) + rectangle(-0.2, top + 0.06, 0.4, 0.04, 'symbol-solid') + rectangle(-0.15, top + 0.2, 0.3, 0.12);
    case 'workDesk':
      return rectangle(left, top, width, depth) + rectangle(-0.55, top + 0.08, 0.4, 0.05, 'symbol-solid') + rectangle(0.15, top + 0.08, 0.4, 0.05, 'symbol-solid')
        + rectangle(-0.5, top + 0.25, 0.3, 0.12) + rectangle(0.2, top + 0.25, 0.3, 0.12);
    case 'chair':
      return rectangle(left + 0.02, top + 0.06, width - 0.04, depth - 0.06, 'symbol-fill', 0.07) + rectangle(left + 0.02, top, width - 0.04, 0.07, 'symbol-solid', 0.03);
    case 'diningTable':
      return rectangle(left, top, width, depth);
    case 'sofa': {
      let markup = rectangle(left, top, width, depth, 'symbol-fill', 0.05) + rectangle(left, top, width, 0.2, 'symbol-fill', 0.04)
        + rectangle(left, top, 0.16, depth, 'symbol-fill', 0.04) + rectangle(left + width - 0.16, top, 0.16, depth, 'symbol-fill', 0.04);
      const cushionCount = 4, cushionWidth = (width - 0.32) / cushionCount;
      for (let index = 1; index < cushionCount; index++) {
        const x = left + 0.16 + index * cushionWidth;
        markup += line(x, top + 0.2, x, top + depth);
      }
      return markup;
    }
    case 'loveseat':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.28) + rectangle(left + 0.05, top + 0.04, width - 0.1, 0.22, 'symbol-fill', 0.11);
    case 'roundTable':
      return circle(0, 0, width / 2);
    case 'barStool':
      return circle(0, 0, width / 2) + circle(0, 0, width / 2 - 0.06, 'symbol-line');
    case 'plant': {
      let markup = circle(0, 0, width * 0.22, 'symbol-line');
      for (let leafIndex = 0; leafIndex < 9; leafIndex++) {
        const angle = (leafIndex / 9) * Math.PI * 2 + 0.3, reach = width * 0.5 * (leafIndex % 2 ? 0.75 : 1);
        markup += `<path class="symbol-line" d="M0 0 Q${u(Math.cos(angle + 0.35) * reach * 0.55)} ${u(Math.sin(angle + 0.35) * reach * 0.55)} ${u(Math.cos(angle) * reach)} ${u(Math.sin(angle) * reach)}"/>`;
      }
      return markup;
    }
    case 'floorLamp':
      return circle(0, 0, width / 2) + circle(0, 0, width / 3, 'symbol-line') + circle(0, 0, width / 7, 'symbol-line');
    case 'rug': {
      let markup = rectangle(left, top, width, depth, 'symbol-line');
      for (let x = left + 0.04; x < left + width; x += 0.07) markup += line(x, top - 0.05, x, top) + line(x, top + depth, x, top + depth + 0.05);
      return markup;
    }
    case 'fridge':
      return rectangle(left, top, width, depth) + line(left, top, left + width, top + depth) + line(left + width, top, left, top + depth);
    case 'kitchenCounter': {
      let markup = rectangle(left, top, width, depth);
      for (let x = left + 0.6; x < left + width - 0.1; x += 0.6) markup += line(x, top + depth - 0.03, x, top + depth);
      return markup;
    }
    case 'sink':
      return rectangle(left + 0.04, top + 0.06, width - 0.08, depth - 0.1, 'symbol-fill', 0.06) + circle(0, top + 0.04, 0.025, 'symbol-solid');
    case 'cooktop':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.02) + circle(-0.16, -0.1, 0.09, 'symbol-line') + circle(0.16, -0.1, 0.09, 'symbol-line')
        + circle(-0.16, 0.12, 0.07, 'symbol-line') + circle(0.16, 0.12, 0.07, 'symbol-line');
    case 'kitchenIsland':
      return rectangle(left, top, width, depth, 'symbol-fill', width / 2);
    case 'toilet':
      return rectangle(left + 0.02, top, width - 0.04, 0.18, 'symbol-fill', 0.03) + ellipse(0, top + 0.42, width / 2 - 0.03, 0.25);
    case 'washbasin':
      return rectangle(left, top, width, depth) + ellipse(0, 0.02, 0.2, 0.14, 'symbol-line') + circle(0, top + 0.05, 0.02, 'symbol-solid');
    case 'shower':
      return circle(0, 0.05, 0.1, 'symbol-line') + line(0, 0.05, 0, top) + line(-0.04, 0.05, 0.04, 0.05) + line(0, 0.01, 0, 0.09);
    case 'showerGlass':
      return line(left, 0, left + width, 0, 'window-line');
    case 'tv':
      return rectangle(left, top, width, depth, 'symbol-solid');
    case 'painting':
      return line(left, 0, left + width, 0) + line(left, -0.03, left + width, -0.03);
    case 'armchair':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.1) + rectangle(left, top, width, 0.18, 'symbol-fill', 0.06)
        + rectangle(left, top, 0.14, depth, 'symbol-fill', 0.06) + rectangle(left + width - 0.14, top, 0.14, depth, 'symbol-fill', 0.06);
    case 'bookshelf': {
      let markup = rectangle(left, top, width, depth);
      for (let x = left + 0.06; x < left + width - 0.04; x += 0.07) markup += line(x, top + 0.03, x, top + depth - 0.04);
      return markup;
    }
    case 'dresser':
      return rectangle(left, top, width, depth) + line(left, top + depth - 0.04, left + width, top + depth - 0.04) + line(0, top, 0, top + depth);
    case 'bathtub':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.08) + rectangle(left + 0.07, top + 0.07, width - 0.14, depth - 0.14, 'symbol-fill', 0.25)
        + circle(0, top + 0.2, 0.025, 'symbol-solid');
    case 'bench':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.03) + line(left, top + depth / 3, left + width, top + depth / 3) + line(left, top + (2 * depth) / 3, left + width, top + (2 * depth) / 3);
    case 'pendantLamp':
      return rectangle(left, top, width, depth, 'symbol-dashed');
    case 'loungeChair':
      return rectangle(left, top, width, depth, 'symbol-fill', 0.25) + rectangle(left + 0.05, top + 0.04, width - 0.1, 0.24, 'symbol-fill', 0.1);
    default:
      return '';
  }
}
