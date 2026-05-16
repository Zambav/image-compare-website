export function stripExt(name) {
  return name ? name.replace(/\.[^.]+$/, '') : '';
}

export function loadDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}
