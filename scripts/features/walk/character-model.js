/** Nhân vật đơn giản cao khoảng 1,75 m: chân và tay đung đưa khi đi. Mặt trước hướng +z. */
import { createStandardMaterial } from '../../viewer3d/materials.js';

export function createCharacterModel(eyeMaterial) {
  const group = new THREE.Group();
  const skin = createStandardMaterial(0xe0b48c, { roughness: 0.75 });
  const shirt = createStandardMaterial(0x2f6f73, { roughness: 0.9 });
  const trousers = createStandardMaterial(0x2d3a4a, { roughness: 0.9 });
  const hairMaterial = createStandardMaterial(0x2a211c, { roughness: 0.9 });
  const shoeMaterial = createStandardMaterial(0x1d1d1f, { roughness: 0.7 });
  const capsule = (radius, length, material) => new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), material);
  const legs = [], arms = [];

  [-1, 1].forEach(side => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.095, 0.86, 0);
    const legMesh = capsule(0.068, 0.62, trousers);
    legMesh.position.y = -0.4;
    leg.add(legMesh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.25), shoeMaterial);
    shoe.position.set(0, -0.82, 0.04);
    leg.add(shoe);
    group.add(leg);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(side * 0.235, 1.4, 0);
    arm.rotation.z = side * 0.06;
    const sleeve = capsule(0.055, 0.4, shirt);
    sleeve.position.y = -0.24;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin);
    hand.position.y = -0.52;
    arm.add(hand);
    group.add(arm);
    arms.push(arm);
  });

  const torso = capsule(0.17, 0.34, shirt);
  torso.position.y = 1.2;
  torso.scale.set(1.12, 1, 0.72);
  group.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.09, 12), skin);
  neck.position.y = 1.53;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), skin);
  head.position.y = 1.65;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.123, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMaterial);
  hair.position.set(0, 1.665, -0.012);
  hair.rotation.x = -0.28;
  group.add(hair);
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeMaterial);
    eye.position.set(side * 0.042, 1.665, 0.105);
    group.add(eye);
  });
  group.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  return { group, legs, arms };
}

/** Đặt nhân vật vào vị trí và tạo dáng đi theo pha bước. */
export function poseCharacterModel(model, { x, y, z, heading, stridePhase, strideAmplitude, visible }) {
  model.group.position.set(x, y + Math.abs(Math.sin(stridePhase)) * 0.03 * strideAmplitude, z);
  model.group.rotation.y = heading;
  const swing = Math.sin(stridePhase) * strideAmplitude;
  model.legs[0].rotation.x = swing;
  model.legs[1].rotation.x = -swing;
  model.arms[0].rotation.x = -swing * 0.8;
  model.arms[1].rotation.x = swing * 0.8;
  model.group.visible = visible;
}
