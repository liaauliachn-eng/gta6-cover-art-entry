# gta6-cover-art-entry

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/liaauliachn-eng/gta6-cover-art-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/liaauliachn-eng/gta6-cover-art-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio — an offline web app that turns your own photos into GTA-style
cover art: a hero panel plus two supporting panels in a dark grid, per-panel crop
and position (drag, scroll to zoom, or sliders), an editable caption in bold Anton
lettering, a Vice City sunset or neon colour grade, and one-click PNG export in
1080 × 1080, 1080 × 1350 and 1920 × 1080. Your photos never leave your device.
An original design; not affiliated with Rockstar Games.

## How it works

1. **Photos** — drop in one photo or several (or use the built-in demo photos).
   Click a thumbnail to put that photo in the selected panel; "Fill all panels
   with this photo" spreads one photo across all three panels with different
   crops, so a single snapshot still reads as a multi-panel poster.
2. **Panels** — click a panel to select it, then drag its photo to reposition it,
   scroll to zoom, or use the Zoom / Position sliders. Each panel keeps its own
   crop, so the hero can show the full scene while a side panel zooms in on a face.
3. **Caption** — type the title and subtitle; the lettering re-fits live.
4. **Grade** — Vice Sunset, Neon Nights, or Clean Chrome colour grades.
5. **Size** — Square 1080 × 1080, Portrait 1080 × 1350, or Wide 1920 × 1080.
6. **Export PNG** — the cover renders at full size on a canvas and downloads as
   a PNG, ready to share.

The screenshots show the real thing: `1-cover.jpg` is the wide PNG the app's
Export button wrote, `3-cover-portrait.jpg` and `4-cover-square.jpg` the other
two sizes, and `2-editor.jpg` the editor with a photo loaded.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network: `app/` is plain static files, and the Anton display
font ships under `app/fonts/` under the SIL Open Font License (see
`app/fonts/OFL.txt`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=x0y2c17b&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards · Referral: https://make.fun/r/x0y2c17b</sub>
