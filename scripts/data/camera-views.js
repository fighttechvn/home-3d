/**
 * Góc nhìn camera 3D (toạ độ thế giới [x, y, z], y là chiều cao).
 * fit: 'overview' | 'topDown' được tính theo tỉ lệ khung hình. eyeLevel: góc nhìn trong phòng (kéo để nhìn quanh).
 * showRoof: bật mái khi tới góc nhìn ngoài trời.
 */
export const CAMERA_VIEWS = {
  'overview':       { fit: 'overview' },
  'top-down':       { fit: 'topDown' },
  'front-facade':   { position: [3.5, 1.75, 26.6], target: [3.5, 1.75, 19], fieldOfView: 52, showRoof: true },
  'garden':         { position: [13.8, 2.3, 13.6], target: [6.0, 1.3, 13.4], fieldOfView: 52, showRoof: true },
  'porch':          { position: [6.05, 1.6, 23.2], target: [6.05, 1.35, 17.6], fieldOfView: 60, showRoof: true },
  'master-bedroom': { position: [3.35, 1.5, 4.75], target: [6.7, 1.15, 1.75], fieldOfView: 70, eyeLevel: true },
  'bathroom':       { position: [1.95, 1.5, 2.45], target: [2.6, 1.2, 0.3], fieldOfView: 72, eyeLevel: true },
  'washbasin':      { position: [0.55, 1.5, 3.3], target: [2.9, 1.25, 3.25], fieldOfView: 70, eyeLevel: true },
  'hallway':        { position: [0.8, 1.5, 9.4], target: [0.8, 1.3, 0.1], fieldOfView: 66, eyeLevel: true },
  'dining-room':    { position: [1.15, 1.5, 6.45], target: [3.35, 1.05, 15.6], fieldOfView: 70, eyeLevel: true },
  'bedroom-2':      { position: [4.1, 1.5, 9.95], target: [6.8, 0.95, 6.6], fieldOfView: 70, eyeLevel: true },
  'kitchen':        { position: [5.4, 1.55, 11.9], target: [0.9, 0.95, 14.0], fieldOfView: 70, eyeLevel: true },
  'family-area':    { position: [3.55, 1.5, 15.3], target: [6.9, 1.25, 12.4], fieldOfView: 70, eyeLevel: true },
  'living-room':    { position: [4.35, 1.55, 15.95], target: [0.6, 0.85, 18.1], fieldOfView: 70, eyeLevel: true },
  'foyer':          { position: [6.05, 1.5, 17.35], target: [3.2, 1.2, 11.0], fieldOfView: 70, eyeLevel: true },
};

/** Khoảng cách từ camera tới điểm nhìn trong góc nhìn trong phòng (kéo sẽ xoay quanh điểm rất gần này). */
export const EYE_LEVEL_TARGET_DISTANCE = 0.6;
