# Observatory verification

Verified in headless Chromium with WebGL enabled, using the installed Playwright runtime. Responsive checks use browser viewports; physical devices were not used.

- The Go WebAssembly module initializes and the renderer uses WebGL.
- Drag, reset, hover settling, and motion pause work in the orbital view.
- Every one of the 15 echoes was discovered through a coarse/fine search using the visible frequency range and strength feedback. Weak signals do not record discoveries.
- All five landscapes render, with one accessible active world at a time.
- Recorded progress survives reload and previously recorded echoes stay recorded.
- The journal exports a valid SVG with all 15 stars and embedded Bodoni fonts.
- Navigation, discovery, journal layout, Escape controls, and reduced motion pass at 390×844, 320×667, 768×1024, and 1366×600, alongside the 1440×900 desktop flow.
- Native planet navigation and signal discovery remain playable when WebGL initialization is unavailable.
- Deep links and invalid or duplicated local-storage records recover correctly.
- The growing orbital constellation renders without buffer or shader errors.

Go tests cover deterministic and bounded star generation, finite orbital frames, achievable signal locks, invalid signal IDs, and valid poster XML with duplicate/invalid discoveries rejected. JavaScript syntax, local assets, and the static deployment build also pass.

Run `npm run build:engine`, `npm run check`, `npm run build`, and `node scripts/verify-browser.mjs` to reproduce the checks. The browser suite requires a running preview server and an existing Playwright installation; see README.md.

## Voxel sanctuary

The additional `node scripts/verify-sanctuary.mjs` suite verifies the actual rendered diorama, including image comparisons that prove it animates, freezes under motion pause, and responds to drag and zoom. It covers all three landmark close-ups, both lighting states, the journal, Escape navigation, keyboard re-entry, and recording an original-world echo after leaving the sanctuary.

Controls fit at 1440×900, 390×844, 320×667, 768×1024, and 1366×600. Reduced-motion controls and the WebGL-unavailable status also pass. Rendered desktop, portrait, day/night, and close-up images were inspected visually. The terrain tests reject duplicate cells, bound allocation, check repeatable output, and verify interior cells are excluded.
