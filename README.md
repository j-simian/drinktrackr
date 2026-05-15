# Bev Log

Tiny PWA for 5 friends to log drinks. Take a photo, pick who, save. Data stays on the device (IndexedDB). Installable to the home screen on iOS / Android.

## Stack

- Vite + React + TypeScript
- `idb` for IndexedDB
- `vite-plugin-pwa` for manifest + service worker

## Develop

```sh
npm install
npm run dev
```

Vite prints a LAN URL — open it on your phone to test the camera input.

## Build & preview

```sh
npm run build
npm run preview
```

The service worker only activates in a production build; use `preview` to try the PWA install flow locally.

## Deploy to GitHub Pages

The app is configured with `base: "/bevlog/"` in `vite.config.ts`, so the repo must be named `bevlog` (or update the base).

```sh
# one-time: create a `bevlog` repo on GitHub and add it as a remote
git init && git add . && git commit -m "init"
git remote add origin git@github.com:<you>/bevlog.git
git push -u origin main

# deploy
npm run deploy
```

Then enable Pages in the repo settings, serving from the `gh-pages` branch.

## Install on phone

1. Open `https://<you>.github.io/bevlog/` in Safari / Chrome.
2. Share → Add to Home Screen.
3. Launch from the home screen — runs fullscreen.

## Replacing icons

Swap the three PNGs in `public/`:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `apple-touch-icon.png` (180×180)
