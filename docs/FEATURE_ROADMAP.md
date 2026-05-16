# Image Compare Website - Feature Roadmap

## Goal

Turn the current single-file image comparator into a stronger local review tool for AI image iteration, render QA, and side-by-side visual analysis.

## Current Code Assessment

The strongest current base is `image-compare v2.html`.

It already has:
- a usable upload flow
- slider / dissolve / toggle modes
- centralized render logic
- a small state object
- basic keyboard shortcuts
- a clean enough UI to extend

Main limitations in the current architecture:
- all HTML, CSS, and JS live in one file
- image state is blob-URL based and not persisted
- there is no abstraction for view transforms, queue management, metadata, export, or computed diff canvases
- the stage currently assumes a simple "two images in, one render mode out" model

## Feature Priority

### Tier 1 - highest value

#### 1) Session memory via IndexedDB
**Why first:** Immediate workflow win for iterative AI generation.

**What to store:**
- last two images as blobs
- filenames
- last active mode
- slider position
- dissolve amount
- transform state later, after zoom exists

**Implementation notes:**
- use IndexedDB, not localStorage, because image blobs can be large
- wrap DB logic in `src/js/storage.js`
- restore session on page load after UI boot

#### 2) Multiple image slots / queue against fixed reference
**Why second:** Extends the tool from one-off compare into batch review.

**Behavior:**
- left slot can be pinned as reference
- right slot can step through a queue of candidate images
- arrow keys cycle next/previous candidate
- UI shows current index like `3 / 10`

**Implementation notes:**
- add `referenceImage` plus `candidateQueue[]`
- keep a `currentCandidateIndex`
- separate queue state from current render state

#### 3) Zoom + pan, synchronized
**Why third:** Necessary before precision review, crop lock, and serious export.

**Behavior:**
- zoom both images together
- pan both images together
- zoom to cursor
- clamp panning so users do not get lost
- reset view shortcut

**Implementation notes:**
- move images into a transform layer inside the stage
- maintain shared transform state: `scale`, `offsetX`, `offsetY`
- all compare modes must render from the same transform state

#### 4) Difference map overlay
**Why fourth:** High technical value for spotting subtle changes.

**Behavior:**
- new compare mode: `diff`
- compute pixel delta on matching normalized dimensions
- allow sensitivity / threshold adjustment
- optionally tint changed areas

**Implementation notes:**
- render both images to offscreen canvases first
- normalize to shared canvas dimensions
- compute per-pixel absolute RGB difference
- expose threshold slider
- put logic in `src/js/diff.js`

#### 5) Metadata display
**Why fifth:** Big win for ComfyUI and AI generation workflows.

**Behavior:**
- side panel shows image dimensions, file size, type
- parse EXIF where available
- parse PNG text chunks for ComfyUI workflow / prompt JSON
- show prompt, seed, steps, sampler, model where extractable

**Implementation notes:**
- create optional side panel instead of overloading the main stage
- likely easiest path is PNG chunk parsing in browser JS plus EXIF reader for JPEG/WebP where useful
- keep raw metadata collapsible, extracted highlights visible by default

#### 6) Crop / region lock
**Why sixth:** Best built after transforms exist.

**Behavior:**
- drag a rectangle over the stage
- comparison locks to that region
- region persists while cycling candidates
- clear button returns to full image

**Implementation notes:**
- region should be stored in image-relative coordinates, not screen pixels
- crop should compose cleanly with zoom/pan

#### 7) Export comparison
**Why seventh:** Strong sharing feature once all view logic exists.

**Behavior:**
- export current stage as PNG
- support current mode, labels, crop, and transforms
- optionally support side-by-side export later

**Implementation notes:**
- export from a canvas render path, not DOM screenshotting
- logic belongs in `src/js/export.js`

## Lighter Features

### A) Arrow key slider nudging
- left/right arrows nudge the slider in slider mode
- use small step normally, larger step with Shift

### B) Zoom to cursor on scroll wheel
- this can land together with the full zoom system, not as a throwaway partial implementation

### C) Recently used list
- store last five filenames and lightweight metadata in localStorage
- do not attempt to store absolute file paths
- if session memory is active, show recent sessions separately from name-only recents

### D) Fullscreen mode
- `F` toggles fullscreen
- update hint text when active

### E) Image flip / rotate
- horizontal flip
- vertical flip
- 90-degree rotate
- apply transforms per image or globally, depending on UX decision

## Recommended Refactor Before Feature Work

Use `image-compare v2.html` as the canonical base and split it into modules.

### Proposed source layout

```text
src/
├─ index.html
├─ css/
│  └─ styles.css
└─ js/
   ├─ app.js          # boot + event wiring
   ├─ state.js        # central state and mutations
   ├─ viewer.js       # render pipeline and modes
   ├─ storage.js      # IndexedDB and localStorage helpers
   ├─ queue.js        # reference image + candidate stack
   ├─ transform.js    # zoom, pan, crop math
   ├─ diff.js         # pixel diff generation
   ├─ metadata.js     # EXIF / PNG chunk parsing
   └─ export.js       # canvas export pipeline
```

## Suggested Build Sequence

### Phase 1 - stabilize the base
1. adopt `image-compare v2.html` as canonical
2. split into `src/index.html`, `src/css/styles.css`, and modular JS files
3. preserve current slider, dissolve, toggle behavior exactly
4. add a small dev checklist and test fixtures

### Phase 2 - fast wins
5. add IndexedDB session restore
6. add arrow-key slider nudging
7. add fullscreen toggle
8. add recent files list

### Phase 3 - workflow expansion
9. add reference + queue mode
10. add queue navigation UI and keyboard shortcuts
11. add metadata side panel

### Phase 4 - precision review tools
12. add shared zoom state
13. add zoom-to-cursor
14. add synchronized pan
15. add reset-view control

### Phase 5 - advanced analysis
16. add diff mode
17. add threshold control
18. add crop / region lock
19. add export pipeline

## Architectural Recommendation

Do not keep scaling features inside the current single-file prototype.

The current prototype is a solid visual proof of concept, but the advanced feature set needs:
- modular state
- clear render pipeline boundaries
- canvas utilities for diff and export
- storage utilities for persistence
- transform math separated from UI events

## Recommendation for the next actual coding pass

Start by converting `image-compare v2.html` into `src/index.html` plus modular JS/CSS, while preserving every current behavior. That gives a stable foundation for the rest.
