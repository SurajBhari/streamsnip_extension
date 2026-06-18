# StreamSnip Extension

![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-MV3-4285F4?style=flat&logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=flat&logo=youtube&logoColor=white)

A lightweight Chrome (Manifest V3) extension that overlays **clip markers on the YouTube video scrubber**, so you can instantly see and jump to every moment that was clipped with [StreamSnip](https://streamsnip.com) during a live stream or its VOD.

![Clip markers on the YouTube timeline](https://github.com/SurajBhari/streamsnip_extension/assets/45149585/87a5cb1c-caaf-4bb5-87a0-b63f9175c84f)

## What it does

- Watches the YouTube player and, when you open a stream/VOD that has StreamSnip clips, draws a marker on the progress bar for each clip.
- Hovering a marker shows the clip's message; the markers update automatically as you navigate between videos.
- No login, no configuration, **no permissions** — it only reads clip metadata for the current video from the public StreamSnip API.

Clip data is fetched from the StreamSnip API (`https://streamsnip.com/extension/clips/<video_id>`). The extension is a thin client; the clips themselves are created via the StreamSnip Nightbot command — see the [main StreamSnip repo](https://github.com/SurajBhari/streamsnip).

## Install

**From the Chrome Web Store:** search for *StreamSnip* (the extension auto-updates via the store).

**Manual / unpacked (for development):**

1. Clone or download this repo.
2. Go to `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open any YouTube stream that has StreamSnip clips — markers appear on the scrubber.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest — runs `ss.js`/`ss.css` on all `youtube.com` pages. |
| `ss.js` | Content script: waits for the player, fetches clips, renders and positions markers. |
| `ss.css` | Styling for the markers and tooltips. |

## Related

- [streamsnip](https://github.com/SurajBhari/streamsnip) — project home & Nightbot setup.
- [streamsnip_downloader](https://github.com/SurajBhari/streamsnip_downloader) — download clip segments locally.
