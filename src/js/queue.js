import { S } from './state.js';
import { dom } from './dom.js';
import { loadDimensions } from './helpers.js';
import { applyAspectRatio, render, updateInfo } from './viewer.js';
import { scheduleSessionSave } from './session.js';

function updateQueueStatus() {
  const total = Math.max(1, S.candidateQueue.length || (S.srcB ? 1 : 0));
  const current = Math.min(total, (S.currentCandidateIndex || 0) + 1);
  dom.queueStatus.textContent = `Candidate ${current} / ${total}`;
}

function syncCurrentCandidate() {
  const item = S.candidateQueue[S.currentCandidateIndex];
  if (!item) {
    updateQueueStatus();
    return;
  }

  S.srcB = item.src;
  S.nameB = item.name;
  S.wB = item.w;
  S.hB = item.h;
  dom.imgB.src = S.srcB;
  dom.thumbB.style.backgroundImage = `url("${S.srcB}")`;
  dom.thumbB.classList.add('on');
  dom.dzBInner.style.opacity = '0';

  if (S.srcA && S.srcB) {
    S.ready = true;
    dom.emptyState.style.display = 'none';
    dom.comp.classList.add('ready');
    dom.infoBar.classList.add('on');
    applyAspectRatio();
    updateInfo();
    render();
  }

  updateQueueStatus();
}

export async function replaceCandidateQueue(files) {
  const images = files.filter((file) => file?.type?.startsWith('image/'));
  if (!images.length) return;

  const queue = [];

  for (const file of images) {
    const src = URL.createObjectURL(file);
    const dim = await loadDimensions(src);
    queue.push({
      src,
      name: file.name,
      w: dim.w,
      h: dim.h,
    });
  }

  S.candidateQueue = queue;
  S.currentCandidateIndex = 0;
  syncCurrentCandidate();
  scheduleSessionSave();
}

export function nextCandidate() {
  if (!S.candidateQueue.length) return;
  S.currentCandidateIndex = (S.currentCandidateIndex + 1) % S.candidateQueue.length;
  syncCurrentCandidate();
  scheduleSessionSave();
}

export function prevCandidate() {
  if (!S.candidateQueue.length) return;
  S.currentCandidateIndex = (S.currentCandidateIndex - 1 + S.candidateQueue.length) % S.candidateQueue.length;
  syncCurrentCandidate();
  scheduleSessionSave();
}

export function hydrateQueue(items = [], currentIndex = 0) {
  S.candidateQueue = Array.isArray(items) ? items : [];
  S.currentCandidateIndex = Math.max(0, Math.min(currentIndex, Math.max(0, S.candidateQueue.length - 1)));
  updateQueueStatus();
}

export function getSerializableQueue() {
  return S.candidateQueue.map((item) => ({
    name: item.name,
    w: item.w,
    h: item.h,
    src: item.src,
  }));
}

export function refreshQueueStatus() {
  updateQueueStatus();
}
