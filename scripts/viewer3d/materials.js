/**
 * Bộ vật liệu 3D. `materials` là bộ đang dùng; khi bật "Vật liệu thật" các khoá trong `materials`
 * được trỏ sang `realisticMaterials`, tắt thì trỏ lại `basicMaterials`.
 */
import { seededRandom } from '../core/random.js';
import { createCanvasTexture, shadeHexColor } from './texture-utils.js';

export const materials = {};
export const basicMaterials = {};
export const realisticMaterials = {};
/** Tài nguyên của chế độ vật liệu thật: bầu trời ban ngày và bản đồ môi trường để phản chiếu. */
export const realisticAssets = { built: false, environmentMap: null, environmentSky: null };
/** Vật liệu bóng đèn: chỉ phát sáng ban đêm, không đổi theo chế độ vật liệu. */
export const lightBulbMaterials = { indoor: null, outdoor: null };

export const floorMaterialForFinish = finish => ({
  wood: materials.woodFloor, tile: materials.tileFloor, wet: materials.bathroomTile, porch: materials.porchStone, deck: materials.deckWood,
}[finish]);
export const foliageMaterials = () => [materials.foliageMedium, materials.foliageLight, materials.foliageDark];

export function createStandardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...options });
}

/* ---------- vân vẽ bằng canvas cho bộ cơ bản ---------- */
function plankTexture(baseColor, worldSize, plankWidth, plankLength, vertical = false) {
  return createCanvasTexture(1024, 1024, (context, size) => {
    const pixelsPerMeter = size / worldSize, rows = Math.round(worldSize / plankWidth);
    for (let row = 0; row < rows; row++) {
      const offset = ((row * 0.37) % 1) * plankLength * pixelsPerMeter;
      for (let along = -offset; along < size; along += plankLength * pixelsPerMeter) {
        const x = vertical ? row * plankWidth * pixelsPerMeter : along, y = vertical ? along : row * plankWidth * pixelsPerMeter;
        const width = vertical ? plankWidth * pixelsPerMeter : plankLength * pixelsPerMeter, height = vertical ? plankLength * pixelsPerMeter : plankWidth * pixelsPerMeter;
        context.fillStyle = shadeHexColor(baseColor, (seededRandom() - 0.5) * 0.16);
        context.fillRect(x, y, width, height);
        context.globalAlpha = 0.12; context.strokeStyle = '#4a2b12'; context.lineWidth = 1;
        for (let grain = 0; grain < 5; grain++) {
          context.beginPath();
          if (vertical) { const grainX = x + seededRandom() * width; context.moveTo(grainX, y); context.bezierCurveTo(grainX + 3, y + height * 0.3, grainX - 3, y + height * 0.6, grainX + 1, y + height); }
          else { const grainY = y + seededRandom() * height; context.moveTo(x, grainY); context.bezierCurveTo(x + width * 0.3, grainY + 3, x + width * 0.6, grainY - 3, x + width, grainY + 1); }
          context.stroke();
        }
        context.globalAlpha = 0.5; context.fillStyle = '#5a3a1e';
        if (vertical) { context.fillRect(x, y, 1.5, height); context.fillRect(x, y, width, 1.5); }
        else { context.fillRect(x, y, width, 1.5); context.fillRect(x, y, 1.5, height); }
        context.globalAlpha = 1;
      }
    }
  }, { repeat: [1 / worldSize, 1 / worldSize] });
}

function tileTexture(baseColor, groutColor, worldSize, tileWidth, tileLength, colorVariation = 0.05) {
  return createCanvasTexture(1024, 1024, (context, size) => {
    const pixelsPerMeter = size / worldSize;
    context.fillStyle = groutColor; context.fillRect(0, 0, size, size);
    for (let y = 0; y < worldSize - 1e-6; y += tileLength) {
      for (let x = 0; x < worldSize - 1e-6; x += tileWidth) {
        context.fillStyle = shadeHexColor(baseColor, (seededRandom() - 0.5) * colorVariation);
        context.fillRect(x * pixelsPerMeter + 1.5, y * pixelsPerMeter + 1.5, tileWidth * pixelsPerMeter - 3, tileLength * pixelsPerMeter - 3);
        context.globalAlpha = 0.05;
        for (let cloud = 0; cloud < 6; cloud++) {
          context.fillStyle = seededRandom() > 0.5 ? '#ffffff' : '#8a8378';
          context.beginPath();
          context.ellipse(x * pixelsPerMeter + seededRandom() * tileWidth * pixelsPerMeter, y * pixelsPerMeter + seededRandom() * tileLength * pixelsPerMeter, 20 + seededRandom() * 60, 8 + seededRandom() * 20, seededRandom() * 3, 0, 7);
          context.fill();
        }
        context.globalAlpha = 1;
      }
    }
  }, { repeat: [1 / worldSize, 1 / worldSize] });
}

function grassTexture() {
  return createCanvasTexture(512, 512, (context, size) => {
    context.fillStyle = '#6f9a4c'; context.fillRect(0, 0, size, size);
    const greens = ['#6f9a4c', '#5f8a40', '#80aa58', '#557d3a'];
    for (let blade = 0; blade < 9000; blade++) {
      context.fillStyle = shadeHexColor(greens[blade % 4], (seededRandom() - 0.5) * 0.2);
      context.fillRect(seededRandom() * size, seededRandom() * size, 2, 3 + seededRandom() * 4);
    }
  }, { repeat: [1 / 4, 1 / 4] });
}

function stripedBeddingTexture() {
  return createCanvasTexture(64, 64, (context, size) => {
    context.fillStyle = '#f3f4f5'; context.fillRect(0, 0, size, size);
    context.fillStyle = '#a9b0b6';
    for (let x = 0; x < size; x += 8) context.fillRect(x, 0, 2, size);
  }, { repeat: [10, 1] });
}

/** Tranh hoa treo đầu giường (giống tranh trong video). */
function floralPaintingTexture() {
  return createCanvasTexture(256, 320, (context, width, height) => {
    context.fillStyle = '#e6e9e0'; context.fillRect(0, 0, width, height);
    const bloom = (x, y, radius, innerColor, outerColor) => {
      const gradient = context.createRadialGradient(x, y, 2, x, y, radius);
      gradient.addColorStop(0, innerColor); gradient.addColorStop(1, outerColor);
      context.fillStyle = gradient; context.beginPath(); context.arc(x, y, radius, 0, 7); context.fill();
    };
    for (let leaf = 0; leaf < 14; leaf++) {
      context.save();
      context.translate(30 + seededRandom() * 196, 40 + seededRandom() * 240);
      context.rotate(seededRandom() * 3);
      context.fillStyle = ['#5f7d4f', '#7d9a62', '#3f5a3a'][leaf % 3];
      context.beginPath(); context.ellipse(0, 0, 34, 10, 0, 0, 7); context.fill();
      context.restore();
    }
    for (let stem = 0; stem < 6; stem++) {
      context.strokeStyle = '#5a3b2b'; context.lineWidth = 3; context.beginPath();
      context.moveTo(seededRandom() * width, seededRandom() * height);
      context.quadraticCurveTo(seededRandom() * width, seededRandom() * height, seededRandom() * width, seededRandom() * height);
      context.stroke();
    }
    bloom(110, 120, 48, '#fbf3f2', '#e9c4c6'); bloom(165, 180, 40, '#ffffff', '#dcbfc4');
    bloom(85, 215, 34, '#f6e3e6', '#c99aa3'); bloom(150, 95, 22, '#ffffff', '#e6d3d6');
  });
}

export function createBasicMaterials() {
  const standard = createStandardMaterial;
  Object.assign(basicMaterials, {
    wall: standard(0xf3f1ec, { roughness: 0.95 }),
    wallCap: standard(0x3a4142, { roughness: 0.9 }),
    woodFloor: standard(0xffffff, { map: plankTexture('#c08a56', 2.4, 0.19, 1.2), roughness: 0.6 }),
    tileFloor: standard(0xffffff, { map: tileTexture('#ebe9e4', '#d3cfc7', 2.4, 0.6, 1.2), roughness: 0.35 }),
    bathroomTile: standard(0xffffff, { map: tileTexture('#c4c8c6', '#9fa4a2', 1.2, 0.3, 0.6, 0.08), roughness: 0.5 }),
    porchStone: standard(0xffffff, { map: tileTexture('#b9b3a8', '#8f897f', 1.8, 0.6, 0.6, 0.1), roughness: 0.8 }),
    deckWood: standard(0xffffff, { map: plankTexture('#8d5f3b', 2.4, 0.14, 2.4, true), roughness: 0.8 }),
    grass: standard(0xffffff, { map: grassTexture(), roughness: 1 }),
    oak: standard(0xc49162, { roughness: 0.65 }),
    darkOak: standard(0x8a5a35, { roughness: 0.6 }),
    whiteLacquer: standard(0xf4f2ee, { roughness: 0.7 }),
    linen: standard(0xeef0f1, { roughness: 0.95 }),
    stripedBedding: standard(0xffffff, { map: stripedBeddingTexture(), roughness: 0.95 }),
    sofaFabric: standard(0xd8d0c2, { roughness: 1 }),
    boucle: standard(0xf1eee7, { roughness: 1 }),
    darkTrim: standard(0x2a2d2f, { roughness: 0.6 }),
    blackMetal: standard(0x1d2022, { roughness: 0.45, metalness: 0.3 }),
    steel: standard(0xc3c8cb, { roughness: 0.35, metalness: 0.25 }),
    fridgeSteel: standard(0xdfe2e3, { roughness: 0.3, metalness: 0.1 }),
    countertopStone: standard(0xdedad2, { roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfe3ea, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, depthWrite: false }),
    water: standard(0xcfe2e6, { roughness: 0.08, metalness: 0.1 }),
    bookCovers: ['#7c3b2c', '#2f4e6b', '#c9a24a', '#56704a', '#d8d2c4', '#3b3b3b', '#a65a3a'].map(color => standard(color, { roughness: 0.8 })),
    mirror: standard(0xd7dde0, { roughness: 0.05, metalness: 0.95 }),
    foliageMedium: standard(0x4f7f3c, { roughness: 0.9, flatShading: true }),
    foliageLight: standard(0x6b9a48, { roughness: 0.9, flatShading: true }),
    foliageDark: standard(0x3d6b35, { roughness: 0.9, flatShading: true }),
    bark: standard(0x6e5240, { roughness: 1 }),
    ceramicPot: standard(0xe2ddd4, { roughness: 0.8 }),
    terracottaFabric: standard(0xb35a3c, { roughness: 0.95 }),
    rugWool: standard(0xd6cbb6, { roughness: 1 }),
    screen: standard(0x111315, { roughness: 0.2, metalness: 0.2, emissive: 0x0b0e10 }),
    concrete: standard(0xcfcac1, { roughness: 0.95 }),
    roofSlab: standard(0xf1efea, { roughness: 0.9 }),
    fencePaint: standard(0xf6f5f1, { roughness: 0.8 }),
    steppingStone: standard(0xbdb6aa, { roughness: 0.95 }),
    lampShade: standard(0xf3ead8, { roughness: 0.9, emissive: 0x6b5a3a, emissiveIntensity: 0.25 }),
    paintingCanvas: standard(0xffffff, { map: floralPaintingTexture(), roughness: 0.9 }),
  });
  Object.assign(materials, basicMaterials);
  lightBulbMaterials.indoor = standard(0xf6f3ec, { roughness: 0.5, emissive: 0xffd29a, emissiveIntensity: 0 });
  lightBulbMaterials.outdoor = standard(0xf6f3ec, { roughness: 0.5, emissive: 0xffc98a, emissiveIntensity: 0 });
}
