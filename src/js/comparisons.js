import { S } from './state.js';
import { dom } from './dom.js';
import { applyAspectRatio, render, updateInfo } from './viewer.js';
import { scheduleSessionSave } from './session.js';
import { setSingleCandidate } from './queue.js';
import { renderMetadataPanel } from './metadata.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawTransformed(ctx, img, width, height, opacity = 1, clipLeftRatio = null) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const fit = Math.min(width / iw, height / ih);
  const drawW = iw * fit;
  const drawH = ih * fit;

  ctx.save();
  if (clipLeftRatio !== null) {
    ctx.beginPath();
    ctx.rect(width * clipLeftRatio, 0, width * (1 - clipLeftRatio), height);
    ctx.clip();
  }
  ctx.translate(width / 2 + S.panX, height / 2 + S.panY);
  ctx.rotate((S.rotation * Math.PI) / 180);
  ctx.scale((S.flipH ? -1 : 1) * S.zoom, (S.flipV ? -1 : 1) * S.zoom);
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

const MAX_SAVED = 12;

function shortName(name) {
  return (name || 'Untitled').replace(/\.[^.]+$/, '');
}

function formatSavedAt(value) {
  if (!value) return 'just now';
  const date = new Date(value);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  // Try fetch first (for http URLs), fall back to canvas copy for blob/file URLs
  let dataUrl;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    dataUrl = await blobToDataUrl(blob);
  } catch {
    // Fallback: draw the current img element to a canvas and extract dataURL
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || w;
    canvas.height = img.naturalHeight || h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    dataUrl = canvas.toDataURL('image/png');
  }
  return { name, dataUrl, w, h };
}

export function hydrateSavedComparisons(items = []) {
  S.savedComparisons = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        preview: item?.preview || item?.imageB?.dataUrl || '',
      }))
    : [];
}

export function renderSavedComparisons() {
  if (!S.savedComparisons.length) {
    dom.savedList.innerHTML = '<div class="saved-empty">No saved comparisons yet</div>';
    return;
  }

  dom.savedList.innerHTML = S.savedComparisons.map((item) => `
    <article class="saved-card" data-compare-id="${item.id}">
      <button class="saved-card-main" data-compare-open="${item.id}" type="button">
        <img class="saved-preview" src="${item.preview}" alt="Saved comparison preview">
      </button>
      <button class="saved-delete" data-compare-delete="${item.id}" type="button" aria-label="Delete saved comparison">×</button>
    </article>
  `).join('');

  dom.savedList.querySelectorAll('[data-compare-open]').forEach((node) => {
    node.addEventListener('click', () => restoreSavedComparison(node.dataset.compareOpen));
  });

  dom.savedList.querySelectorAll('[data-compare-delete]').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteSavedComparison(node.dataset.compareDelete);
    });
  });
}

async function buildComparisonPreview() {
  const [imgA, imgB] = await Promise.all([loadImage(S.srcA), loadImage(S.srcB)]);
  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#17171b';
  ctx.fillRect(0, 0, size, size);
  drawTransformed(ctx, imgA, size, size, 1, null);

  if (S.mode === 'slider') {
    drawTransformed(ctx, imgB, size, size, 1, S.pos);
    ctx.fillStyle = '#c8f03c';
    ctx.fillRect(size * S.pos - 1, 0, 2, size);
  } else if (S.mode === 'dissolve') {
    drawTransformed(ctx, imgB, size, size, S.dissolve, null);
  } else {
    drawTransformed(ctx, imgB, size, size, S.toggleFrame === 'b' ? 1 : 0, null);
  }

  return canvas.toDataURL('image/png');
}

export async function saveCurrentComparison() {
  if (!S.ready || !S.srcA || !S.srcB) return;

  const [imageA, imageB, preview] = await Promise.all([
    buildImageRecord(S.srcA, S.nameA, S.wA, S.hA),
    buildImageRecord(S.srcB, S.nameB, S.wB, S.hB),
    buildComparisonPreview(),
  ]);

  const item = {
    id: `cmp-${Date.now()}`,
    savedAt: Date.now(),
    label: `${shortName(S.nameA)} vs ${shortName(S.nameB)}`,
    preview,
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
    zoom: S.zoom,
    panX: S.panX,
    panY: S.panY,
    metaA: S.metaA,
    metaB: S.metaB,
  };

  S.savedComparisons.unshift(item);
  S.savedComparisons = S.savedComparisons.slice(0, MAX_SAVED);
  renderSavedComparisons();
  scheduleSessionSave();
}

export function deleteSavedComparison(id) {
  S.savedComparisons = S.savedComparisons.filter((entry) => entry.id !== id);
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
  S.zoom = Number.isFinite(item.zoom) ? item.zoom : 1;
  S.panX = Number.isFinite(item.panX) ? item.panX : 0;
  S.panY = Number.isFinite(item.panY) ? item.panY : 0;
  S.metaA = item.metaA || null;
  S.metaB = item.metaB || null;
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
  renderMetadataPanel();
  applyAspectRatio();
  updateInfo();
  render();
  scheduleSessionSave();
}
