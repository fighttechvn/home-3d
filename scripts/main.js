/**
 * Điểm khởi động. Thứ tự quan trọng: các module đăng ký lắng nghe sự kiện trước,
 * sau đó mới chọn chế độ xem (có thể dựng cảnh 3D ngay) và tải bố cục đã lưu.
 */
// Ngôn ngữ trước tiên: dịch dữ liệu dùng chung trước khi các module khác đọc tới.
import { translateDocument, initLanguageSwitch } from './core/i18n.js';
import { getElement } from './core/dom.js';
import { initPlanRenderer } from './plan2d/plan-renderer.js';
import { initPlanViewport } from './plan2d/plan-viewport.js';
import { initFurnitureSceneSync } from './viewer3d/furniture-scene.js';
import { initCameraController } from './viewer3d/camera-controller.js';
import { initRoomLabels } from './viewer3d/room-labels.js';
import { bindDisplayToggles } from './viewer3d/display-settings.js';
import { bindLightingControls } from './viewer3d/lighting.js';
import { initRealisticMode } from './viewer3d/realistic-mode.js';
import { observeModelToolbarHeight } from './viewer3d/viewer.js';
import { initWalkMode } from './features/walk/walk-controller.js';
import { initFurnitureEditor } from './features/furniture-editor/furniture-editor.js';
import { initLayoutStorage } from './features/furniture-editor/layout-storage.js';
import { initVideoTour } from './features/video-tour/video-tour.js';
import { initXrViewing } from './features/xr/xr-menu.js';
import { initRoomPanel } from './ui/room-panel.js';
import { initViewMode } from './ui/view-mode.js';

// Chữ tĩnh của index.html
translateDocument();
initLanguageSwitch();

// Bản vẽ 2D
initPlanRenderer(getElement('#plan-host'));
initPlanViewport();

// Mô hình 3D (đồng bộ đồ nội thất phải đăng ký trước chế độ sắp xếp đồ)
initFurnitureSceneSync();
initCameraController();
initRoomLabels();
bindDisplayToggles();
bindLightingControls();
initRealisticMode();
observeModelToolbarHeight();

// Tính năng
initWalkMode();
initFurnitureEditor();
initVideoTour();
initXrViewing();

// Giao diện
initRoomPanel();
initViewMode();
initLayoutStorage();
