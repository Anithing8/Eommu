# Eommu

A calm, offline-capable task tracker built as an installable web app (PWA). No accounts, no tracking, no dependencies: plain HTML, CSS and JavaScript.

## Features
- Multiple lists (create, rename, delete)
- Tasks with details, due date and time, stars, and subtasks
- Repeating tasks (daily, weekly, monthly)
- Move tasks between lists, sort by order, due date or stars
- Completed section and "Clear done"
- **Copy yesterday**: brings the previous day's tasks (and subtasks) into today, skipping duplicates
- Due-time reminders via notifications
- **Share to Eommu**: send text or a link from another app's share menu to create a task
- Neumorphic light and dark themes, with a drifting ring-and-check background (disabled for reduced-motion users)
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

## Known limits
Reminders fire when Eommu is open or running in the background. Browsers may suspend background apps, so a reminder can arrive late or not at all. Guaranteed delivery with the app closed requires a push server, which Eommu intentionally does not use to keep your data private.

## Local development
Serve `docs/` with any static server (for example `python3 -m http.server -d docs`). Service workers need `localhost` or HTTPS.

## Legal
[MIT License](LICENSE) · [Privacy](PRIVACY.md) · [Terms](TERMS.md). All code and artwork here are original. Eommu is not affiliated with any other product or company.
