/** Phép tính vector 2D và đa giác trên mặt bằng (đơn vị mét, điểm dạng [x, y]). */

export const subtractVectors = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const addVectors = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const scaleVector = (vector, factor) => [vector[0] * factor, vector[1] * factor];
export const vectorLength = vector => Math.hypot(vector[0], vector[1]);
export const normalizeVector = vector => {
  const length = vectorLength(vector) || 1;
  return [vector[0] / length, vector[1] / length];
};
export const dotProduct = (a, b) => a[0] * b[0] + a[1] * b[1];
export const crossProduct = (a, b) => a[0] * b[1] - a[1] * b[0];

export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Làm tròn theo lưới (mặc định 5 cm). */
export function snapToGrid(value, step = 0.05) {
  const stepsPerUnit = Math.round(1 / step);
  return Math.round(value * stepsPerUnit) / stepsPerUnit;
}

export function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index], last = polygon[previous];
    const crossesRow = (current[1] > point[1]) !== (last[1] > point[1]);
    if (crossesRow && point[0] < ((last[0] - current[0]) * (point[1] - current[1])) / (last[1] - current[1]) + current[0]) inside = !inside;
  }
  return inside;
}

export function polygonArea(polygon) {
  let doubledArea = 0;
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index], next = polygon[(index + 1) % polygon.length];
    doubledArea += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(doubledArea) / 2;
}

export function polygonCentroid(polygon) {
  let sumX = 0, sumY = 0;
  polygon.forEach(([x, y]) => { sumX += x; sumY += y; });
  return [sumX / polygon.length, sumY / polygon.length];
}

export function polygonBounds(polygon) {
  const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
