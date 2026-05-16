# CHANGELOG

## [Unreleased]

### Added
- Initial project scaffolding around the standalone image compare prototypes
- Added folders for `docs`, `src`, `logs`, `temp`, `production`, `testing`, `assets`, and `archive`
- Added README with current-state summary and development direction
- Added feature roadmap and implementation planning docs
- Created modular app foundation in `src/` with split HTML, CSS, and JS modules
- `src/js/storage.js` for IndexedDB session storage
- `src/js/session.js` for save and restore orchestration of image data and UI state
- Keyboard slider nudging with arrow keys and larger Shift+nudge steps
- Fullscreen mode with `F` shortcut and layout adjustments for focused viewing
- `VERSION.md` to track project build progression

### Changed
- Promoted `image-compare v2.html` into a modular source version under `src/index.html`
- Preserved existing slider, dissolve, toggle, swap, drag/drop, and keyboard behavior while separating state, DOM refs, loaders, and viewer rendering
- Added session persistence plumbing so the last loaded comparison and UI state can be restored on page load
- Expanded shortcut hints in the UI to document nudge and fullscreen controls
- Persist fullscreen state alongside comparison session state
