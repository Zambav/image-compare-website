import { S } from './state.js';
import { dom } from './dom.js';
import { render, applyAspectRatio, updateInfo } from './viewer.js';
import { setupDrop } from './loaders.js';
import { restoreSession, scheduleSessionSave } from './session.js';

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
  dom.stageWrap.addEventListener('mousedown', (e) => {
    if (!S.ready || S.mode !== 'slider') return;
    S.dragging = true;
    S.pos = getRelX(e);
    render();
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!S.dragging) return;
    S.pos = getRelX(e);
    render();
  });

  document.addEventListener('mouseup', () => {
    const wasDragging = S.dragging;
    S.dragging = false;
    if (wasDragging) scheduleSessionSave();
  });

  dom.stageWrap.addEventListener('touchstart', (e) => {
    if (!S.ready || S.mode !== 'slider') return;
    S.dragging = true;
    S.pos = getRelX(e);
    render();
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!S.dragging) return;
    S.pos = getRelX(e);
    render();
  }, { passive: true });

  document.addEventListener('touchend', () => {
    const wasDragging = S.dragging;
    S.dragging = false;
    if (wasDragging) scheduleSessionSave();
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
      nudgeSlider(e.shiftKey ? -0.05 : -0.01);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudgeSlider(e.shiftKey ? 0.05 : 0.01);
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

async function init() {
  setupDrop('dz-a', 'file-a', 'a');
  setupDrop('dz-b', 'file-b', 'b');
  bindModeButtons();
  bindSliderDrag();
  bindToggleClick();
  bindDissolve();
  bindSwap();
  bindKeyboard();
  bindFullscreenTracking();
  await restoreSession();
  syncFullscreenClass();
}

init();
