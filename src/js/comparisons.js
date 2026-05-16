import { S } from './state.js';
import { dom } from './dom.js';
import { applyAspectRatio, render, updateInfo } from './viewer.js';
import { scheduleSessionSave } from './session.js';
import { setSingleCandidate } from './queue.js';

const MAX_SAVED = 12;

function shortName(name) {
  return (name || 'Untitled').replace(/\.[^.]+$/, '');
}

function dataUrlToBlob(dataUrl) {
  const [meta = '', body = ''] = (dataUrl || '').split(',');
  const mimeMatch = meta.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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

async function buildImageRecord(src, name, w, h) {
  const response = await fetch(src);
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return { name, dataUrl, w, h };
}

export function hydrateSavedComparisons(items = []) {
  S.savedComparisons = Array.isArray(items) ? items : [];
}

export function renderSavedComparisons() {
  if (!S.savedComparisons.length) {
    dom.savedList.innerHTML = '<div class="saved-empty">No saved comparisons yet</div>';
    return;
  }

  dom.savedList.innerHTML = S.savedComparisons.map((item) => `
    <button class="saved-card" data-compare-id="${item.id}" type="button">
      <div class="saved-preview" style="background-image:url('${item.preview}')"></div>
      <div class="saved-meta">
        <div class="saved-name">${item.label}</div>
        <div class="saved-pair">${shortName(item.nameA)} → ${shortName(item.nameB)}</div>
      </div>
    </button>
  `).join('');

  dom.savedList.querySelectorAll('[data-compare-id]').forEach((node) => {
    node.addEventListener('click', () => restoreSavedComparison(node.dataset.compareId));
  });
}

export async function saveCurrentComparison() {
  if (!S.ready || !S.srcA || !S.srcB) return;

  const [imageA, imageB] = await Promise.all([
    buildImageRecord(S.srcA, S.nameA, S.wA, S.hA),
    buildImageRecord(S.srcB, S.nameB, S.wB, S.hB),
  ]);

  const item = {
    id: `cmp-${Date.now()}`,
    label: `${shortName(S.nameA)} vs ${shortName(S.nameB)}`,
    preview: imageB.dataUrl,
    nameA: S.nameA,
    nameB: S.nameB,
    imageA,
    imageB,
    mode: S.mode,
    pos: S.pos,
    dissolve: S.dissolve,
    toggleFrame: S.toggleFrame,
    flipH: S.flipH,
    flipV: S.flipV,
    rotation: S.rotation,
  };

  S.savedComparisons.unshift(item);
  S.savedComparisons = S.savedComparisons.slice(0, MAX_SAVED);
  renderSavedComparisons();
  scheduleSessionSave();
}

export function restoreSavedComparison(id) {
  const item = S.savedComparisons.find((entry) => entry.id === id);
  if (!item) return;

  if (S.srcA?.startsWith('blob:')) URL.revokeObjectURL(S.srcA);
  if (S.srcB?.startsWith('blob:')) URL.revokeObjectURL(S.srcB);

  const srcA = URL.createObjectURL(dataUrlToBlob(item.imageA.dataUrl));
  const srcB = URL.createObjectURL(dataUrlToBlob(item.imageB.dataUrl));

  S.srcA = srcA;
  S.srcB = srcB;
  S.nameA = item.nameA;
  S.nameB = item.nameB;
  S.wA = item.imageA.w;
  S.hA = item.imageA.h;
  S.wB = item.imageB.w;
  S.hB = item.imageB.h;
  S.mode = item.mode || 'slider';
  S.pos = typeof item.pos === 'number' ? item.pos : 0.5;
  S.dissolve = typeof item.dissolve === 'number' ? item.dissolve : 0.5;
  S.toggleFrame = item.toggleFrame || 'a';
  S.flipH = !!item.flipH;
  S.flipV = !!item.flipV;
  S.rotation = Number.isFinite(item.rotation) ? item.rotation : 0;
  S.ready = true;

  dom.imgA.src = S.srcA;
  dom.imgB.src = S.srcB;
  dom.thumbA.style.backgroundImage = `url("${S.srcA}")`;
  dom.thumbB.style.backgroundImage = `url("${S.srcB}")`;
  dom.thumbA.classList.add('on');
  dom.thumbB.classList.add('on');
  dom.dzAInner.style.opacity = '0';
  dom.dzBInner.style.opacity = '0';
  dom.emptyState.style.display = 'none';
  dom.comp.classList.add('ready');
  dom.infoBar.classList.add('on');
  dom.dRange.value = String(S.dissolve);
  dom.dPct.textContent = Math.round(S.dissolve * 100) + '%';
  document.querySelectorAll('.mpill').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.mode === S.mode);
  });

  setSingleCandidate({ src: S.srcB, name: S.nameB, w: S.wB, h: S.hB });
  applyAspectRatio();
  updateInfo();
  render();
  scheduleSessionSave();
}
