# Home 3D — a garden house in your browser

**Live demo:** https://fighttechvn.github.io/home-3d/ · [Tiếng Việt](https://fighttechvn.github.io/home-3d/?lang=vi) · [README tiếng Việt](README.vi.md)

An open-source, zero-build web viewer for a single-storey Vietnamese garden house (7.0 × 19.3 m), rebuilt from its
drawings with [three.js](https://threejs.org). It is the web reference renderer behind
[Nhà Vườn Studio](https://github.com/fighttechvn), the native 3D house designer in FightTech's DWG Viewer and RoomLedger apps.

- **2D plan** — SVG floor plan with walls, doors, windows, room areas and furniture symbols; pinch/scroll zoom and pan.
- **3D model** — orbit, preset camera views, roof toggle, wall cut-away, floating room labels.
- **Walk mode** — a character with collision, minimap, joystick on touch screens and gyro look on phones.
- **Furniture editor** — add from a library, move, rotate and resize; layouts are saved in the browser.
- **Realistic mode** — PBR materials, day/night lighting with indoor and garden lamps.
- **Video tour** — records a camera flythrough to a video file.
- **AR / VR** — WebXR VR and AR, plus USDZ export for AR Quick Look on iPhone/iPad; import GLB/OBJ/STL models.
- **English and Vietnamese** — `?lang=en` or `?lang=vi`.

## Run locally

The page uses ES modules, so serve it over HTTP (opening `index.html` from disk will not work):

```bash
git clone https://github.com/fighttechvn/home-3d.git
cd home-3d
python3 -m http.server 8080
```

Then open http://localhost:8080 (add `?lang=en` for English, `#3d` / `#2d` to choose the view).
No build step, no npm install: three.js r147 is vendored in `vendor/three/`.

## Project layout

```
index.html               page shell (no logic)
styles/                  base, 2D plan, 3D overlays, furniture editor, video tour, XR
scripts/
  main.js                boots the modules in order
  core/                  DOM helpers, 2D geometry, seeded random, event bus, app state, i18n
  data/                  plain data: house plan, furniture catalogue, camera views, lights, tour shots
  model/                 wall segmentation and openings, furniture store
  plan2d/                SVG plan renderer and viewport
  viewer3d/              scene setup, materials, house/site builders, lighting, camera, labels
  features/
    walk/                character, collision, minimap, gyro look
    furniture-editor/    furniture editing and layout storage
    video-tour/          recorded flythrough
    xr/                  WebXR AR/VR, USDZ writer, model import
  ui/                    room panel, 2D/3D switch
vendor/three/            three.js r147 and the loaders/controls used (MIT)
```

## Make it your house

Everything about the house is data in `scripts/data/`:

- `house-plan.js` — walls (polylines, metres), doors, windows, rooms, the plot and trees.
- `furniture-catalog.js` — furniture placed on the drawing and the library you can add from.
- `camera-views.js`, `lighting-fixtures.js`, `tour-shots.js` — views, lamps and the video tour.

Units are metres. On the plan x goes right and y goes down; in 3D the plan's y is the z axis.
Features talk to each other through `scripts/core/events.js` rather than calling each other directly.

## Deploying

The repository root is the site. GitHub Pages serves it from the `main` branch (`.nojekyll` keeps files as they are),
so any static host works the same way.

## License

[MIT](LICENSE) © FightTech. three.js is © three.js authors, MIT ([vendor/three/LICENSE](vendor/three/LICENSE)).
