import { S } from './state.js';
import { dom } from './dom.js';
import { stripExt } from './helpers.js';

export function applyAspectRatio() {
  dom.stageWrap.style.aspectRatio = `${S.wA} / ${S.hA}`;
  dom.stageWrap.style.maxHeight = '80vh';
  dom.stageWrap.style.minHeight = '';
}

export function updateInfo() {
  dom.infoA.textContent = `A: ${S.nameA}  ${S.wA}×${S.hA}`;
  dom.infoB.textContent = `B: ${S.nameB}  ${S.wB}×${S.hB}`;
}

function applyImageTransforms() {
  const scaleX = S.flipH ? -1 : 1;
  const scaleY = S.flipV ? -1 : 1;
  const transform = `rotate(${S.rotation}deg) scale(${scaleX}, ${scaleY})`;
  dom.imgA.style.transform = transform;
  dom.imgB.style.transform = transform;

  dom.flipHBtn.classList.toggle('is-on', S.flipH);
  dom.flipVBtn.classList.toggle('is-on', S.flipV);
  dom.rotateBtn.classList.toggle('is-on', S.rotation % 360 !== 0);
}

export function render() {
  if (!S.ready) return;

  const pct = (S.pos * 100).toFixed(3) + '%';

  dom.imgA.style.opacity = '1';
  dom.imgA.style.clipPath = 'none';
  applyImageTransforms();

  if (S.mode === 'slider') {
    dom.imgB.style.opacity = '1';
    dom.imgB.style.clipPath = `inset(0 0 0 ${pct})`;

    dom.divider.style.display = 'block';
    dom.divider.style.left = pct;

    dom.lblA.style.display = 'block';
    dom.lblB.style.display = 'block';
    dom.lblA.textContent = stripExt(S.nameA);
    dom.lblB.textContent = stripExt(S.nameB);
    dom.tHint.style.display = 'none';

    dom.stageWrap.style.cursor = 'col-resize';
  } else if (S.mode === 'dissolve') {
    dom.imgB.style.opacity = String(S.dissolve);
    dom.imgB.style.clipPath = 'none';

    dom.divider.style.display = 'none';
    dom.lblA.style.display = 'none';
    dom.lblB.style.display = 'none';
    dom.tHint.style.display = 'none';

    dom.stageWrap.style.cursor = 'default';
  } else {
    dom.imgB.style.clipPath = 'none';
    dom.divider.style.display = 'none';
    dom.lblB.style.display = 'none';
    dom.tHint.style.display = 'block';
    dom.stageWrap.style.cursor = 'pointer';

    if (S.toggleFrame === 'a') {
      dom.imgB.style.opacity = '0';
      dom.lblA.style.display = 'block';
      dom.lblA.textContent = stripExt(S.nameA) + ' (A)';
    } else {
      dom.imgB.style.opacity = '1';
      dom.lblA.style.display = 'block';
      dom.lblA.textContent = stripExt(S.nameB) + ' (B)';
    }
  }

  const isDissolve = S.mode === 'dissolve';
  dom.dWrap.style.opacity = isDissolve ? '1' : '0.3';
  dom.dWrap.style.pointerEvents = isDissolve ? 'auto' : 'none';
}
