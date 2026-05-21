import { S } from './state.js';
import { dom } from './dom.js';
import { render, applyAspectRatio, updateInfo } from './viewer.js';
import { setupDrop } from './loaders.js';
import { restoreSession, scheduleSessionSave } from './session.js';
import { clearSession } from './storage.js';
import { getRecentFiles } from './recent.js';
import { nextCandidate, prevCandidate, refreshQueueStatus } from './queue.js';
import {
  addSavedComparisons,
  buildBatchSavedComparisons,
  exportSavedComparisonsToJsonFile,
  getBatchPairValidation,
  importSavedComparisonsFromJsonFile,
  renderSavedComparisons,
  restoreSavedComparison,
  saveCurrentComparison,
} from './comparisons.js';
import { exportCurrentComparison } from './export.js';
import { renderMetadataPanel } from './metadata.js';
import { BATCH_MIN_PAIRS } from './config.js';

function setMode(mode) {
  document.querySelectorAll('.mpill').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.mode === mode);
  });
  S.mode = mode;
  if (S.mode === 'toggle') S.toggleFrame = 'a';
  render();
  scheduleSessionSave();
}

function getRelX(event) {
  const rect = dom.stageWrap.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  return Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width));
}

function swapImages() {
  if (!S.srcA || !S.srcB) return;

  [S.srcA, S.srcB] = [S.srcB, S.srcA];
  [S.nameA, S.nameB] = [S.nameB, S.nameA];
  [S.wA, S.wB] = [S.wB, S.wA];
  [S.hA, S.hB] = [S.hB, S.hA];

  const bgA = dom.thumbA.style.backgroundImage;
  dom.thumbA.style.backgroundImage = dom.thumbB.style.backgroundImage;
  dom.thumbB.style.backgroundImage = bgA;

  dom.imgA.src = S.srcA;
  dom.imgB.src = S.srcB;

  applyAspectRatio();
  updateInfo();
  if (S.mode === 'toggle') S.toggleFrame = 'a';
  render();
  scheduleSessionSave();
}

function bindModeButtons() {
  document.querySelectorAll('.mpill').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
}

function bindSliderDrag() {
  let panStartX = 0;
  let panStartY = 0;
  let startPanX = 0;
  let startPanY = 0;

  const startPan = (clientX, clientY) => {
    S.panning = true;
    panStartX = clientX;
    panStartY = clientY;
    startPanX = S.panX;
    startPanY = S.panY;
    render();
  };

  dom.stageWrap.addEventListener('contextmenu', (e) => {
    if (S.zoom > 1) e.preventDefault();
  });

  dom.stageWrap.addEventListener('mousedown', (e) => {
    if (!S.ready) return;

    const wantsPan = (S.zoom > 1 && e.button === 2) || (S.zoom > 1 && e.shiftKey);
    if (wantsPan) {
      startPan(e.clientX, e.clientY);
      e.preventDefault();
      return;
    }

    if (S.mode !== 'slider' || e.button !== 0) return;
    S.dragging = true;
    S.pos = getRelX(e);
    render();
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (S.panning) {
      S.panX = startPanX + (e.clientX - panStartX);
      S.panY = startPanY + (e.clientY - panStartY);
      clampPan();
      render();
      return;
    }
    if (!S.dragging) return;
    S.pos = getRelX(e);
    render();
  });

  document.addEventListener('mouseup', () => {
    const wasDragging = S.dragging;
    const wasPanning = S.panning;
    S.dragging = false;
    S.panning = false;
    if (wasDragging || wasPanning) {
      render();
      scheduleSessionSave();
    }
  });

  dom.stageWrap.addEventListener('touchstart', (e) => {
    if (!S.ready) return;
    if (S.zoom > 1 && e.touches.length === 1) {
      startPan(e.touches[0].clientX, e.touches[0].clientY);
      return;
    }
    if (S.mode !== 'slider') return;
    S.dragging = true;
    S.pos = getRelX(e);
    render();
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (S.panning && e.touches.length === 1) {
      S.panX = startPanX + (e.touches[0].clientX - panStartX);
      S.panY = startPanY + (e.touches[0].clientY - panStartY);
      clampPan();
      render();
      return;
    }
    if (!S.dragging) return;
    S.pos = getRelX(e);
    render();
  }, { passive: true });

  document.addEventListener('touchend', () => {
    const wasDragging = S.dragging;
    const wasPanning = S.panning;
    S.dragging = false;
    S.panning = false;
    if (wasDragging || wasPanning) {
      render();
      scheduleSessionSave();
    }
  });
}

function bindToggleClick() {
  dom.stageWrap.addEventListener('click', () => {
    if (!S.ready || S.mode !== 'toggle' || S.dragging) return;
    S.toggleFrame = S.toggleFrame === 'a' ? 'b' : 'a';
    render();
    scheduleSessionSave();
  });
}

function bindDissolve() {
  dom.dRange.addEventListener('input', () => {
    S.dissolve = parseFloat(dom.dRange.value);
    dom.dPct.textContent = Math.round(S.dissolve * 100) + '%';
    if (S.mode === 'dissolve') render();
    scheduleSessionSave();
  });
}

function syncFullscreenClass() {
  dom.body.classList.toggle('is-fullscreen', S.isFullscreen);
}

function renderRecentFiles() {
  const recents = getRecentFiles();
  if (!recents.length) {
    dom.recentList.innerHTML = '<span class="recent-empty">No recent files yet</span>';
    return;
  }

  dom.recentList.innerHTML = recents
    .map((item) => `<span class="recent-chip">${item.name}</span>`)
    .join('');
}

function resetImageTransforms() {
  S.flipH = false;
  S.flipV = false;
  S.rotation = 0;
  S.zoom = 1;
  S.panX = 0;
  S.panY = 0;
  render();
  scheduleSessionSave();
}

function rotateImage() {
  S.rotation = (S.rotation + 90) % 360;
  render();
  scheduleSessionSave();
}

function toggleFlipH() {
  S.flipH = !S.flipH;
  render();
  scheduleSessionSave();
}

function toggleFlipV() {
  S.flipV = !S.flipV;
  render();
  scheduleSessionSave();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      S.isFullscreen = true;
    } else {
      await document.exitFullscreen();
      S.isFullscreen = false;
    }
  } catch (error) {
    console.warn('Fullscreen toggle failed', error);
    S.isFullscreen = !!document.fullscreenElement;
  }

  syncFullscreenClass();
  scheduleSessionSave();
}

function bindFullscreenTracking() {
  document.addEventListener('fullscreenchange', () => {
    S.isFullscreen = !!document.fullscreenElement;
    syncFullscreenClass();
    if (S.ready) scheduleSessionSave();
  });
}

function nudgeSlider(step) {
  if (!S.ready || S.mode !== 'slider') return;
  S.pos = Math.max(0.01, Math.min(0.99, S.pos + step));
  render();
  scheduleSessionSave();
}

function clampPan() {
  if (S.zoom <= 1) {
    S.panX = 0;
    S.panY = 0;
    return;
  }

  const rect = dom.stageWrap.getBoundingClientRect();
  const maxX = Math.max(0, ((rect.width * S.zoom) - rect.width) / 2);
  const maxY = Math.max(0, ((rect.height * S.zoom) - rect.height) / 2);
  S.panX = Math.max(-maxX, Math.min(maxX, S.panX));
  S.panY = Math.max(-maxY, Math.min(maxY, S.panY));
}

function zoomBy(delta, clientX, clientY) {
  if (!S.ready) return;
  const rect = dom.stageWrap.getBoundingClientRect();
  const beforeZoom = S.zoom;
  const nextZoom = Math.max(1, Math.min(8, Number((S.zoom + delta).toFixed(3))));
  if (nextZoom === beforeZoom) return;

  const cx = clientX - rect.left - rect.width / 2;
  const cy = clientY - rect.top - rect.height / 2;
  const ratio = nextZoom / beforeZoom;

  S.panX = (S.panX - cx) * ratio + cx;
  S.panY = (S.panY - cy) * ratio + cy;
  S.zoom = nextZoom;

  if (S.zoom === 1) {
    S.panX = 0;
    S.panY = 0;
  }

  clampPan();
  render();
  scheduleSessionSave();
}

function bindZoomPan() {
  dom.stageWrap.addEventListener('wheel', (e) => {
    if (!S.ready) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    zoomBy(delta, e.clientX, e.clientY);
  }, { passive: false });
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (!S.ready) return;
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

    const k = e.key.toLowerCase();

    if (k === 's') {
      setMode('slider');
    } else if (k === 'd') {
      setMode('dissolve');
    } else if (k === 't') {
      if (S.mode === 'toggle') {
        S.toggleFrame = S.toggleFrame === 'a' ? 'b' : 'a';
        render();
        scheduleSessionSave();
      } else {
        setMode('toggle');
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (e.altKey) {
        prevCandidate();
      } else {
        nudgeSlider(e.shiftKey ? -0.05 : -0.01);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (e.altKey) {
        nextCandidate();
      } else {
        nudgeSlider(e.shiftKey ? 0.05 : 0.01);
      }
    } else if (e.key === '[') {
      e.preventDefault();
      prevCandidate();
    } else if (e.key === ']') {
      e.preventDefault();
      nextCandidate();
    } else if (k === '0') {
      e.preventDefault();
      resetImageTransforms();
    } else if (k === '+' || e.key === '=') {
      e.preventDefault();
      const rect = dom.stageWrap.getBoundingClientRect();
      zoomBy(0.12, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else if (k === '-' || e.key === '_') {
      e.preventDefault();
      const rect = dom.stageWrap.getBoundingClientRect();
      zoomBy(-0.12, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else if (k === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === ' ') {
      e.preventDefault();
      swapImages();
    }
  });
}

function bindSwap() {
  dom.swapBtn.addEventListener('click', swapImages);
}

function bindTransformButtons() {
  dom.flipHBtn.addEventListener('click', toggleFlipH);
  dom.flipVBtn.addEventListener('click', toggleFlipV);
  dom.rotateBtn.addEventListener('click', rotateImage);
  dom.resetViewBtn.addEventListener('click', resetImageTransforms);
}

function bindQueueButtons() {
  dom.prevCandidateBtn.addEventListener('click', prevCandidate);
  dom.nextCandidateBtn.addEventListener('click', nextCandidate);
}

function bindSaveComparison() {
  dom.saveComparisonBtn.addEventListener('click', async () => {
    await saveCurrentComparison();
  });
}

function bindExport() {
  dom.exportBtn.addEventListener('click', async () => {
    await exportCurrentComparison();
  });
}

function bindSavedComparisonsJsonActions() {
  dom.exportComparesBtn.addEventListener('click', () => {
    exportSavedComparisonsToJsonFile();
  });

  dom.importComparesBtn.addEventListener('click', () => {
    dom.importComparesInput.click();
  });

  dom.importComparesInput.addEventListener('change', async () => {
    const file = dom.importComparesInput.files?.[0];
    if (!file) return;

    try {
      const importedCount = await importSavedComparisonsFromJsonFile(file);
      if (!importedCount) {
        window.alert('No valid comparisons were found in that JSON file.');
      } else {
        window.alert(`Imported ${importedCount} comparison${importedCount === 1 ? '' : 's'}.`);
      }
    } catch (error) {
      console.warn('Import comparisons failed:', error?.message || error);
      window.alert('Could not import comparisons from that JSON file.');
    } finally {
      dom.importComparesInput.value = '';
    }
  });
}

function bindBatchScreen() {
  let filesA = [];
  let filesB = [];

  const closeBatch = () => {
    dom.batchScreen.classList.remove('on');
    dom.batchScreen.setAttribute('aria-hidden', 'true');
  };

  const updateBatchStatus = () => {
    const validation = getBatchPairValidation(filesA, filesB);
    const { countA, countB, minimumReady, countsMatch, ok } = validation;

    if (!countA && !countB) {
      dom.batchStatus.textContent = 'Select both sets to begin.';
    } else if (!minimumReady) {
      dom.batchStatus.textContent = `Need at least ${BATCH_MIN_PAIRS} images per side (A: ${countA}, B: ${countB}).`;
    } else if (!countsMatch) {
      dom.batchStatus.textContent = `Counts must match for pairing (A: ${countA}, B: ${countB}).`;
    } else {
      dom.batchStatus.textContent = validation.message;
    }

    dom.batchBuildBtn.disabled = !ok;
  };

  const openBatch = () => {
    filesA = [];
    filesB = [];
    dom.batchFileA.value = '';
    dom.batchFileB.value = '';
    dom.batchScreen.classList.add('on');
    dom.batchScreen.setAttribute('aria-hidden', 'false');
    updateBatchStatus();
  };

  dom.batchOpenBtn.addEventListener('click', openBatch);
  dom.batchCloseBtn.addEventListener('click', closeBatch);

  dom.batchScreen.addEventListener('click', (event) => {
    if (event.target === dom.batchScreen) closeBatch();
  });

  dom.batchFileA.addEventListener('change', () => {
    filesA = Array.from(dom.batchFileA.files || []);
    updateBatchStatus();
  });

  dom.batchFileB.addEventListener('change', () => {
    filesB = Array.from(dom.batchFileB.files || []);
    updateBatchStatus();
  });

  dom.batchBuildBtn.addEventListener('click', async () => {
    try {
      const built = await buildBatchSavedComparisons(filesA, filesB);
      const added = addSavedComparisons(built);
      if (added && built.length) restoreSavedComparison(built[0].id);
      closeBatch();
      window.alert(`Created ${added} batch comparison${added === 1 ? '' : 's'}.`);
    } catch (error) {
      console.warn('Batch build failed:', error?.message || error);
      window.alert(error?.message || 'Could not build batch comparisons.');
    }
  });
}

function bindRecentFilesEvents() {
  window.addEventListener('recents-updated', renderRecentFiles);
}

async function resetAll() {
  if (!window.confirm('Reset everything and wipe all local site data?')) return;

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('storage clear failed', e);
  }

  try {
    await clearSession();
  } catch (e) {
    console.warn('clearSession failed', e);
  }

  try {
    indexedDB.deleteDatabase('image-compare-db');
  } catch (e) {
    console.warn('deleteDatabase failed', e);
  }

  window.location.reload();
}

function bindResetButton() {
  dom.headerResetBtn.addEventListener('click', resetAll);
}

async function init() {
  setupDrop('dz-a', 'file-a', 'a');
  setupDrop('dz-b', 'file-b', 'b');
  bindModeButtons();
  bindSliderDrag();
  bindToggleClick();
  bindDissolve();
  bindSwap();
  bindTransformButtons();
  bindQueueButtons();
  bindSaveComparison();
  bindExport();
  bindSavedComparisonsJsonActions();
  bindBatchScreen();
  bindRecentFilesEvents();
  bindResetButton();
  bindZoomPan();
  bindKeyboard();
  bindFullscreenTracking();
  await restoreSession();
  syncFullscreenClass();
  renderRecentFiles();
  renderSavedComparisons();
  renderMetadataPanel();
  refreshQueueStatus();
}

init();
