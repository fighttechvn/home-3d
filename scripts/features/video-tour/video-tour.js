/**
 * Video tham quan kiểu điện ảnh: camera lia qua từng cảnh, khung viền đen 2,35:1, chú thích và chuyển cảnh.
 * Có thể xem trước hoặc quay thành tệp .mp4 / .webm rồi lưu qua khả năng "downloads" của trình xem.
 */
import { getElement, easeInOutSine, escapeHtml, t } from '../../core/dom.js';
import { appState, interactionState } from '../../core/app-state.js';
import { emitEvent } from '../../core/events.js';
import { TOUR_SHOTS, END_CARD_SECONDS } from '../../data/tour-shots.js';
import { viewer, displaySettings, SCENE_CENTER } from '../../viewer3d/viewer-context.js';
import { startRenderLoop, stopRenderLoop, resizeViewer } from '../../viewer3d/viewer.js';
import { setRoofVisible, setCutWalls } from '../../viewer3d/display-settings.js';
import { cancelCameraFlight } from '../../viewer3d/camera-controller.js';
import { hideRoomLabels } from '../../viewer3d/room-labels.js';
import { setRealisticMode } from '../../viewer3d/realistic-mode.js';
import { setNightMode } from '../../viewer3d/lighting.js';

const SHOTS_TOTAL_SECONDS = TOUR_SHOTS.reduce((total, shot) => total + shot.durationSeconds, 0);
const TOUR_TOTAL_SECONDS = SHOTS_TOTAL_SECONDS + END_CARD_SECONDS;
const LETTERBOX_ASPECT_RATIO = 2.35;
const RECORDING_FRAMES_PER_SECOND = 30;
const PREFERRED_VIDEO_FORMATS = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

const tourState = {
  frameWidth: 1920, frameHeight: 1080, startTime: 0, animationFrameId: 0,
  compositeCanvas: null, compositeContext: null,
  recorder: null, recordedChunks: [], recordedVideo: null, recordedVideoUrl: null, videoMimeType: '',
  isRecording: false, keepRecording: false, savedViewState: null,
};
let downloadsCapability = null;
if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(capability => { downloadsCapability = capability; }).catch(() => {});

const setMessage = text => { getElement('#video-tour-message').textContent = text; };
const recordedFileExtension = () => (tourState.videoMimeType.includes('mp4') ? 'mp4' : 'webm');

function supportedVideoFormat() {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
  for (const format of PREFERRED_VIDEO_FORMATS) {
    try { if (MediaRecorder.isTypeSupported(format)) return format; } catch { /* trình duyệt cũ */ }
  }
  return '';
}

/** Cảnh và vị trí camera tại thời điểm `elapsedSeconds` của video. */
function cameraPoseAt(elapsedSeconds) {
  let shotStart = 0;
  for (let shotIndex = 0; shotIndex < TOUR_SHOTS.length; shotIndex++) {
    const shot = TOUR_SHOTS[shotIndex];
    if (elapsedSeconds < shotStart + shot.durationSeconds) {
      const timeInShot = elapsedSeconds - shotStart, eased = easeInOutSine(timeInShot / shot.durationSeconds);
      let position, target;
      if (shot.orbit) {
        const angle = shot.orbit.startAngle + (shot.orbit.endAngle - shot.orbit.startAngle) * eased;
        position = [SCENE_CENTER.x + Math.sin(angle) * shot.orbit.radius, shot.orbit.height, SCENE_CENTER.z + Math.cos(angle) * shot.orbit.radius];
        target = [SCENE_CENTER.x, 0, SCENE_CENTER.z];
      } else {
        position = shot.startPosition.map((value, axis) => value + (shot.endPosition[axis] - value) * eased);
        target = shot.startTarget.map((value, axis) => value + (shot.endTarget[axis] - value) * eased);
      }
      return { shotIndex, shot, timeInShot, position, target };
    }
    shotStart += shot.durationSeconds;
  }
  return { isEndCard: true, timeInEndCard: elapsedSeconds - SHOTS_TOTAL_SECONDS };
}

/* ---------- lớp phủ điện ảnh ---------- */
function drawCinematicOverlay(pose) {
  const context = tourState.compositeContext, width = tourState.frameWidth, height = tourState.frameHeight;
  const scale = height / 1080, letterboxHeight = Math.round((height - width / LETTERBOX_ASPECT_RATIO) / 2);
  const font = (weight, pixels) => `${weight} ${Math.round(pixels * scale)}px "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif`;

  if (pose.isEndCard) {
    context.fillStyle = '#000'; context.fillRect(0, 0, width, height);
    const opacity = Math.min(1, pose.timeInEndCard / 0.6) * Math.min(1, Math.max(0, (END_CARD_SECONDS - pose.timeInEndCard) / 0.5));
    context.save(); context.globalAlpha = opacity; context.textAlign = 'center';
    context.fillStyle = '#fff'; context.font = font(700, 64); context.fillText(t('Nhà Vườn Cấp 4'), width / 2, height / 2);
    context.fillStyle = '#d9a873'; context.font = font(500, 24); context.fillText(t('Mô hình 3D dựng từ bản vẽ mặt bằng · 7,0 × 19,3 m'), width / 2, height / 2 + 52 * scale);
    context.restore();
    return;
  }
  const { shot, timeInShot, shotIndex } = pose;
  const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.95);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  context.fillStyle = vignette; context.fillRect(0, 0, width, height);
  context.fillStyle = '#000'; context.fillRect(0, 0, width, letterboxHeight); context.fillRect(0, height - letterboxHeight, width, letterboxHeight);
  context.save(); context.globalAlpha = 0.7; context.fillStyle = '#fff'; context.font = font(500, 17);
  context.textAlign = 'right'; context.fillText(t('NHÀ VƯỜN CẤP 4  ·  7,0 × 19,3 m'), width - 64 * scale, letterboxHeight / 2 + 6 * scale);
  context.textAlign = 'left'; context.fillText(`${String(shotIndex + 1).padStart(2, '0')} / ${TOUR_SHOTS.length}`, 64 * scale, letterboxHeight / 2 + 6 * scale);
  context.restore();

  const captionOpacity = Math.min(1, Math.max(0, (timeInShot - 0.45) / 0.6)) * Math.min(1, Math.max(0, (shot.durationSeconds - 0.5 - timeInShot) / 0.6));
  if (captionOpacity > 0) {
    const captionX = 96 * scale, captionY = height - letterboxHeight - 64 * scale;
    const shade = context.createLinearGradient(0, height - letterboxHeight - 240 * scale, 0, height - letterboxHeight);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.5)');
    context.save(); context.globalAlpha = captionOpacity;
    context.fillStyle = shade; context.fillRect(0, height - letterboxHeight - 240 * scale, width, 240 * scale);
    context.shadowColor = 'rgba(0,0,0,0.45)'; context.shadowBlur = 16 * scale;
    context.fillStyle = '#fff'; context.font = font(700, 56); context.fillText(shot.title, captionX, captionY);
    context.fillStyle = '#ece6dc'; context.font = font(400, 25); context.fillText(shot.subtitle, captionX, captionY + 44 * scale);
    context.fillStyle = '#d9a873'; context.fillRect(captionX, captionY - 82 * scale, 56 * scale, 4 * scale);
    context.restore();
  }
  // Chuyển cảnh qua màu đen (cảnh đầu mờ dần lâu hơn).
  const fadeIn = shotIndex === 0 ? Math.max(0, 1 - timeInShot / 0.9) : Math.max(0, 1 - timeInShot / 0.4);
  const fadeOut = Math.max(0, 1 - (shot.durationSeconds - timeInShot) / 0.4), blackness = Math.max(fadeIn, fadeOut);
  if (blackness > 0) { context.fillStyle = `rgba(0,0,0,${blackness.toFixed(3)})`; context.fillRect(0, 0, width, height); }
}

/* ---------- phát ---------- */
function renderTourFrame(now) {
  if (!interactionState.touring) return;
  const elapsedSeconds = (now - tourState.startTime) / 1000, pose = cameraPoseAt(elapsedSeconds), { camera, renderer, scene } = viewer;
  if (!pose.isEndCard) {
    if (displaySettings.roofVisible !== pose.shot.showRoof) setRoofVisible(pose.shot.showRoof);
    camera.position.set(...pose.position);
    camera.lookAt(new THREE.Vector3(...pose.target));
    if (camera.fov !== pose.shot.fieldOfView) { camera.fov = pose.shot.fieldOfView; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
    tourState.compositeContext.drawImage(renderer.domElement, 0, 0, tourState.frameWidth, tourState.frameHeight);
  }
  drawCinematicOverlay(pose);
  getElement('#video-tour-progress-bar').style.width = `${Math.min(100, (elapsedSeconds / TOUR_TOTAL_SECONDS) * 100).toFixed(1)}%`;
  setMessage(t('{state} {elapsed} / {total} giây', {
    state: t(tourState.isRecording ? 'Đang quay…' : 'Đang phát…'),
    elapsed: Math.min(TOUR_TOTAL_SECONDS, elapsedSeconds).toFixed(0), total: TOUR_TOTAL_SECONDS.toFixed(0),
  }));
  if (elapsedSeconds >= TOUR_TOTAL_SECONDS) { finishTour(true); return; }
  tourState.animationFrameId = requestAnimationFrame(renderTourFrame);
}

function setControlsForPlayback(isPlaying) {
  ['#video-tour-preview', '#video-tour-record'].forEach(selector => { getElement(selector).hidden = isPlaying; });
  getElement('#video-tour-save').hidden = true;
  getElement('#video-tour-stop').hidden = !isPlaying;
  ['#video-tour-resolution', '#video-tour-realistic', '#video-tour-night'].forEach(selector => { getElement(selector).disabled = isPlaying; });
}

function startRecording(canvas) {
  const format = supportedVideoFormat();
  try {
    const stream = canvas.captureStream(RECORDING_FRAMES_PER_SECOND);
    const options = { videoBitsPerSecond: tourState.frameHeight >= 1080 ? 14e6 : 7e6, ...(format ? { mimeType: format } : {}) };
    tourState.recorder = new MediaRecorder(stream, options);
    tourState.videoMimeType = tourState.recorder.mimeType || format || 'video/webm';
    tourState.recorder.ondataavailable = event => { if (event.data && event.data.size) tourState.recordedChunks.push(event.data); };
    tourState.recorder.onstop = () => {
      if (!tourState.keepRecording) return;
      tourState.recordedVideo = new Blob(tourState.recordedChunks, { type: tourState.videoMimeType });
      showRecordedVideo();
    };
    tourState.recorder.start(1000);
    tourState.isRecording = true;
  } catch {
    tourState.recorder = null;
    setMessage(t('Không bắt đầu ghi được video trên trình duyệt này. Đang phát xem trước.'));
  }
}

function startTour(shouldRecord) {
  if (interactionState.touring) return;
  interactionState.touring = true;
  emitEvent('tour:starting'); // nhân vật thoát đi dạo, khung chọn đồ ẩn đi
  const resolution = Number(getElement('#video-tour-resolution').value) || 1080;
  tourState.frameWidth = resolution === 720 ? 1280 : 1920;
  tourState.frameHeight = resolution === 720 ? 720 : 1080;
  stopRenderLoop();
  cancelCameraFlight();
  const { camera, controls, renderer } = viewer;
  tourState.savedViewState = {
    cameraPosition: camera.position.clone(), controlsTarget: controls.target.clone(), fieldOfView: camera.fov,
    roofVisible: displaySettings.roofVisible, cutWalls: displaySettings.cutWalls, pixelRatio: renderer.getPixelRatio(),
  };
  if (displaySettings.cutWalls) setCutWalls(false);
  hideRoomLabels();
  renderer.setPixelRatio(1);
  renderer.setSize(tourState.frameWidth, tourState.frameHeight, false);
  camera.aspect = tourState.frameWidth / tourState.frameHeight;
  camera.updateProjectionMatrix();

  const canvas = document.createElement('canvas');
  canvas.width = tourState.frameWidth;
  canvas.height = tourState.frameHeight;
  tourState.compositeCanvas = canvas;
  tourState.compositeContext = canvas.getContext('2d');
  const screen = getElement('#video-tour-screen');
  screen.innerHTML = '';
  screen.appendChild(canvas);
  if (tourState.recordedVideoUrl) { URL.revokeObjectURL(tourState.recordedVideoUrl); tourState.recordedVideoUrl = null; }
  tourState.recordedVideo = null;
  tourState.recordedChunks = [];
  tourState.isRecording = false;
  tourState.keepRecording = false;
  if (shouldRecord) startRecording(canvas);

  setControlsForPlayback(true);
  tourState.startTime = performance.now();
  tourState.animationFrameId = requestAnimationFrame(renderTourFrame);
}

function finishTour(completed) {
  if (!interactionState.touring) return;
  interactionState.touring = false;
  cancelAnimationFrame(tourState.animationFrameId);
  tourState.keepRecording = completed && tourState.isRecording;
  if (tourState.recorder && tourState.recorder.state !== 'inactive') { try { tourState.recorder.stop(); } catch { /* đã dừng */ } }
  tourState.recorder = null;

  const saved = tourState.savedViewState, { camera, controls, renderer } = viewer;
  if (saved) {
    renderer.setPixelRatio(saved.pixelRatio);
    camera.position.copy(saved.cameraPosition);
    controls.target.copy(saved.controlsTarget);
    camera.fov = saved.fieldOfView;
    camera.updateProjectionMatrix();
    setRoofVisible(saved.roofVisible);
    if (saved.cutWalls) setCutWalls(true);
    resizeViewer();
  }
  setControlsForPlayback(false);
  if (!completed) setMessage(t('Đã dừng.'));
  else if (!tourState.isRecording) setMessage(t('Đã phát xong. Bấm Quay & xuất video để tạo tệp video.'));
  else setMessage(t('Đang hoàn tất tệp video…'));
  emitEvent('tour:ended');
  if (appState.viewMode === '3d') startRenderLoop();
}

function showRecordedVideo() {
  const video = tourState.recordedVideo;
  if (!video || !video.size) { setMessage(t('Không ghi được khung hình nào. Hãy thử lại với 720p.')); return; }
  try {
    tourState.recordedVideoUrl = URL.createObjectURL(video);
    const player = document.createElement('video');
    player.controls = true;
    player.playsInline = true;
    player.src = tourState.recordedVideoUrl;
    player.addEventListener('error', () => { getElement('#video-tour-screen').innerHTML = `<div class="video-tour-placeholder">${t('Video đã sẵn sàng. Bấm Lưu video để tải về.')}</div>`; });
    const screen = getElement('#video-tour-screen');
    screen.innerHTML = '';
    screen.appendChild(player);
  } catch { /* trình xem chặn blob: vẫn cho lưu */ }
  const sizeInMegabytes = (video.size / 1048576).toFixed(1).replace('.', ',');
  setMessage(t('Xong: video {width}×{height}, {size} MB (.{extension}).', {
    width: tourState.frameWidth, height: tourState.frameHeight, size: sizeInMegabytes, extension: recordedFileExtension(),
  }));
  getElement('#video-tour-save').hidden = false;
}

async function saveRecordedVideo() {
  if (!tourState.recordedVideo) return;
  if (!downloadsCapability) { setMessage(t('Trang đang mở ở nơi không cho phép lưu tệp. Video vẫn xem được ở khung trên.')); return; }
  try {
    const result = await downloadsCapability.save({ filename: `nha-vuon-cap-4-tham-quan.${recordedFileExtension()}`, data: tourState.recordedVideo });
    setMessage(result && result.status === 'delivered' ? t('Đã gửi video đi.') : t('Đã lưu video.'));
  } catch (error) {
    const messages = {
      declined: t('Bạn đã huỷ lưu video. Có thể bấm Lưu video lần nữa.'),
      rate_limited: t('Đang có một hộp thoại lưu khác, thử lại sau giây lát.'),
      too_large: t('Video quá lớn, hãy quay lại ở 720p.'),
    };
    setMessage(messages[error && error.code] || t('Không lưu được video ở đây. Video vẫn xem được ở khung trên.'));
  }
}

function openTourDialog() {
  if (!viewer.initialized) return;
  getElement('#video-tour').hidden = false;
  getElement('#video-tour-realistic').checked = displaySettings.realisticMaterials;
  getElement('#video-tour-night').checked = displaySettings.nightMode;
  const canRecord = supportedVideoFormat() !== null;
  getElement('#video-tour-record').disabled = !canRecord;
  setMessage(canRecord
    ? t('Camera lia qua {count} cảnh: từ trên cao, mặt tiền, từng phòng rồi ra sân vườn. Dài khoảng {seconds} giây.', { count: TOUR_SHOTS.length, seconds: Math.round(TOUR_TOTAL_SECONDS) })
    : t('Trình duyệt này không hỗ trợ ghi video. Bạn vẫn có thể bấm Xem trước.'));
  getElement('#video-tour-progress-bar').style.width = '0%';
  if (!tourState.recordedVideoUrl) getElement('#video-tour-screen').innerHTML = `<div class="video-tour-placeholder">${escapeHtml(t('Bấm Xem trước hoặc Quay & xuất video'))}</div>`;
  getElement('#video-tour-close').focus();
}

function closeTourDialog() {
  if (interactionState.touring) finishTour(false);
  getElement('#video-tour').hidden = true;
  getElement('#video-tour-button').focus();
}

export function initVideoTour() {
  getElement('#video-tour-button').addEventListener('click', openTourDialog);
  getElement('#video-tour-preview').addEventListener('click', () => startTour(false));
  getElement('#video-tour-record').addEventListener('click', () => startTour(true));
  getElement('#video-tour-stop').addEventListener('click', () => finishTour(false));
  getElement('#video-tour-save').addEventListener('click', saveRecordedVideo);
  getElement('#video-tour-close').addEventListener('click', closeTourDialog);
  getElement('#video-tour-realistic').addEventListener('change', event => setRealisticMode(event.target.checked));
  getElement('#video-tour-night').addEventListener('change', event => setNightMode(event.target.checked));
  getElement('#video-tour').addEventListener('keydown', event => { if (event.key === 'Escape') closeTourDialog(); });
}
