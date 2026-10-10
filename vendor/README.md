# Local runtime assets

- Three.js **0.186.1**, official npm distribution, MIT license in `Three-LICENSE.txt`.
- `universe.wasm` is built from the project's `engine/` Go source, using `npm run build:engine`.
- `wasm_exec.js` is copied from the same Go toolchain as the compiled module. It carries the Go Authors BSD license header.

The Go engine generates the deterministic 3D star catalog, updates the five orbital positions, calculates radio resonance, and creates the personal constellation SVG. JavaScript handles input and WebGL presentation.

Reference documentation: https://go.dev/wiki/WebAssembly and https://threejs.org/docs/pages/WebGLRenderer.html.
