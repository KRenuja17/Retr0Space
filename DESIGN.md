# Art direction

OTHERWHERE is a small exploration instrument: an astronomical chart you can enter and change. The illustrations establish the universe's solitude and scale; procedural geometry gives the visitor agency, depth, and a reason to return. Copy stays sparse. Bodoni Moda supplies the expressive serif; Fragment Mono supplies the field notation. Both fonts are hosted locally under the SIL OFL.

## Places and spatial signatures

1. **Pale Frontier** — a sage marbled planet, windblown particles, and a long winding spatial signal. Source: img/70fab4545b453dc9a3492176d1aef096.jpg.
2. **Sleeping Sun** — a striped warm planet with translucent rings, ascending dust, and nested resonance halos. Source: img/m1000x1000.jpg.
3. **Lunar Shore** — a chalk-blue moon, drifting specks, and intersecting orbital rings. Source: img/7248066809.jpg. The frame is cropped in CSS; the supplied file is preserved.
4. **Crimson Oath** — a vermilion planet, diagonal arrow particles, and a radial arrow formation. Source: img/90926a3b4548b0eeee9af005be0dbf80.jpg. Original artist marking: @Pixel_PulseAI.
5. **Blue Hour** — a teal planet, nighttime fireflies, and an ascending helical signal. Source: img/eastshade_night.jpg. Reference: Eastshade.

The observatory is a depth-buffered WebGL scene. Planets have procedural noise, surface bands, directional shading, and atmosphere geometry. Go calculates their orbital positions and a deterministic star sphere. Drag changes the view; real raycasting lets a visitor select a planet's mesh. A camera flight arcs toward the selected planet before revealing the illustrated landscape. Each world uses a different arc.

## The discovery loop

Choose a planet → land → select a glimmer → tune a signal → record a star.

Each world has three echoes. The Go resonance curve controls the instrument's strength meter and the scene's spatial formation. A lock requires a sustained clear signal, rather than a button that immediately marks an item complete. Returning to orbit reveals charted-world notation. The journal links stars in discovery order, which makes its SVG export personal.

Continuous motion pauses when a native dialog opens, when the page is hidden, when requested by the visitor, or under reduced-motion preferences. Signal tuning remains playable with motion paused. The HTML buttons, native range, and dialogs preserve keyboard access.

## Sources and licenses

- The supplied artwork is the primary visual reference; no additional artwork is downloaded.
- [Immersive Garden](https://immersive-g.com/the-studio/) informed the original cinematic pacing; no source or assets copied.
- [Bodoni Moda](https://github.com/indestructible-type/Bodoni) and [Fragment Mono](https://github.com/google/fonts/tree/main/ofl/fragmentmono): SIL OFL copies in fonts/.
- Three.js 0.186.1: MIT license in vendor/Three-LICENSE.txt.
- Go WebAssembly runtime: matching Go toolchain version, BSD license in vendor/Go-LICENSE.txt.
