# Art direction

OTHERWHERE is an imaginary field atlas. It combines the solitude and scale of the supplied illustrations with an editorial, high-contrast serif and the fine notation of astronomical charts. Copy is deliberately sparse.

## Five worlds

1. **The Pale Frontier** — sage daylight, windblown dust, wide lateral movement. Source: `70fab4545b453dc9a3492176d1aef096.jpg`.
2. **A Sun That Sleeps** — peach clouds, elliptical orbit lines, ascending embers. Source: `m1000x1000.jpg`.
3. **The Last Light** — chalk blue, lunar halos, a circular eclipse transition. Source: `7248066809.jpg`, framed through CSS without modifying the file.
4. **A Fire Within** — parchment and vermilion, diagonal falling arrows, an angular transition. Source: `90926a3b4548b0eeee9af005be0dbf80.jpg`. The source carries a Pixel_PulseAI artist marking.
5. **Where Silence Lives** — nocturnal teal, fireflies, starlight and a slow dissolve. Source: `eastshade_night.jpg`.

## References

- Supplied artwork in `img/` is the primary visual reference.
- [Immersive Garden](https://immersive-g.com/the-studio/) — pacing and the presentation of an immersive experience. No source code or assets copied.
- [Bodoni Moda](https://github.com/indestructible-type/Bodoni) — distinctive editorial display typography.
- [Fragment Mono](https://github.com/google/fonts/tree/main/ofl/fragmentmono) — compact field notation. Both fonts are self-hosted under the SIL OFL; license copies accompany the files.

## Motion

A single canvas renders sparse theme-specific particles. Slow parallax is damped rather than attached directly to the pointer. Each transition uses a different clip or dissolve. Reduced-motion and the pause control stop continuous motion and shorten transitions. Ambient audio is synthesized locally using Web Audio and starts only after a sound-button gesture.
