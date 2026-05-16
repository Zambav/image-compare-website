# Image Compare Website

A local image comparison viewer for checking AI generations, render passes, paintovers, and before/after edits.

## Current Status

The project currently exists as standalone HTML prototypes:
- `image-compare v1.html`
- `image-compare v2.html`

A lightweight project structure has now been added around those prototypes so development can move into a cleaner app layout without risking the original files.

The repo is also prepared for GitHub Pages publishing with a root `index.html` that redirects into `src/index.html`.

## Project Structure

```text
Image compare website/
├─ archive/        # old snapshots, preserved experiments, backups
├─ assets/         # icons, sample images, static assets
├─ docs/           # feature plans, architecture notes, roadmap
├─ logs/           # dev notes, test logs, export/debug artifacts
├─ production/     # stable build outputs, release-ready files
├─ src/            # app source files for the next cleaned-up implementation
│  ├─ css/
│  └─ js/
├─ temp/           # scratch exports, diff experiments, disposable outputs
├─ testing/        # test fixtures, sample images, QA checklists
├─ image-compare v1.html
├─ image-compare v2.html
├─ README.md
├─ CHANGELOG.md
└─ TASKS.md
```

## What It Does Today

`image-compare v2.html` already supports:
- dual image upload
- slider compare mode
- dissolve compare mode
- toggle compare mode
- drag/drop loading
- swap A/B
- keyboard shortcuts for mode switching

## Planned High-Value Features

- session memory via IndexedDB
- multiple image slots / queue against a fixed reference image
- synchronized zoom + pan
- difference map overlay
- metadata panel with PNG/EXIF parsing, especially ComfyUI workflow data
- crop / region lock
- export current comparison view to PNG

## Planned Lighter Features

- zoom to cursor on mouse wheel
- recently used list in dropzones
- image flip / rotate

## Recently Added

- session memory via IndexedDB for the last loaded comparison
- keyboard arrow key slider nudging, with Shift for larger steps
- fullscreen mode via `F`
- recent files strip using localStorage filename history
- flip horizontal, flip vertical, rotate, and reset transform controls
- candidate queue on Image B with prev/next stepping against a fixed Image A reference
- custom favicon and header logo from the provided brand image in `assets/`

## Recommended Next Refactor

Before adding the heavier features, move from the single-file prototype into a modular structure:
- `src/index.html`
- `src/css/styles.css`
- `src/js/app.js`
- `src/js/state.js`
- `src/js/viewer.js`
- `src/js/storage.js`
- `src/js/metadata.js`
- `src/js/diff.js`
- `src/js/export.js`

This will make the advanced comparison features much easier to implement cleanly.

## Known Issues

- current prototype is monolithic, HTML/CSS/JS all in one file
- no persistence yet
- no zoom/pan pipeline yet
- no metadata extraction yet
- no export or diff rendering yet

## TL;DR

The prototype works, but the next step is to turn it into a proper small app and then add persistence, queueing, zoom/pan, metadata, diff, crop, and export features in that order.
