/**
 * Lưu bố cục nội thất: vào tài khoản claude.ai của người xem (riêng từng người) nếu có,
 * luôn lưu thêm trên trình duyệt này để mở lại nhanh.
 */
import { getElement, readStoredValue, writeStoredValue, t } from '../../core/dom.js';
import { onEvent } from '../../core/events.js';
import { furnitureItems, replaceAllFurniture } from '../../model/furniture-store.js';

const BROWSER_STORAGE_KEY = 'nhavuon-cap4-layout-v1';
const LAYOUT_FORMAT_VERSION = 2;
const SAVE_DELAY_MILLISECONDS = 700;
const ACCOUNT_LOAD_TIMEOUT_MILLISECONDS = 10000;

let accountLayoutDocument = null; // tài liệu db: data/users/<id>/layout
let saveTimer = 0;
let pendingAccountSave = Promise.resolve();

function setSaveStatus(text) {
  getElement('#save-status').textContent = text;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const layoutJson = JSON.stringify(furnitureItems);
    writeStoredValue(BROWSER_STORAGE_KEY, layoutJson);
    if (!accountLayoutDocument) { setSaveStatus(t('Đã lưu trên trình duyệt này')); return; }
    setSaveStatus(t('Đang lưu…'));
    // Mỗi lần chỉ một lệnh ghi vào tài liệu.
    pendingAccountSave = pendingAccountSave
      .then(() => accountLayoutDocument.set({ json: layoutJson, version: LAYOUT_FORMAT_VERSION, savedAt: Date.now() }))
      .then(() => setSaveStatus(t('Đã lưu vào tài khoản của bạn')), () => setSaveStatus(t('Chưa lưu được lên tài khoản, đã lưu trên trình duyệt này')));
  }, SAVE_DELAY_MILLISECONDS);
}

function applySavedJson(layoutJson) {
  try { replaceAllFurniture(JSON.parse(layoutJson), 'loaded'); return true; } catch { return false; }
}

function withTimeout(promise, milliseconds) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), milliseconds))]);
}

async function loadSavedLayout() {
  const browserCopy = readStoredValue(BROWSER_STORAGE_KEY);
  if (browserCopy) applySavedJson(browserCopy);
  if (!window.claude || typeof window.claude.use !== 'function') return; // mở ngoài claude.ai
  try {
    const [database, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!database || !user) return;
    const userId = await user.id();
    if (!userId) return;
    const layoutDocument = database.collection(`data/users/${userId}`).doc('layout');
    const snapshot = await withTimeout(layoutDocument.get(), ACCOUNT_LOAD_TIMEOUT_MILLISECONDS);
    accountLayoutDocument = layoutDocument;
    const savedData = snapshot && snapshot.exists ? snapshot.data() : null;
    if (savedData && typeof savedData.json === 'string' && applySavedJson(savedData.json)) setSaveStatus(t('Đã tải bố cục đã lưu'));
  } catch {
    /* không có tài khoản hoặc bị từ chối: chỉ lưu trên trình duyệt */
  }
}

export function initLayoutStorage() {
  onEvent('furniture:changed', ({ reason }) => { if (reason !== 'loaded') scheduleSave(); });
  loadSavedLayout();
}
