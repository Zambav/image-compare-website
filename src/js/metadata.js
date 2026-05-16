import { S } from './state.js';
import { dom } from './dom.js';

function bytesToText(bytes) {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function parsePngTextChunks(file) {
  if (!file?.type?.includes('png')) return [];
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  let offset = 8;

  while (offset + 8 < bytes.length) {
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) break;

    if (type === 'tEXt' || type === 'iTXt') {
      const text = bytesToText(bytes.slice(dataStart, dataEnd));
      chunks.push(text.slice(0, 1200));
    }

    offset = dataEnd + 4;
  }

  return chunks;
}

export async function extractMetadata(file, dims) {
  const textChunks = await parsePngTextChunks(file);
  return {
    name: file.name,
    type: file.type || 'unknown',
    size: file.size || 0,
    width: dims?.w || null,
    height: dims?.h || null,
    modifiedAt: file.lastModified || null,
    textChunks,
  };
}

function renderMetaBlock(label, meta) {
  if (!meta) {
    return `<div class="meta-block"><div class="meta-label">${label}</div><div class="meta-empty">No file loaded</div></div>`;
  }

  const chunks = (meta.textChunks || []).slice(0, 2).map((chunk) => `<pre class="meta-chunk">${chunk.replace(/[<>&]/g, (m) => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m]))}</pre>`).join('');
  return `
    <div class="meta-block">
      <div class="meta-label">${label}</div>
      <div class="meta-row"><span>Name</span><strong>${meta.name}</strong></div>
      <div class="meta-row"><span>Type</span><strong>${meta.type}</strong></div>
      <div class="meta-row"><span>Size</span><strong>${formatBytes(meta.size)}</strong></div>
      <div class="meta-row"><span>Dimensions</span><strong>${meta.width || '—'} × ${meta.height || '—'}</strong></div>
      <div class="meta-row"><span>PNG text</span><strong>${meta.textChunks?.length || 0}</strong></div>
      ${chunks || '<div class="meta-empty">No embedded text chunks found</div>'}
    </div>
  `;
}

export function renderMetadataPanel() {
  dom.metaPanel.innerHTML = `${renderMetaBlock('Image A', S.metaA)}${renderMetaBlock('Image B', S.metaB)}`;
}
