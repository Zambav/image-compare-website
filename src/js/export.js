import { S } from './state.js';

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

export async function exportCurrentComparison() {
  if (!S.ready || !S.srcA || !S.srcB) return;

  const [imgA, imgB] = await Promise.all([loadImage(S.srcA), loadImage(S.srcB)]);
  const width = Math.max(S.wA || 0, S.wB || 0, 1600);
  const height = Math.max(S.hA || 0, S.hB || 0, 900);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#17171b';
  ctx.fillRect(0, 0, width, height);

  drawTransformed(ctx, imgA, width, height, 1, null);

  if (S.mode === 'slider') {
    drawTransformed(ctx, imgB, width, height, 1, S.pos);
    ctx.fillStyle = '#c8f03c';
    ctx.fillRect(width * S.pos - 1, 0, 2, height);
  } else if (S.mode === 'dissolve') {
    drawTransformed(ctx, imgB, width, height, S.dissolve, null);
  } else {
    drawTransformed(ctx, imgB, width, height, S.toggleFrame === 'b' ? 1 : 0, null);
  }

  const link = document.createElement('a');
  const safeA = (S.nameA || 'A').replace(/\.[^.]+$/, '');
  const safeB = (S.nameB || 'B').replace(/\.[^.]+$/, '');
  link.href = canvas.toDataURL('image/png');
  link.download = `${safeA}_vs_${safeB}.png`;
  link.click();
}
