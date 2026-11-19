/** Tiện ích DOM, định dạng số và lưu cài đặt nhỏ trên trình duyệt. */
import { NUMBER_LOCALE } from './i18n.js';

export { t } from './i18n.js';

export const getElement = (selector, root = document) => root.querySelector(selector);
export const getElements = (selector, root = document) => [...root.querySelectorAll(selector)];

export function setPressed(button, pressed) {
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  return pressed;
}
export const isPressed = button => button.getAttribute('aria-pressed') === 'true';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = text => String(text).replace(/[&<>"']/g, character => HTML_ESCAPES[character]);

/** Định dạng số theo ngôn ngữ giao diện (tiếng Việt: dấu phẩy thập phân). */
export const formatDecimal = (value, fractionDigits = 1) =>
  value.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasCoarsePointer = matchMedia('(pointer: coarse)').matches;
export const isTouchDevice = hasCoarsePointer || (navigator.maxTouchPoints || 0) > 0;

/** localStorage có thể bị chặn (cửa sổ ẩn danh, khung xem trước): luôn bọc try/catch. */
export function readStoredValue(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeStoredValue(key, value) {
  try { localStorage.setItem(key, value); } catch { /* bộ nhớ bị chặn: bỏ qua */ }
}

export const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
