# OTHERWHERE / The observatory

A playable 3D universe inspired by the five supplied illustrations. Orbit five procedural planets, land in their landscapes, tune fifteen hidden echoes, and create a personal constellation in the order you discover them.

## Run locally

Requires Node.js 20.11 or later. Runtime dependencies are vendored, so no npm install is needed.

~~~sh
npm run dev
npm run check
npm run build
~~~

Open http://localhost:4173. Drag the universe to orbit, scroll to change your distance, or choose a planet button. In a landscape, select a glimmer and move the frequency dial until resonance stays above 97% for 1.15 seconds. Each recorded echo becomes a star. Open **Field journal** to export a self-contained SVG poster with the Bodoni fonts embedded. Discovery order is saved locally in your browser.

The planet buttons and frequency range work with the keyboard. Escape closes the instrument, then returns to orbit. Sound is opt-in; the motion control and system reduced-motion preference stop continuous animation and skip camera flights. A native planet list remains available if WebGL cannot initialize.

## The Go engine

Go is used for real runtime work, not a placeholder server. Source lives in engine/. It compiles to vendor/universe.wasm and runs inside the browser:

- Deterministic three-dimensional star catalog and planetary orbital frames.
- Signal resonance used by every frequency adjustment.
- Constellation geometry and SVG poster generation from discovery order.

Three.js 0.186.1 renders the WebGL geometry, raycasting, procedural surface shaders, camera flights, crystalline probes, and the five spatial resonance formations. JavaScript connects the DOM controls to those systems.

~~~sh
npm run build:engine
~~~

Rebuilding requires Go 1.24 or later on PATH, GO_BINARY, or a local .tools/go SDK. The script runs Go tests, compiles with GOOS=js GOARCH=wasm, and copies the matching wasm_exec.js and Go license. Generated runtime files are checked in so static hosting works without a Go server.

## Verification

The browser play-test runs against an already running preview server using an existing Playwright installation:

~~~sh
node scripts/verify-browser.mjs
~~~

Set PLAYWRIGHT_MODULE_PATH to its package directory if Playwright is outside this checkout. PREVIEW_URL overrides the default localhost preview.

The original image files are preserved. This is a fictional art experience. Source notes, typography licenses, and art direction are described in DESIGN.md.
