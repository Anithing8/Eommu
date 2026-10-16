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

## Deploy on GitHub (one time)
1. Create a repository and push this folder to the `main` branch.
2. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push again, or run **Actions → Build and deploy Eommu → Run workflow**.
4. The workflow generates the PNG icons, stamps the service worker with the commit hash, and publishes `src/` to `https://<user>.github.io/<repo>/`.

## Install and use
- **Android (Chrome/Edge):** open the site, choose **Install app**. Eommu then appears in the system share menu.
- **Desktop Chrome/Edge:** use the install icon in the address bar.
- **iPhone/iPad:** Share → **Add to Home Screen**. Notifications work on iOS 16.4+ for installed apps; the share menu entry is not supported by iOS web apps.
- Tap the bell once to allow reminders.

## Known limits
Reminders fire when Eommu is open or running in the background. Browsers may suspend background apps, so a reminder can arrive late or not at all. Guaranteed delivery with the app closed requires a push server, which Eommu intentionally does not use to keep your data private.

## Local development
Serve `src/` with any static server (for example `python3 -m http.server -d src`). Service workers need `localhost` or HTTPS.

## Legal
[MIT License](LICENSE) · [Privacy](PRIVACY.md) · [Terms](TERMS.md). All code and artwork here are original. Eommu is not affiliated with any other product or company.
