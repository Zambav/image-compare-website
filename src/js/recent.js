const RECENTS_KEY = 'image-compare-recents';
const MAX_RECENTS = 5;

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecents(items) {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
}

export function addRecentFile(file) {
  if (!file?.name) return;

  const nextItem = {
    name: file.name,
    type: file.type || 'unknown',
    size: Number(file.size) || 0,
    seenAt: Date.now(),
  };

  const deduped = readRecents().filter((item) => !(item.name === nextItem.name && item.size === nextItem.size));
  deduped.unshift(nextItem);
  writeRecents(deduped.slice(0, MAX_RECENTS));
}

export function getRecentFiles() {
  return readRecents();
}
