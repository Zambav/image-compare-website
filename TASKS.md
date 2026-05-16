# TASKS

## Immediate

- [x] Choose the canonical starting point, `image-compare v2.html`
- [x] Move the prototype into `src/` as modular files without breaking current behavior
- [x] Preserve the original standalone HTML files as reference snapshots
- [ ] Verify the modular `src/` version in browser against the standalone prototype
- [ ] Decide whether to add a root launcher file that redirects to or mirrors `src/index.html`

## Feature Build Order

- [x] Add session memory with IndexedDB for last-used images and UI state
- [ ] Verify session restore with real uploaded images in browser
- [x] Add keyboard slider nudging and fullscreen mode
- [ ] Verify arrow-key nudging and fullscreen UX with real loaded images
- [x] Add recent files list and image transforms
- [ ] Verify transform behavior with portrait and landscape images
- [x] Add multiple image slots / queue against a fixed reference image
- [ ] Verify multi-candidate stepping with real image batches and persisted restore
- [ ] Verify prev/next behavior across both single-B replacement and multi-B batch workflows
- [ ] Add zoom to cursor, then synchronized zoom + pan
- [ ] Add metadata panel with PNG chunk / EXIF parsing
- [ ] Add diff map overlay mode
- [ ] Add crop / region lock
- [ ] Add export of current comparison view to PNG

## QA

- [ ] Create a small testing image pack in `testing/`
- [ ] Verify behavior with mismatched aspect ratios
- [ ] Verify behavior with large PNGs from ComfyUI
- [ ] Verify memory restoration on reload
- [ ] Verify export output matches visible stage state
