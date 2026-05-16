import { S } from './state.js';
import { dom } from './dom.js';
import { applyAspectRatio, render, updateInfo } from './viewer.js';
import { loadSession, saveSession } from './storage.js';
import { loadDimensions } from './helpers.js';
import { hydrateQueue, refreshQueueStatus } from './queue.js';
import { hydrateSavedComparisons, renderSavedComparisons } from './comparisons.js';

let persistTimer = null;
let restoring = false;

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const meta = parts[0] || '';
  const body = parts[1] || '';
  const mimeMatch = meta.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function buildImageRecord(src, name) {
  if (!src) return null;
  const response = await fetch(src);
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    name,
    type: blob.type,
    dataUrl,
  };
}

async function buildQueueRecords(items) {
  return Promise.all((items || []).map(async (item) => {
    const record = await buildImageRecord(item.src, item.name);
    return {
      ...record,
      w: item.w,
      h: item.h,
    };
  }));
}

async function restoreQueueRecords(items) {
  const queue = [];

  for (const item of items || []) {
    if (!item?.dataUrl) continue;
    const blob = dataUrlToBlob(item.dataUrl);
    const src = URL.createObjectURL(blob);
    queue.push({
      src,
      name: item.name || 'Candidate',
      w: item.w,
      h: item.h,
    });
  }

  return queue;
}

function restoreSavedComparisonRecords(items) {
  return (items || []).filter((item) => item?.imageA?.dataUrl && item?.imageB?.dataUrl);
}

function setThumb(element, url) {
  element.style.backgroundImage = `url("${url}")`;
  element.classList.add('on');
}

function applyUiState(session) {
  S.mode = session.mode || 'slider';
  S.pos = typeof session.pos === 'number' ? session.pos : 0.5;
  S.dissolve = typeof session.dissolve === 'number' ? session.dissolve : 0.5;
  S.toggleFrame = session.toggleFrame || 'a';
  S.isFullscreen = !!session.isFullscreen;
  S.flipH = !!session.flipH;
  S.flipV = !!session.flipV;
  S.rotation = Number.isFinite(session.rotation) ? session.rotation : 0;
  S.zoom = Number.isFinite(session.zoom) ? session.zoom : 1;
  S.panX = Number.isFinite(session.panX) ? session.panX : 0;
  S.panY = Number.isFinite(session.panY) ? session.panY : 0;

  dom.dRange.value = String(S.dissolve);
  dom.dPct.textContent = Math.round(S.dissolve * 100) + '%';

  document.querySelectorAll('.mpill').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.mode === S.mode);
  });
}

export function scheduleSessionSave() {
  if (restoring || !S.ready || !S.srcA || !S.srcB) return;

  if (persistTimer) clearTimeout(persistTimer);

  persistTimer = setTimeout(async () => {
    try {
      const [imageA, imageB, candidateQueue] = await Promise.all([
        buildImageRecord(S.srcA, S.nameA),
        buildImageRecord(S.srcB, S.nameB),
        buildQueueRecords(S.candidateQueue),
      ]);

      await saveSession({
        savedAt: Date.now(),
        mode: S.mode,
        pos: S.pos,
        dissolve: S.dissolve,
        toggleFrame: S.toggleFrame,
        isFullscreen: S.isFullscreen,
        flipH: S.flipH,
        flipV: S.flipV,
        rotation: S.rotation,
        zoom: S.zoom,
        panX: S.panX,
        panY: S.panY,
        currentCandidateIndex: S.currentCandidateIndex,
        candidateQueue,
        savedComparisons: S.savedComparisons,
        imageA,
        imageB,
      });
    } catch (error) {
      console.warn('Session save failed', error);
    }
  }, 180);
}

export async function restoreSession() {
  let session;

  try {
    session = await loadSession();
  } catch (error) {
    console.warn('Session load failed', error);
    return false;
  }

  if (!session?.imageA?.dataUrl || !session?.imageB?.dataUrl) return false;

  restoring = true;

  try {
    const blobA = dataUrlToBlob(session.imageA.dataUrl);
    const blobB = dataUrlToBlob(session.imageB.dataUrl);
    const urlA = URL.createObjectURL(blobA);
    const urlB = URL.createObjectURL(blobB);
    const restoredQueue = await restoreQueueRecords(session.candidateQueue || []);
    const restoredSavedComparisons = restoreSavedComparisonRecords(session.savedComparisons || []);

    const [dimA, dimB] = await Promise.all([
      loadDimensions(urlA),
      loadDimensions(urlB),
    ]);

    if (S.srcA) URL.revokeObjectURL(S.srcA);
    if (S.srcB) URL.revokeObjectURL(S.srcB);

    S.srcA = urlA;
    S.srcB = urlB;
    S.nameA = session.imageA.name || 'Image A';
    S.nameB = session.imageB.name || 'Image B';
    S.wA = dimA.w;
    S.hA = dimA.h;
    S.wB = dimB.w;
    S.hB = dimB.h;
    S.ready = true;

    dom.imgA.src = S.srcA;
    dom.imgB.src = S.srcB;
    dom.emptyState.style.display = 'none';
    dom.comp.classList.add('ready');
    dom.infoBar.classList.add('on');
    dom.dzAInner.style.opacity = '0';
    dom.dzBInner.style.opacity = '0';
    setThumb(dom.thumbA, S.srcA);
    setThumb(dom.thumbB, S.srcB);

    applyUiState(session);
    hydrateQueue(restoredQueue, session.currentCandidateIndex || 0);
    hydrateSavedComparisons(restoredSavedComparisons);
    renderSavedComparisons();
    refreshQueueStatus();
    applyAspectRatio();
    updateInfo();
    render();

    restoring = false;
    return true;
  } catch (error) {
    restoring = false;
    console.warn('Session restore failed', error);
    return false;
  }
}
