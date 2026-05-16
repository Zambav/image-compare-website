import { S } from './state.js';
import { dom, $ } from './dom.js';
import { loadDimensions } from './helpers.js';
import { applyAspectRatio, render, updateInfo } from './viewer.js';
import { scheduleSessionSave } from './session.js';
import { addRecentFile } from './recent.js';
import { replaceCandidateQueue, setSingleCandidate } from './queue.js';

export async function loadFile(file, slot) {
  if (!file || !file.type.startsWith('image/')) return;

  const url = URL.createObjectURL(file);

  let dim;
  try {
    dim = await loadDimensions(url);
  } catch {
    URL.revokeObjectURL(url);
    return;
  }

  addRecentFile(file);
  window.dispatchEvent(new CustomEvent('recents-updated'));

  if (slot === 'a') {
    if (S.srcA) URL.revokeObjectURL(S.srcA);
    S.srcA = url;
    S.nameA = file.name;
    S.wA = dim.w;
    S.hA = dim.h;
    dom.thumbA.style.backgroundImage = `url("${url}")`;
    dom.thumbA.classList.add('on');
    dom.dzAInner.style.opacity = '0';
  } else {
    setSingleCandidate({
      src: url,
      name: file.name,
      w: dim.w,
      h: dim.h,
    });
    S.srcB = url;
    S.nameB = file.name;
    S.wB = dim.w;
    S.hB = dim.h;
    dom.thumbB.style.backgroundImage = `url("${url}")`;
    dom.thumbB.classList.add('on');
    dom.dzBInner.style.opacity = '0';
  }

  if (S.srcA && S.srcB) {
    dom.imgA.src = S.srcA;
    dom.imgB.src = S.srcB;

    if (!S.ready) {
      S.ready = true;
      dom.emptyState.style.display = 'none';
      dom.comp.classList.add('ready');
      dom.infoBar.classList.add('on');
    }

    applyAspectRatio();
    updateInfo();
    render();
    scheduleSessionSave();
  }
}

export async function loadFiles(files, slot) {
  const list = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'));
  if (!list.length) return;

  for (const file of list) {
    addRecentFile(file);
  }
  window.dispatchEvent(new CustomEvent('recents-updated'));

  if (slot === 'b' && list.length > 1) {
    await replaceCandidateQueue(list);
    return;
  }

  await loadFile(list[0], slot);
}

export function setupDrop(dzId, fileId, slot) {
  const dz = $(dzId);
  const input = $(fileId);

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('over');
  });

  dz.addEventListener('dragleave', () => dz.classList.remove('over'));

  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('over');
    if (e.dataTransfer.files?.length) loadFiles(e.dataTransfer.files, slot);
  });

  input.addEventListener('change', () => {
    if (input.files?.length) loadFiles(input.files, slot);
    input.value = '';
  });
}
