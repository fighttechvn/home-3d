/** Thông báo ngắn giữa khung 3D (dùng chung ô #viewer-toast với chế độ vật liệu thật). */
import { getElement } from '../../core/dom.js';

let hideTimer = 0;

export function showViewerToast(text, durationMs = 2600) {
  const toast = getElement('#viewer-toast');
  if (!toast) return;
  clearTimeout(hideTimer);
  toast.textContent = text;
  toast.hidden = false;
  if (durationMs > 0) hideTimer = setTimeout(() => { toast.hidden = true; }, durationMs);
}

export function hideViewerToast() {
  clearTimeout(hideTimer);
  const toast = getElement('#viewer-toast');
  if (toast) toast.hidden = true;
}
