/**
 * Vật liệu thật (PBR) dựng hoàn toàn bằng code vì trang không tải được ảnh từ ngoài:
 * vân gỗ có khe ván, gạch bóng, tường sơn sần, cỏ, đá, vải dệt, kim loại, bầu trời phản chiếu.
 */
import { seededRandom, getRandomSeed, setRandomSeed } from '../core/random.js';
import { isTouchDevice } from '../core/dom.js';
import { SUN_OFFSET } from '../data/lighting-fixtures.js';
import { viewer } from './viewer-context.js';
import { basicMaterials, realisticMaterials, realisticAssets } from './materials.js';
import {
  createCanvas, shadeHexColor, hexToRgb, grayCss, fractalNoise, canvasToHeights, heightsToNormalCanvas,
  valuesToCanvas, createWorldTexture, createTextureSet,
} from './texture-utils.js';

const random = seededRandom;

/* ---------- ván gỗ (nằm ngang theo x) ---------- */
function plankTextureSet(size, worldSize, plankWidth, plankLength, baseColor, options = {}) {
  const albedo = createCanvas(size), albedoContext = albedo.getContext('2d');
  const height = createCanvas(size), heightContext = height.getContext('2d');
  const roughness = createCanvas(size), roughnessContext = roughness.getContext('2d');
  const pixelsPerMeter = size / worldSize, rows = Math.round(worldSize / plankWidth), gapPixels = options.gapPixels || 2;
  heightContext.fillStyle = '#000'; heightContext.fillRect(0, 0, size, size);
  roughnessContext.fillStyle = grayCss(0.5); roughnessContext.fillRect(0, 0, size, size);

  const drawPlank = (x, y, width, plankHeight) => {
    albedoContext.fillStyle = shadeHexColor(baseColor, (random() - 0.5) * (options.colorVariation || 0.2));
    albedoContext.fillRect(x, y, width, plankHeight);
    const lengthGradient = albedoContext.createLinearGradient(x, 0, x + width, 0);
    lengthGradient.addColorStop(0, 'rgba(0,0,0,0.05)'); lengthGradient.addColorStop(0.5, 'rgba(255,255,255,0.04)'); lengthGradient.addColorStop(1, 'rgba(0,0,0,0.06)');
    albedoContext.fillStyle = lengthGradient; albedoContext.fillRect(x, y, width, plankHeight);
    for (let grain = 0; grain < (options.grainLines || 30); grain++) {
      const grainY = y + random() * plankHeight, amplitude = 0.6 + random() * plankHeight * 0.06, phase = random() * 6.3;
      const frequency = ((1 + Math.floor(random() * 3)) * Math.PI * 2) / width;
      albedoContext.strokeStyle = random() < 0.62 ? `rgba(60,32,12,${0.06 + random() * 0.1})` : `rgba(255,232,196,${0.04 + random() * 0.07})`;
      albedoContext.lineWidth = 0.5 + random() * 1.8;
      albedoContext.beginPath();
      for (let along = 0; along <= width; along += width / 32) {
        const pointY = grainY + Math.sin(along * frequency + phase) * amplitude;
        if (along) albedoContext.lineTo(x + along, pointY); else albedoContext.moveTo(x, pointY);
      }
      albedoContext.stroke();
    }
    if (random() < (options.knotChance || 0.22)) {
      const knotX = x + width * (0.1 + random() * 0.8), knotY = y + plankHeight * (0.3 + random() * 0.4), knotRadius = plankHeight * (0.06 + random() * 0.06);
      const knot = albedoContext.createRadialGradient(knotX, knotY, 0, knotX, knotY, knotRadius * 3);
      knot.addColorStop(0, 'rgba(55,28,10,0.6)'); knot.addColorStop(0.35, 'rgba(85,50,22,0.28)'); knot.addColorStop(1, 'rgba(85,50,22,0)');
      albedoContext.fillStyle = knot; albedoContext.beginPath(); albedoContext.ellipse(knotX, knotY, knotRadius * 3.4, knotRadius * 1.5, 0, 0, 7); albedoContext.fill();
    }
    albedoContext.fillStyle = options.gapColor || 'rgba(45,26,12,0.65)';
    albedoContext.fillRect(x, y, width, gapPixels * 0.75); albedoContext.fillRect(x, y, gapPixels * 0.75, plankHeight);
    heightContext.fillStyle = grayCss(0.72 + (random() - 0.5) * 0.08); heightContext.fillRect(x + gapPixels, y + gapPixels, width - gapPixels * 2, plankHeight - gapPixels * 2);
    heightContext.fillStyle = grayCss(0.45); heightContext.fillRect(x + gapPixels * 0.5, y + gapPixels * 0.5, width - gapPixels, gapPixels * 0.5);
    roughnessContext.fillStyle = grayCss((options.roughness || 0.42) + (random() - 0.5) * 0.12); roughnessContext.fillRect(x, y, width, plankHeight);
  };

  for (let row = 0; row < rows; row++) {
    const offset = ((row * 0.37) % 1) * plankLength * pixelsPerMeter;
    for (let x = -offset; x < size; x += plankLength * pixelsPerMeter) {
      const seedBeforePlank = getRandomSeed();
      drawPlank(x, row * plankWidth * pixelsPerMeter, plankLength * pixelsPerMeter, plankWidth * pixelsPerMeter);
      // Tấm ván cắt ngang mép texture được vẽ lại ở mép bên kia với cùng hạt giống để lặp liền mạch.
      if (x < 0) { setRandomSeed(seedBeforePlank); drawPlank(x + size, row * plankWidth * pixelsPerMeter, plankLength * pixelsPerMeter, plankWidth * pixelsPerMeter); }
    }
  }
  return createTextureSet(albedo, canvasToHeights(height), roughness, worldSize, options.normalStrength || 2.2);
}

/* ---------- gạch lát ---------- */
function tileTextureSet(size, worldSize, tileWidth, tileLength, baseColor, groutColor, options = {}) {
  const albedo = createCanvas(size), albedoContext = albedo.getContext('2d');
  const height = createCanvas(size), heightContext = height.getContext('2d');
  const roughness = createCanvas(size), roughnessContext = roughness.getContext('2d');
  const pixelsPerMeter = size / worldSize, groutPixels = options.groutPixels || 3;
  albedoContext.fillStyle = groutColor; albedoContext.fillRect(0, 0, size, size);
  heightContext.fillStyle = '#000'; heightContext.fillRect(0, 0, size, size);
  roughnessContext.fillStyle = grayCss(0.85); roughnessContext.fillRect(0, 0, size, size);
  const speckleNoise = options.speckle ? fractalNoise(size, [[16, 1], [64, 0.6], [256, 0.5]], random) : null;

  for (let y = 0; y < worldSize - 1e-6; y += tileLength) {
    for (let x = 0; x < worldSize - 1e-6; x += tileWidth) {
      const left = x * pixelsPerMeter + groutPixels / 2, top = y * pixelsPerMeter + groutPixels / 2;
      const width = tileWidth * pixelsPerMeter - groutPixels, tileHeight = tileLength * pixelsPerMeter - groutPixels;
      albedoContext.fillStyle = shadeHexColor(baseColor, (random() - 0.5) * (options.colorVariation || 0.04));
      albedoContext.fillRect(left, top, width, tileHeight);
      if (options.marbleVeins) {
        albedoContext.save(); albedoContext.beginPath(); albedoContext.rect(left, top, width, tileHeight); albedoContext.clip();
        for (let vein = 0; vein < options.marbleVeins; vein++) {
          const startX = left + random() * width, endX = left + random() * width;
          const control1 = [left + random() * width, top + random() * tileHeight], control2 = [left + random() * width, top + random() * tileHeight];
          [[14, 0.012], [5, 0.022], [1.4, 0.05]].forEach(([lineWidth, alpha]) => {
            albedoContext.strokeStyle = `rgba(168,156,140,${alpha})`; albedoContext.lineWidth = lineWidth * (size / 2048) * 1.5;
            albedoContext.beginPath(); albedoContext.moveTo(startX, top - 20);
            albedoContext.bezierCurveTo(control1[0], control1[1], control2[0], control2[1], endX, top + tileHeight + 20); albedoContext.stroke();
          });
        }
        albedoContext.restore();
      }
      heightContext.fillStyle = grayCss(0.9); heightContext.fillRect(left, top, width, tileHeight);
      roughnessContext.fillStyle = grayCss((options.roughness || 0.1) + (random() - 0.5) * 0.04); roughnessContext.fillRect(left, top, width, tileHeight);
    }
  }
  if (speckleNoise) {
    const image = albedoContext.getImageData(0, 0, size, size), pixels = image.data;
    for (let index = 0; index < speckleNoise.length; index++) {
      const factor = 1 + (speckleNoise[index] - 0.5) * options.speckle;
      pixels[index * 4] *= factor; pixels[index * 4 + 1] *= factor; pixels[index * 4 + 2] *= factor;
    }
    albedoContext.putImageData(image, 0, 0);
  }
  const heights = canvasToHeights(height);
  if (speckleNoise && options.surfaceBumps) for (let index = 0; index < heights.length; index++) heights[index] += (speckleNoise[index] - 0.5) * options.surfaceBumps;
  return createTextureSet(albedo, heights, roughness, worldSize, options.normalStrength || 1.4);
}

/* ---------- bề mặt nhiễu: tường sơn, bê tông, len, vải bouclé ---------- */
function noiseTextureSet(size, worldSize, baseColor, options = {}) {
  const heights = fractalNoise(size, options.octaves || [[8, 1], [32, 0.5], [128, 0.35]], random);
  const [red, green, blue] = hexToRgb(baseColor), variation = options.colorVariation || 0.08;
  if (options.poreCount) {
    for (let pore = 0; pore < options.poreCount; pore++) {
      const index = Math.floor(random() * heights.length);
      heights[index] = 0;
      if (index + 1 < heights.length) heights[index + 1] *= 0.4;
    }
  }
  const albedo = valuesToCanvas(heights, size, value => { const factor = 1 + (value - 0.5) * variation * 2; return [red * factor, green * factor, blue * factor]; });
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(heights, size, options.normalStrength || 2), worldSize, false) };
}

function wovenFabricTextureSet(size, worldSize, normalStrength = 3) {
  const heights = new Float32Array(size * size), threadNoise = fractalNoise(size, [[32, 1], [128, 0.6]], random), threadsPerTile = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * threadsPerTile, v = (y / size) * threadsPerTile, cellU = Math.floor(u), cellV = Math.floor(v);
      const isHorizontalThread = (cellU + cellV) % 2 === 0;
      const threadProfile = isHorizontalThread ? Math.sin(Math.PI * (v - cellV)) : Math.sin(Math.PI * (u - cellU));
      heights[y * size + x] = 0.15 + 0.7 * threadProfile + 0.15 * threadNoise[y * size + x];
    }
  }
  const albedo = valuesToCanvas(heights, size, value => { const channel = 205 + value * 50; return [channel, channel, channel]; });
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(heights, size, normalStrength), worldSize, false) };
}

/** Vẽ lặp một hình qua mép texture (9 vị trí) để ghép liền mạch. */
function forEachWrappedPosition(x, y, reach, size, draw) {
  for (const offsetX of [0, -size, size]) {
    for (const offsetY of [0, -size, size]) {
      const wrappedX = x + offsetX, wrappedY = y + offsetY;
      if (wrappedX < -reach || wrappedX > size + reach || wrappedY < -reach || wrappedY > size + reach) continue;
      draw(wrappedX, wrappedY);
    }
  }
}

function grassTextureSet(size, worldSize) {
  const albedo = createCanvas(size), albedoContext = albedo.getContext('2d'), height = createCanvas(size), heightContext = height.getContext('2d');
  const patches = fractalNoise(size, [[4, 1], [12, 0.6]], random);
  albedoContext.drawImage(valuesToCanvas(patches, size, value => { const factor = 0.75 + value * 0.5; return [78 * factor, 118 * factor, 48 * factor]; }), 0, 0);
  heightContext.fillStyle = '#202020'; heightContext.fillRect(0, 0, size, size);
  const greens = ['#4d7a31', '#5d8c3a', '#6f9c45', '#3f6a2a', '#83a852', '#567f35', '#9bb46a'];
  const bladeCount = Math.round((size * size) / 26);
  for (let blade = 0; blade < bladeCount; blade++) {
    const length = 4 + random() * 9 * (size / 1024), angle = (random() - 0.5) * 1.4;
    const color = greens[Math.floor(random() * greens.length)], lineWidth = 0.8 + random() * 1.1, brightness = 0.35 + random() * 0.6;
    forEachWrappedPosition(random() * size, random() * size, length, size, (x, y) => {
      const tipX = x + Math.sin(angle) * length, tipY = y - Math.cos(angle) * length;
      albedoContext.strokeStyle = color; albedoContext.lineWidth = lineWidth;
      albedoContext.beginPath(); albedoContext.moveTo(x, y); albedoContext.lineTo(tipX, tipY); albedoContext.stroke();
      heightContext.strokeStyle = grayCss(brightness); heightContext.lineWidth = lineWidth;
      heightContext.beginPath(); heightContext.moveTo(x, y); heightContext.lineTo(tipX, tipY); heightContext.stroke();
    });
  }
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(canvasToHeights(height), size, 2.4), worldSize, false) };
}

function woodGrainTextureSet(size, worldSize, baseColor) {
  const albedo = createCanvas(size), albedoContext = albedo.getContext('2d'), height = createCanvas(size), heightContext = height.getContext('2d');
  albedoContext.fillStyle = baseColor; albedoContext.fillRect(0, 0, size, size);
  heightContext.fillStyle = grayCss(0.5); heightContext.fillRect(0, 0, size, size);
  for (let grain = 0; grain < size * 0.32; grain++) {
    const grainY = random() * size, amplitude = 1 + random() * size * 0.012, frequency = ((1 + Math.floor(random() * 3)) * Math.PI * 2) / size;
    const phase = random() * 6.3, isDark = random() < 0.6, alpha = 0.04 + random() * 0.1, lineWidth = 0.6 + random() * 2;
    for (const offsetY of [0, -size, size]) {
      const baseY = grainY + offsetY;
      if (baseY < -amplitude - 4 || baseY > size + amplitude + 4) continue;
      albedoContext.strokeStyle = isDark ? `rgba(70,38,14,${alpha})` : `rgba(255,236,205,${alpha * 0.8})`; albedoContext.lineWidth = lineWidth; albedoContext.beginPath();
      heightContext.strokeStyle = isDark ? grayCss(0.42) : grayCss(0.56); heightContext.lineWidth = lineWidth; heightContext.beginPath();
      for (let x = 0; x <= size; x += size / 48) {
        const y = baseY + Math.sin(x * frequency + phase) * amplitude;
        if (x) { albedoContext.lineTo(x, y); heightContext.lineTo(x, y); } else { albedoContext.moveTo(0, y); heightContext.moveTo(0, y); }
      }
      albedoContext.stroke(); heightContext.stroke();
    }
  }
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(canvasToHeights(height), size, 1.2), worldSize, false) };
}

function foliageTextureSet(size, worldSize) {
  const albedo = createCanvas(size), albedoContext = albedo.getContext('2d'), height = createCanvas(size), heightContext = height.getContext('2d');
  albedoContext.fillStyle = '#41583a'; albedoContext.fillRect(0, 0, size, size);
  heightContext.fillStyle = '#111'; heightContext.fillRect(0, 0, size, size);
  const leafCount = Math.round((size * size) / 260);
  for (let leaf = 0; leaf < leafCount; leaf++) {
    const length = (7 + random() * 9) * (size / 512), width = length * (0.38 + random() * 0.15), angle = random() * 6.3;
    const tint = 0.72 + random() * 0.4, brightness = 0.3 + random() * 0.7;
    forEachWrappedPosition(random() * size, random() * size, length, size, (x, y) => {
      albedoContext.save(); albedoContext.translate(x, y); albedoContext.rotate(angle);
      albedoContext.fillStyle = `rgb(${Math.round(150 * tint)},${Math.round(200 * tint)},${Math.round(130 * tint)})`;
      albedoContext.beginPath(); albedoContext.ellipse(0, 0, length, width, 0, 0, 7); albedoContext.fill();
      albedoContext.strokeStyle = 'rgba(40,60,30,0.35)'; albedoContext.lineWidth = 0.8;
      albedoContext.beginPath(); albedoContext.moveTo(-length, 0); albedoContext.lineTo(length, 0); albedoContext.stroke();
      albedoContext.restore();
      heightContext.save(); heightContext.translate(x, y); heightContext.rotate(angle);
      const leafShading = heightContext.createRadialGradient(0, 0, 0, 0, 0, length);
      leafShading.addColorStop(0, grayCss(brightness)); leafShading.addColorStop(1, grayCss(brightness * 0.55));
      heightContext.fillStyle = leafShading; heightContext.beginPath(); heightContext.ellipse(0, 0, length, width, 0, 0, 7); heightContext.fill();
      heightContext.restore();
    });
  }
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(canvasToHeights(height), size, 3), worldSize, false) };
}

function barkTextureSet(size, worldSize) {
  const heights = new Float32Array(size * size), noise = fractalNoise(size, [[4, 1], [16, 0.5]], random);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ridge = Math.sin((x / size) * Math.PI * 2 * 18 + noise[y * size + x] * 6) * 0.5 + 0.5;
      heights[y * size + x] = 0.25 + 0.55 * Math.pow(ridge, 1.6) + 0.2 * noise[y * size + x];
    }
  }
  const albedo = valuesToCanvas(heights, size, value => [70 + value * 70, 52 + value * 52, 38 + value * 36]);
  return { map: createWorldTexture(albedo, worldSize), normalMap: createWorldTexture(heightsToNormalCanvas(heights, size, 4), worldSize, false) };
}

function marbleTextureSet(size, worldSize) {
  const albedo = createCanvas(size), context = albedo.getContext('2d');
  context.fillStyle = '#eceae5'; context.fillRect(0, 0, size, size);
  for (let vein = 0; vein < 9; vein++) {
    const points = [0, 1, 2, 3].map(() => [random() * size, random() * size]);
    [[16, 0.03], [6, 0.05], [1.5, 0.14]].forEach(([lineWidth, alpha]) => {
      for (const offsetX of [0, -size, size]) {
        context.strokeStyle = `rgba(140,135,128,${alpha})`; context.lineWidth = lineWidth * (size / 1024);
        context.beginPath(); context.moveTo(points[0][0] + offsetX, points[0][1]);
        context.bezierCurveTo(points[1][0] + offsetX, points[1][1], points[2][0] + offsetX, points[2][1], points[3][0] + offsetX, points[3][1]);
        context.stroke();
      }
    });
  }
  return { map: createWorldTexture(albedo, worldSize) };
}

/* ---------- bầu trời ban ngày (ảnh toàn cảnh 360°) ---------- */
/** Vị trí trên ảnh toàn cảnh của một hướng nhìn. */
export function equirectangularPixel(direction, width, height) {
  const u = 0.5 + Math.atan2(direction.z, direction.x) / (2 * Math.PI), v = 0.5 + Math.asin(direction.y) / Math.PI;
  return [u * width, (1 - v) * height];
}

/** Hàng cây xa ở đường chân trời. */
export function drawDistantTreeLine(context, width, height, color, roughnessScale = 1) {
  const horizon = height / 2;
  context.fillStyle = color;
  context.beginPath(); context.moveTo(0, horizon + 2);
  for (let x = 0; x <= width; x += width / 400) {
    const scaledX = x / roughnessScale;
    context.lineTo(x, horizon - (height * 0.01 + (Math.abs(Math.sin(scaledX * 0.011)) + Math.abs(Math.sin(scaledX * 0.047 + 1))) * height * 0.011 + random() * height * 0.005));
  }
  context.lineTo(width, horizon + 2); context.fill();
}

function createDaySky(width) {
  const height = width / 2, canvas = createCanvas(width, height), context = canvas.getContext('2d'), horizon = height / 2;
  let gradient = context.createLinearGradient(0, 0, 0, horizon);
  gradient.addColorStop(0, '#5a8cc2'); gradient.addColorStop(0.55, '#9bbfdb'); gradient.addColorStop(1, '#e6edf0');
  context.fillStyle = gradient; context.fillRect(0, 0, width, horizon);
  gradient = context.createLinearGradient(0, horizon, 0, height);
  gradient.addColorStop(0, '#b7bea8'); gradient.addColorStop(0.12, '#7d8d61'); gradient.addColorStop(1, '#46553a');
  context.fillStyle = gradient; context.fillRect(0, horizon, width, height - horizon);
  for (let cloud = 0; cloud < 90; cloud++) {
    const x = random() * width, y = horizon * (0.3 + random() * 0.62), radius = width * (0.015 + random() * 0.05), flatten = 0.22 + random() * 0.2;
    for (const offsetX of [0, -width, width]) {
      const cloudX = x + offsetX, puff = context.createRadialGradient(cloudX, y, 0, cloudX, y, radius);
      puff.addColorStop(0, 'rgba(255,255,255,0.5)'); puff.addColorStop(1, 'rgba(255,255,255,0)');
      context.save(); context.translate(cloudX, y); context.scale(1, flatten); context.translate(-cloudX, -y);
      context.fillStyle = puff; context.beginPath(); context.arc(cloudX, y, radius, 0, 7); context.fill(); context.restore();
    }
  }
  drawDistantTreeLine(context, width, height, '#4f6b45');
  const [sunX, sunY] = equirectangularPixel(new THREE.Vector3(...SUN_OFFSET).normalize(), width, height);
  for (const offsetX of [0, -width, width]) {
    const glow = context.createRadialGradient(sunX + offsetX, sunY, 0, sunX + offsetX, sunY, width * 0.13);
    glow.addColorStop(0, 'rgba(255,253,242,1)'); glow.addColorStop(0.035, 'rgba(255,249,228,0.98)'); glow.addColorStop(0.18, 'rgba(255,240,212,0.35)'); glow.addColorStop(1, 'rgba(255,240,212,0)');
    context.fillStyle = glow; context.fillRect(0, 0, width, height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

export function createEnvironmentMap(skyTexture) {
  const generator = new THREE.PMREMGenerator(viewer.renderer);
  const environmentMap = generator.fromEquirectangular(skyTexture).texture;
  generator.dispose();
  return environmentMap;
}

const nextFrame = () => new Promise(resolve => setTimeout(resolve, 0));

/** Dựng toàn bộ vật liệu thật, chia thành bước nhỏ để giao diện vẫn cập nhật tiến độ. */
export async function buildRealisticMaterials(onProgress) {
  const highResolution = isTouchDevice ? 1024 : 2048, mediumResolution = isTouchDevice ? 512 : 1024;
  const standard = options => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, ...options });
  const physical = options => new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 0, ...options });
  const scale = value => new THREE.Vector2(value, value);
  const white = () => new THREE.Color(0xffffff);
  const textures = {};

  const steps = [
    () => { textures.woodFloor = plankTextureSet(highResolution, 2.4, 0.19, 1.2, '#c8925c', { roughness: 0.42, colorVariation: 0.1, grainLines: 36 }); },
    () => { textures.tileFloor = tileTextureSet(highResolution, 2.4, 0.6, 1.2, '#e9e6e0', '#cdc8bf', { marbleVeins: 2, roughness: 0.16, speckle: 0.03, groutPixels: Math.max(2, highResolution / 700) }); },
    () => {
      textures.bathroomTile = tileTextureSet(mediumResolution, 1.2, 0.3, 0.6, '#b6bab8', '#8f9492', { speckle: 0.12, roughness: 0.5, colorVariation: 0.06 });
      textures.porchStone = tileTextureSet(mediumResolution, 1.8, 0.6, 0.6, '#b3ac9f', '#857f75', { speckle: 0.35, surfaceBumps: 0.25, roughness: 0.85, colorVariation: 0.1, normalStrength: 2.2 });
    },
    () => {
      textures.deckWood = plankTextureSet(mediumResolution, 2.4, 0.14, 2.4, '#8f6140', { roughness: 0.75, gapPixels: 3, knotChance: 0.1, gapColor: 'rgba(25,15,8,0.85)' });
      textures.deckWood.map.center.set(0.5, 0.5);
      textures.deckWood.map.rotation = Math.PI / 2; // ván hiên chạy theo trục z
    },
    () => { textures.grass = grassTextureSet(mediumResolution, 2.5); },
    () => {
      textures.plaster = noiseTextureSet(mediumResolution, 1.6, '#f4f1eb', { octaves: [[16, 1], [64, 0.7], [256, 0.5]], colorVariation: 0.012, normalStrength: 1.4 });
      textures.concrete = noiseTextureSet(mediumResolution, 2, '#c8c3b9', { octaves: [[6, 1], [24, 0.6], [128, 0.4]], colorVariation: 0.09, poreCount: 900, normalStrength: 2 });
    },
    () => {
      textures.oakGrain = woodGrainTextureSet(mediumResolution, 1.0, '#dcae7d');
      textures.wovenFabric = wovenFabricTextureSet(256, 0.06, 2.6);
      textures.boucle = noiseTextureSet(256, 0.12, '#ffffff', { octaves: [[16, 1], [48, 1]], colorVariation: 0.05, normalStrength: 5 });
      textures.rugWool = noiseTextureSet(256, 0.25, '#ffffff', { octaves: [[32, 1], [96, 0.8]], colorVariation: 0.08, normalStrength: 4 });
    },
    () => { textures.marble = marbleTextureSet(mediumResolution, 1.2); textures.bark = barkTextureSet(256, 0.6); textures.foliage = foliageTextureSet(512, 0.5); },
    () => {
      realisticAssets.environmentSky = createDaySky(isTouchDevice ? 1024 : 2048);
      realisticAssets.environmentMap = createEnvironmentMap(realisticAssets.environmentSky);
    },
  ];
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    if (onProgress) onProgress(stepIndex / steps.length);
    await nextFrame();
    steps[stepIndex]();
  }

  const { woodFloor, tileFloor, bathroomTile, porchStone, deckWood, grass, plaster, concrete, oakGrain, wovenFabric, boucle, rugWool, marble, bark, foliage } = textures;
  Object.assign(realisticMaterials, {
    wall: standard({ color: 0xf6f3ee, map: plaster.map, normalMap: plaster.normalMap, normalScale: scale(0.4), roughness: 0.9 }),
    wallCap: standard({ color: 0x394041, roughness: 0.85 }),
    woodFloor: physical({ ...woodFloor, normalScale: scale(0.7), clearcoat: 0.3, clearcoatRoughness: 0.22 }),
    tileFloor: standard({ ...tileFloor, normalScale: scale(0.6) }),
    bathroomTile: standard({ ...bathroomTile }),
    porchStone: standard({ ...porchStone }),
    deckWood: standard({ ...deckWood }),
    grass: standard({ map: grass.map, normalMap: grass.normalMap, normalScale: scale(0.9), envMapIntensity: 0.6 }),
    oak: physical({ map: oakGrain.map, normalMap: oakGrain.normalMap, normalScale: scale(0.35), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    darkOak: physical({ color: 0x7f5c43, map: oakGrain.map, normalMap: oakGrain.normalMap, normalScale: scale(0.35), roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    whiteLacquer: physical({ color: 0xf3f1ec, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    linen: physical({ color: 0xf1f2f3, map: wovenFabric.map, normalMap: wovenFabric.normalMap, normalScale: scale(0.5), sheen: 0.6, sheenRoughness: 0.8, sheenColor: white() }),
    stripedBedding: physical({ map: basicMaterials.stripedBedding.map, sheen: 0.5, sheenRoughness: 0.8, sheenColor: white() }),
    sofaFabric: physical({ color: 0xd2c9ba, map: wovenFabric.map, normalMap: wovenFabric.normalMap, normalScale: scale(0.8), sheen: 0.5, sheenRoughness: 0.7, sheenColor: white() }),
    boucle: physical({ color: 0xf1eee7, map: boucle.map, normalMap: boucle.normalMap, normalScale: scale(1), sheen: 0.4, sheenRoughness: 0.9, sheenColor: white() }),
    darkTrim: standard({ color: 0x24282a, roughness: 0.6 }),
    blackMetal: standard({ color: 0x1a1d1f, roughness: 0.32, metalness: 0.7 }),
    steel: standard({ color: 0xd2d6d9, roughness: 0.2, metalness: 1 }),
    fridgeSteel: standard({ color: 0xe4e6e7, roughness: 0.3, metalness: 0.3 }),
    countertopStone: standard({ map: marble.map, roughness: 0.16 }),
    glass: physical({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.2, envMapIntensity: 2.6, depthWrite: false }),
    mirror: standard({ color: 0xf0f3f4, roughness: 0.02, metalness: 1 }),
    foliageMedium: standard({ color: 0x8fbd6c, map: foliage.map, normalMap: foliage.normalMap, roughness: 0.72 }),
    foliageLight: standard({ color: 0xa9cd7f, map: foliage.map, normalMap: foliage.normalMap, roughness: 0.72 }),
    foliageDark: standard({ color: 0x78a65c, map: foliage.map, normalMap: foliage.normalMap, roughness: 0.72 }),
    bark: standard({ map: bark.map, normalMap: bark.normalMap }),
    ceramicPot: physical({ color: 0xe8e3da, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    terracottaFabric: physical({ color: 0xb35a3c, map: wovenFabric.map, normalMap: wovenFabric.normalMap, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffd9c4) }),
    rugWool: standard({ color: 0xd8cdb8, map: rugWool.map, normalMap: rugWool.normalMap }),
    screen: standard({ color: 0x0b0d0f, roughness: 0.1, metalness: 0.4, emissive: 0x05080a }),
    concrete: standard({ map: concrete.map, normalMap: concrete.normalMap, roughness: 0.95 }),
    roofSlab: standard({ color: 0xf3f1ec, map: plaster.map, normalMap: plaster.normalMap, normalScale: scale(0.35), roughness: 0.9 }),
    fencePaint: standard({ color: 0xf6f5f1, roughness: 0.6 }),
    steppingStone: standard({ color: 0xe2dcd2, map: porchStone.map, normalMap: porchStone.normalMap, roughness: 0.9 }),
    lampShade: standard({ color: 0xf3ead8, emissive: 0x6b5a3a, emissiveIntensity: 0.25 }),
    paintingCanvas: basicMaterials.paintingCanvas,
    water: physical({ color: 0xc6dde2, roughness: 0.04, clearcoat: 1 }),
    bookCovers: basicMaterials.bookCovers.map(material => standard({ color: material.color.clone(), roughness: 0.72 })),
  });
  // Ghi lại độ phản chiếu gốc để giảm khi bật mái (trong nhà không thấy trời).
  Object.values(realisticMaterials).flat().forEach(material => { material.userData.baseEnvironmentIntensity = material.envMapIntensity; });
  for (const key of Object.keys(basicMaterials)) if (!(key in realisticMaterials)) realisticMaterials[key] = basicMaterials[key];
  realisticAssets.built = true;
}

export function forEachRealisticMaterial(callback) {
  Object.values(realisticMaterials).flat().forEach(callback);
}
