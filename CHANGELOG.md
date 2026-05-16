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
- Recent files list backed by localStorage filename history
- Flip horizontal, flip vertical, rotate, and reset transform controls
- Candidate queue controls for stepping through multiple B images against a fixed A reference
- Queue reliability fix so single B loads also create a navigable candidate queue
- GitHub Pages root entrypoint for live hosting from the current repo
- Custom favicon and header logo from the provided asset image
- Saved comparison cards sidebar with manual save and click-to-restore workflow
- Saved comparison card timestamps and delete actions
- Synchronized zoom and pan controls for deeper image inspection

### Changed
- Promoted `image-compare v2.html` into a modular source version under `src/index.html`
- Preserved existing slider, dissolve, toggle, swap, drag/drop, and keyboard behavior while separating state, DOM refs, loaders, and viewer rendering
- Added session persistence plumbing so the last loaded comparison and UI state can be restored on page load
- Expanded shortcut hints in the UI to document nudge and fullscreen controls
- Persist fullscreen state alongside comparison session state
- Persist image transform state alongside comparison session state
- Expanded the toolbar and added a recent-files strip below the controls
- Added queue status, prev/next controls, and persisted candidate queue state in session storage
- Updated B upload handling to accept multi-file candidate batches
- Made single-image B replacement flows initialize the queue state too, so prev/next has a consistent source of truth
- Added a root `index.html` redirect so GitHub Pages can serve the app from the repo root cleanly
- Generated favicon-sized PNG variants and connected them in both the root page and app page head tags
- Added a right-side saved-comparisons library, save button, and persisted restore flow for returning to prior A/B states
- Added delete controls and human-readable saved times so the comparison library is easier to manage over longer sessions
- Added wheel zoom, shared pan offsets, reset-view behavior, and persistence of zoom/pan state in both session restore and saved comparisons
