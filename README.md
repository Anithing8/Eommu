# Eommu

Eommu is a task tracker for Android, with a web version that runs in any browser. You organise tasks into lists, give them due dates, and get a notification when they are due. There are no accounts and nothing is sent to a server. Everything is stored on your own device.

## Features

- Multiple lists, which can be renamed, deleted and sorted
- Tasks with notes, a due date and time, a star, and repeats (daily, weekly or monthly)
- Subtasks inside a task
- Copy or move tasks from one list to another
- Reminders at the due time, with a "Mark done" action in the Android notification
- Add a task by sharing text to Eommu from another app
- Undo after deleting a task or clearing completed tasks
- Light and dark themes

## Platforms

The Android app is in `android/` and is written in Kotlin with Jetpack Compose. It supports Android 8.0 and newer.

The web version is in `docs/` and is plain HTML, CSS and JavaScript. It can be installed from the browser and works offline. It keeps its own tasks, separate from the Android app.

## Privacy

Eommu has no analytics, no ads and no network access in the Android app. See [PRIVACY.md](PRIVACY.md) for details.

## License

Released under the [MIT License](LICENSE). See also the [Terms of Use](TERMS.md).
