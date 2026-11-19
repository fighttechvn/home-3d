/**
 * Khối hình 3D cơ bản. Hình dựng từ mặt bằng (Shape theo x, y bản vẽ) được đùn lên theo chiều cao
 * và xoay để y bản vẽ thành trục z thế giới.
 */
import { seededRandom } from '../core/random.js';

/** UV hộp theo mét để vân gỗ, vân đá không bị kéo giãn trên mặt dài. */
export function applyBoxWorldUv(geometry, width, height, depth) {
  const uv = geometry.attributes.uv;
  const faceSizes = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  for (let face = 0; face < 6; face++) {
    for (let corner = 0; corner < 4; corner++) {
      const index = face * 4 + corner;
      uv.setXY(index, uv.getX(index) * faceSizes[face][0], uv.getY(index) * faceSizes[face][1]);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

export function addBox(parent, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(applyBoxWorldUv(new THREE.BoxGeometry(width, height, depth), width, height, depth), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function addCylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, radialSegments = 28) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** Đùn một Shape mặt bằng từ cao độ baseHeight lên thêm height. */
export function extrudePlanShape(parent, shape, baseHeight, height, material, curveSegments = 16) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = baseHeight + height;
  parent.add(mesh);
  return mesh;
}

export function polygonToShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => (index ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  return shape;
}

export function roundedRectangleShape(x, y, width, depth, radius) {
  const r = Math.max(0.001, Math.min(radius, width / 2 - 0.002, depth / 2 - 0.002));
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + depth - r);
  shape.absarc(x + width - r, y + depth - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + depth);
  shape.absarc(x + r, y + depth - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** Khối cầu gợn sóng làm tán lá (chế độ vật liệu thật). */
export function createBlobGeometry(radius, amplitude, widthSegments = 22, heightSegments = 16) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const positions = geometry.attributes.position, vertex = new THREE.Vector3(), phase = seededRandom() * 10;
  for (let index = 0; index < positions.count; index++) {
    vertex.fromBufferAttribute(positions, index);
    const direction = vertex.clone().normalize();
    const bulge = 1 + amplitude * (Math.sin(direction.x * 5.3 + phase) * 0.45 + Math.sin(direction.y * 6.1 + phase * 1.7) * 0.35
      + Math.sin(direction.z * 7.7 + phase * 0.6) * 0.3 + Math.sin((direction.x + direction.z) * 13 + phase) * 0.12);
    vertex.multiplyScalar(bulge);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Bật đổ bóng cho mọi mesh, trừ mesh đánh dấu userData.noShadow (kính, đèn). */
export function enableShadows(root) {
  root.traverse(object => {
    if (object.isMesh) { object.castShadow = !object.userData.noShadow; object.receiveShadow = true; }
  });
}

export function disposeGroup(group) {
  if (!group) return;
  if (group.parent) group.parent.remove(group);
  group.traverse(object => { if (object.geometry) object.geometry.dispose(); });
}
