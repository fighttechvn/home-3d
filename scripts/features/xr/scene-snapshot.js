/**
 * Ảnh chụp nhẹ của cảnh để xem AR / VR: gộp mọi mặt lưới theo vật liệu (một mặt lưới cho mỗi màu),
 * đã nhân sẵn vị trí thế giới, giữ màu, độ nhám, độ kim loại, độ trong và (tuỳ chọn) ảnh vân màu.
 * Dùng chung cho file USDZ (AR Quick Look trên iPhone, iPad) và cảnh WebXR AR (Android).
 *
 * Với ngôi nhà: lấy nền, sàn, tường, mái (tuỳ chọn), đồ nội thất và đèn gắn tường; bỏ bãi cỏ 90 × 100 m, cây,
 * hàng rào và nhân vật để file nhỏ và nhà đặt gọn lên mặt sàn thật; ảnh vân đổi thành màu trung bình.
 * Với mô hình người dùng mở (model-import.js): giữ ảnh vân màu để không mất chi tiết.
 */
import { viewer } from '../../viewer3d/viewer-context.js';
import { materials, lightBulbMaterials } from '../../viewer3d/materials.js';

const POSITION_PRECISION = 1000; // làm tròn tới mm khi gộp đỉnh trùng nhau
const NORMAL_PRECISION = 100;

const textureColorCache = new WeakMap();

/** Màu trung bình (tuyến tính) của ảnh vân, để vật liệu có vân gỗ / gạch vẫn đúng tông khi bỏ ảnh. */
function averageTextureColor(texture) {
  if (!texture) return null;
  if (textureColorCache.has(texture)) return textureColorCache.get(texture);
  let color = null;
  const image = texture.image;
  try {
    if (isDrawable(image)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 16;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 16, 16);
      const pixels = context.getImageData(0, 0, 16, 16).data;
      let red = 0, green = 0, blue = 0;
      for (let index = 0; index < pixels.length; index += 4) { red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; }
      const count = pixels.length / 4;
      color = new THREE.Color(red / count / 255, green / count / 255, blue / count / 255).convertSRGBToLinear();
    }
  } catch { color = null; } // ảnh khác nguồn hoặc chưa tải xong: dùng màu vật liệu
  textureColorCache.set(texture, color);
  return color;
}

const isDrawable = image => !!image && image.width > 0 && image.height > 0 && (
  image instanceof HTMLCanvasElement || image instanceof HTMLImageElement
  || (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
  || (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas));

const materialInfoCache = new WeakMap(), texturedInfoCache = new WeakMap();

function describeMaterial(material, keepTextures) {
  const cache = keepTextures ? texturedInfoCache : materialInfoCache;
  if (cache.has(material)) return cache.get(material);
  let info = null;
  const skipped = !material || material.visible === false || material === materials.grass
    || material === lightBulbMaterials.indoor || material === lightBulbMaterials.outdoor
    || (material.transparent && material.opacity < 0.05) || material.depthTest === false;
  if (!skipped) {
    const color = material.color ? material.color.clone() : new THREE.Color(1, 1, 1);
    const texture = keepTextures && material.map && isDrawable(material.map.image) ? material.map : null;
    const textureColor = texture ? null : averageTextureColor(material.map);
    if (textureColor) color.multiply(textureColor);
    const opacity = material.transparent ? Math.max(0.12, material.opacity) : 1;
    // Kênh alpha của ảnh vân dùng làm độ trong (lá cây, hàng rào lưới…) khi vật liệu trong suốt hoặc cắt alpha.
    const textureAlpha = !!texture && (material.transparent || material.alphaTest > 0);
    const roughness = typeof material.roughness === 'number' ? material.roughness : 0.8;
    const metalness = typeof material.metalness === 'number' ? material.metalness : 0;
    const doubleSided = material.side === THREE.DoubleSide;
    const round = value => Math.round(value * 255);
    info = {
      key: [round(color.r), round(color.g), round(color.b), round(opacity), Math.round(roughness * 10), Math.round(metalness * 10), doubleSided ? 1 : 0,
        texture ? texture.uuid : '', textureAlpha ? 1 : 0].join('.'),
      color: [color.r, color.g, color.b], opacity, roughness, metalness, doubleSided, texture, textureAlpha,
      alphaCutoff: textureAlpha && material.alphaTest > 0 ? material.alphaTest : 0,
    };
  }
  cache.set(material, info);
  return info;
}

function createBucket(info) {
  return { ...info, positions: [], normals: [], uvs: info.texture ? [] : null, indices: [], vertexIndexByKey: new Map() };
}

const point = window.THREE ? new THREE.Vector3() : null;
const normal = window.THREE ? new THREE.Vector3() : null;
const normalMatrix = window.THREE ? new THREE.Matrix3() : null;
const uv = window.THREE ? new THREE.Vector2() : null;
const UV_PRECISION = 10000;

/**
 * Toạ độ ảnh vân theo quy ước USD: (0, 0) là góc dưới trái của ảnh. Đã nhân phép dời / lặp / xoay của ảnh vân.
 * Three.js lật ảnh khi tải lên nếu flipY (ảnh thường); ảnh của glTF thì không, nên v phải đảo lại.
 */
function textureUv(texture, uvAttribute, vertexIndex) {
  uv.fromBufferAttribute(uvAttribute, vertexIndex);
  if (texture.matrixAutoUpdate) texture.updateMatrix();
  uv.applyMatrix3(texture.matrix);
  if (!texture.flipY) uv.y = 1 - uv.y;
  return uv;
}

function addVertex(bucket, geometry, vertexIndex, matrix) {
  const positionAttribute = geometry.attributes.position, normalAttribute = geometry.attributes.normal;
  point.fromBufferAttribute(positionAttribute, vertexIndex).applyMatrix4(matrix);
  normal.fromBufferAttribute(normalAttribute, vertexIndex).applyMatrix3(normalMatrix).normalize();
  let key = `${Math.round(point.x * POSITION_PRECISION)},${Math.round(point.y * POSITION_PRECISION)},${Math.round(point.z * POSITION_PRECISION)},`
    + `${Math.round(normal.x * NORMAL_PRECISION)},${Math.round(normal.y * NORMAL_PRECISION)},${Math.round(normal.z * NORMAL_PRECISION)}`;
  const uvAttribute = bucket.uvs && geometry.attributes.uv;
  if (bucket.uvs) {
    if (uvAttribute) textureUv(bucket.texture, uvAttribute, vertexIndex); else uv.set(0, 0);
    key += `,${Math.round(uv.x * UV_PRECISION)},${Math.round(uv.y * UV_PRECISION)}`;
  }
  let index = bucket.vertexIndexByKey.get(key);
  if (index === undefined) {
    index = bucket.positions.length / 3;
    bucket.positions.push(point.x, point.y, point.z);
    bucket.normals.push(normal.x, normal.y, normal.z);
    if (bucket.uvs) bucket.uvs.push(uv.x, uv.y);
    bucket.vertexIndexByKey.set(key, index);
  }
  return index;
}

function appendGeometry(bucket, geometry, matrix, start, count) {
  const index = geometry.index, mirrored = matrix.determinant() < 0;
  normalMatrix.getNormalMatrix(matrix);
  const end = Math.min(start + count, index ? index.count : geometry.attributes.position.count);
  for (let corner = start; corner + 2 < end; corner += 3) {
    const a = index ? index.getX(corner) : corner, b = index ? index.getX(corner + 1) : corner + 1, c = index ? index.getX(corner + 2) : corner + 2;
    const first = addVertex(bucket, geometry, a, matrix), second = addVertex(bucket, geometry, b, matrix), third = addVertex(bucket, geometry, c, matrix);
    if (first === second || second === third || first === third) continue; // tam giác suy biến sau khi làm tròn
    if (mirrored) bucket.indices.push(first, third, second);
    else bucket.indices.push(first, second, third);
  }
}

function collectMesh(mesh, bucketsByKey, keepTextures) {
  let geometry = mesh.geometry;
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  if (!geometry.attributes.normal) { geometry = geometry.clone(); geometry.computeVertexNormals(); }
  const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const totalCount = geometry.index ? geometry.index.count : geometry.attributes.position.count;
  const drawStart = geometry.drawRange.start, drawCount = Math.min(geometry.drawRange.count, totalCount - drawStart);
  const ranges = Array.isArray(mesh.material) && geometry.groups.length
    ? geometry.groups.map(group => ({ start: Math.max(group.start, drawStart), count: group.count, material: materialList[group.materialIndex] }))
    : [{ start: drawStart, count: drawCount, material: materialList[0] }];
  const matrices = [];
  if (mesh.isInstancedMesh) {
    const instanceMatrix = new THREE.Matrix4();
    for (let instance = 0; instance < mesh.count; instance++) {
      mesh.getMatrixAt(instance, instanceMatrix);
      matrices.push(mesh.matrixWorld.clone().multiply(instanceMatrix));
    }
  } else matrices.push(mesh.matrixWorld);
  for (const range of ranges) {
    const info = range.material && describeMaterial(range.material, keepTextures);
    if (!info) continue;
    if (!bucketsByKey.has(info.key)) bucketsByKey.set(info.key, createBucket(info));
    const bucket = bucketsByKey.get(info.key);
    matrices.forEach(matrix => appendGeometry(bucket, geometry, matrix, range.start, range.count));
  }
}

/**
 * Chụp các nhóm đang hiển thị. Toạ độ trả về đã dời để tâm nằm ở gốc (x, z) và đáy ở y = 0.
 * keepTextures: giữ ảnh vân màu (bucket.texture, bucket.uvs) thay vì đổi thành màu trung bình.
 * @returns {{ buckets: Array, size: number[], triangleCount: number, vertexCount: number }}
 */
export function captureSnapshot(roots, { keepTextures = false } = {}) {
  const bucketsByKey = new Map();
  for (const root of roots) {
    if (!root || !root.visible) continue;
    root.updateWorldMatrix(true, true);
    root.traverseVisible(object => { if (object.isMesh && !object.userData.excludeFromExport) collectMesh(object, bucketsByKey, keepTextures); });
  }
  const buckets = [...bucketsByKey.values()].filter(bucket => bucket.indices.length);
  const box = new THREE.Box3();
  for (const bucket of buckets) {
    for (let index = 0; index < bucket.positions.length; index += 3) box.expandByPoint(point.fromArray(bucket.positions, index));
  }
  const offset = box.isEmpty() ? new THREE.Vector3() : new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  let triangleCount = 0, vertexCount = 0;
  for (const bucket of buckets) {
    const positions = new Float32Array(bucket.positions);
    for (let index = 0; index < positions.length; index += 3) { positions[index] += offset.x; positions[index + 1] += offset.y; positions[index + 2] += offset.z; }
    bucket.positions = positions;
    bucket.normals = new Float32Array(bucket.normals);
    if (bucket.uvs) bucket.uvs = new Float32Array(bucket.uvs);
    bucket.indices = new Uint32Array(bucket.indices);
    delete bucket.vertexIndexByKey;
    triangleCount += bucket.indices.length / 3;
    vertexCount += positions.length / 3;
  }
  const size = box.isEmpty() ? [0, 0, 0] : box.getSize(new THREE.Vector3()).toArray();
  return { buckets, size, triangleCount, vertexCount };
}

/** Chụp ngôi nhà đang hiển thị (không lấy bãi cỏ, cây, hàng rào, nhân vật). */
export function captureHouseSnapshot({ includeRoof = false } = {}) {
  const { groups } = viewer;
  const roots = [groups.base, groups.walls, groups.furniture, groups.wallFixtures];
  if (includeRoof) roots.push(groups.roof);
  return captureSnapshot(roots);
}

/** Dựng lại ảnh chụp thành nhóm Three.js (cho WebXR AR). Gọi disposeSnapshotGroup khi xong. */
export function buildSnapshotGroup(snapshot) {
  const group = new THREE.Group();
  for (const bucket of snapshot.buckets) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(bucket.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(bucket.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(bucket.indices, 1));
    let map = null;
    if (bucket.texture) {
      // uvs đã theo quy ước USD (gốc dưới trái), nên dùng bản sao ảnh vân có flipY và không biến đổi thêm.
      geometry.setAttribute('uv', new THREE.BufferAttribute(bucket.uvs, 2));
      map = bucket.texture.clone();
      map.flipY = true;
      map.offset.set(0, 0); map.repeat.set(1, 1); map.rotation = 0; map.center.set(0, 0);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.needsUpdate = true;
    }
    const transparent = bucket.opacity < 1 || (bucket.textureAlpha && !bucket.alphaCutoff);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(...bucket.color), roughness: bucket.roughness, metalness: bucket.metalness, map,
      transparent, opacity: bucket.opacity, alphaTest: bucket.alphaCutoff || 0, side: bucket.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: !transparent,
    });
    group.add(new THREE.Mesh(geometry, material));
  }
  return group;
}

export function disposeSnapshotGroup(group) {
  group.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (object.material.map) object.material.map.dispose(); // bản sao riêng, ảnh gốc vẫn thuộc cảnh chính
    object.material.dispose();
  });
}
