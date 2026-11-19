/** Tạo vân vật liệu bằng canvas: nhiễu lặp liền mạch, bản đồ pháp tuyến từ độ cao, bộ texture PBR. */
import { viewer } from './viewer-context.js';

export function createCanvas(width, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Texture lặp từ hàm vẽ canvas (dùng cho vật liệu cơ bản). */
export function createCanvasTexture(width, height, draw, { repeat = null, srgb = true } = {}) {
  const canvas = createCanvas(width, height);
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (repeat) texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return texture;
}

/** Làm sáng (amount > 0) hoặc tối (amount < 0) một màu hex. */
export function shadeHexColor(hexColor, amount) {
  const value = parseInt(hexColor.slice(1), 16);
  const adjust = channel => Math.max(0, Math.min(255, Math.round(channel + (amount > 0 ? (255 - channel) * amount : channel * amount))));
  return `rgb(${adjust(value >> 16)},${adjust((value >> 8) & 255)},${adjust(value & 255)})`;
}
export const hexToRgb = hexColor => { const value = parseInt(hexColor.slice(1), 16); return [value >> 16, (value >> 8) & 255, value & 255]; };
export const grayCss = brightness => { const channel = Math.max(0, Math.min(255, Math.round(brightness * 255))); return `rgb(${channel},${channel},${channel})`; };

/** Nhiễu giá trị lặp liền mạch (cells ô lưới trên mỗi cạnh). */
export function tileableNoise(size, cells, random) {
  const grid = new Float32Array(cells * cells);
  for (let index = 0; index < grid.length; index++) grid[index] = random();
  const output = new Float32Array(size * size), cellsPerPixel = cells / size;
  for (let y = 0; y < size; y++) {
    const gridY = y * cellsPerPixel, row = gridY | 0, fractionY = gridY - row, smoothY = fractionY * fractionY * (3 - 2 * fractionY);
    const rowStart = row * cells, nextRowStart = ((row + 1) % cells) * cells;
    for (let x = 0; x < size; x++) {
      const gridX = x * cellsPerPixel, column = gridX | 0, fractionX = gridX - column, smoothX = fractionX * fractionX * (3 - 2 * fractionX);
      const nextColumn = (column + 1) % cells;
      const topLeft = grid[rowStart + column], topRight = grid[rowStart + nextColumn];
      const bottomLeft = grid[nextRowStart + column], bottomRight = grid[nextRowStart + nextColumn];
      output[y * size + x] = topLeft + (topRight - topLeft) * smoothX + (bottomLeft - topLeft + (topLeft - topRight + bottomRight - bottomLeft) * smoothX) * smoothY;
    }
  }
  return output;
}

/** Cộng nhiều tầng nhiễu: octaves = [[số ô, trọng số], ...]. */
export function fractalNoise(size, octaves, random) {
  const output = new Float32Array(size * size);
  let totalWeight = 0;
  for (const [cells, weight] of octaves) {
    const layer = tileableNoise(size, cells, random);
    for (let index = 0; index < output.length; index++) output[index] += layer[index] * weight;
    totalWeight += weight;
  }
  for (let index = 0; index < output.length; index++) output[index] /= totalWeight;
  return output;
}

export function canvasToHeights(canvas) {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const heights = new Float32Array(canvas.width * canvas.height);
  for (let index = 0; index < heights.length; index++) heights[index] = pixels[index * 4] / 255;
  return heights;
}

/** Bản đồ pháp tuyến (chuẩn OpenGL) từ mảng độ cao lặp liền mạch. */
export function heightsToNormalCanvas(heights, size, strength) {
  const canvas = createCanvas(size), context = canvas.getContext('2d'), image = context.createImageData(size, size), pixels = image.data;
  for (let y = 0; y < size; y++) {
    const rowAbove = ((y - 1 + size) % size) * size, rowBelow = ((y + 1) % size) * size, row = y * size;
    for (let x = 0; x < size; x++) {
      const left = (x - 1 + size) % size, right = (x + 1) % size;
      const slopeX = (heights[row + right] - heights[row + left]) * strength;
      const slopeY = (heights[rowBelow + x] - heights[rowAbove + x]) * strength;
      const inverseLength = 1 / Math.sqrt(slopeX * slopeX + slopeY * slopeY + 1), pixel = (row + x) * 4;
      pixels[pixel] = (-slopeX * inverseLength * 0.5 + 0.5) * 255;
      pixels[pixel + 1] = (slopeY * inverseLength * 0.5 + 0.5) * 255;
      pixels[pixel + 2] = (inverseLength * 0.5 + 0.5) * 255;
      pixels[pixel + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

export function valuesToCanvas(values, size, colorForValue) {
  const canvas = createCanvas(size), context = canvas.getContext('2d'), image = context.createImageData(size, size), pixels = image.data;
  for (let index = 0; index < values.length; index++) {
    const [red, green, blue] = colorForValue(values[index]);
    pixels[index * 4] = red; pixels[index * 4 + 1] = green; pixels[index * 4 + 2] = blue; pixels[index * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/** Texture lặp theo mét: worldSize là kích thước thật (m) mà một ô texture phủ. */
export function createWorldTexture(canvas, worldSize, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / worldSize, 1 / worldSize);
  texture.anisotropy = viewer.renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/** Bộ texture PBR: màu, pháp tuyến (từ độ cao), độ nhám. */
export function createTextureSet(albedoCanvas, heights, roughnessCanvas, worldSize, normalStrength) {
  return {
    map: createWorldTexture(albedoCanvas, worldSize),
    normalMap: createWorldTexture(heightsToNormalCanvas(heights, albedoCanvas.width, normalStrength), worldSize, false),
    roughnessMap: roughnessCanvas ? createWorldTexture(roughnessCanvas, worldSize, false) : null,
  };
}
