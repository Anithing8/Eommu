# Eommu

A calm, offline-capable task tracker built as an installable web app (PWA). No accounts, no tracking, no dependencies: plain HTML, CSS and JavaScript.

## Features
- Multiple lists (create, rename, delete) with visible delete buttons and undo
- Tasks with details, due date and time, stars, subtasks and repeats (daily, weekly, monthly)
- Move tasks between lists, sort by order, due date or stars, remove completed tasks
- **Copy from list**: pick another list and copy (or move) chosen tasks, subtasks included, into the current one
- Due-time reminders via notifications
- **Share to Eommu**: send text or a link from another app's share menu to create a task
- Bauhaus-style interface with light and dark themes, over a slowly turning, shaded flower background (still image for reduced-motion users)
- Works offline; data is stored locally on your device

## Deploy on GitHub Pages (no workflow needed)
1. Push this repository to the `main` branch. The app lives in the `docs/` folder.
2. Go to **Settings → Pages**, set **Source** to **Deploy from a branch**, choose branch `main` and folder `/docs`, then save.
3. After a minute the app is live at `https://<user>.github.io/<repo>/`.
4. When you change the app, edit the cache name in `docs/sw.js` (for example `v1` to `v2`) so installed copies pick up the update.

## Install and use
- **Android (Chrome/Edge):** open the site, choose **Install app**. Eommu then appears in the system share menu.
- **Desktop Chrome/Edge:** use the install icon in the address bar.
- **iPhone/iPad:** Share → **Add to Home Screen**. Notifications work on iOS 16.4+ for installed apps; the share menu entry is not supported by iOS web apps.
- Tap the bell once to allow reminders.

## Reminders
Tap **Remind** once to allow notifications. Reminders are delivered while Eommu is open or running in the background. On installed Chrome/Edge apps, Eommu also asks the browser to wake it periodically so reminders that came due while it was closed can still appear, but the browser decides when, so they can be late. On Android, turn off battery optimisation for the app and avoid force-closing it. Exact-time delivery with the app fully closed needs a push server, which Eommu intentionally does not use, so your tasks never leave your device.

## Local development
Serve `docs/` with any static server (for example `python3 -m http.server -d docs`). Service workers need `localhost` or HTTPS.

## Legal
[MIT License](LICENSE) · [Privacy](PRIVACY.md) · [Terms](TERMS.md). All code and artwork here are original. Eommu is not affiliated with any other product or company.
