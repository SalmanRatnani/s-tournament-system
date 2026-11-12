# OBS + YouTube — Three-court broadcast runbook

## Status: operator-assisted setup, not automatic YouTube control
- S Tournament System displays public YouTube videos and provides signed *read-only* browser-source URLs for live court scores.
- It does **not** transmit video, control OBS, create YouTube livestreams, start/stop them, or store YouTube ingest keys.
- Staff must configure camera feeds, OBS encoders and YouTube Live Control Room on their own devices.
- Site: /admin/production (Owner only) and /admin/viewer-links (Owner only). Spectators: /live and /watch/1, /watch/2, /watch/3.
- No fixture needs to exist for an OBS overlay test: the scoreboard displays a waiting-for-match slate until a match is active.

## Phase 1: Test Court 1 without publishing
1. In YouTube Studio, verify the channel and enable live streaming. The first activation can take up to 24 hours. Choose **Create > Go live > Stream/Encoder**, create an **Unlisted** live event and inspect the stream key. Don't put the key in this website, GitHub, chat or screenshots.
2. Install OBS Studio from obsproject.com. Create a **Court 1** scene, Canvas 1920×1080, output 1280×720 at 30 fps for initial tests.
3. Feed the camera into OBS. USB webcam/capture adapter uses **Sources > Video Capture Device**. For remote smartphone cameras, an operator may use a **VDO.Ninja** private view link with **Sources > Browser**. Use one camera per court and verify video/audio latency and battery/heat.
4. In S Tournament's /admin/production, generate the signed **Court 1 score overlay URL**. Add it as a separate OBS **Browser Source**, set width 1920 and height 1080 and layer it above the camera. The link grants read-only access and expires in 24 hours. Test the standby slate before fixtures.
5. In OBS **Settings > Stream**, choose YouTube RTMPS (or YouTube account integration), and connect using the **secret** from YouTube Studio. Enable NVENC H.264 if available. Suggested first test: CBR, **720p30**, **8,000 Kbps video**, **128 Kbps AAC**, **2-second keyframes**; YouTube lists 8 Mbps as its recommended H.264 ingest bitrate for 720p30. Lower rates require a real picture-quality test and should be verified against YouTube's current encoder guidance.
6. Start Streaming in OBS, check YouTube Control Room ingest status, then start/confirm the unlisted live event. Observe the encoder's dropped frames and buffering during fast movement. Confirm audible microphone/court ambient audio, with no feedback loop.
7. Copy the event's **public YouTube watch URL** into S Tournament's /admin/viewer-links for **Court 1**. Do not paste the RTMP key. Visit /watch/1 using another browser/device: validate playback, scoreboard and no login requirement. The event must permit embedding.
8. Stop OBS and end the YouTube event manually after testing. Verify the player and overlay return to expected standby states. Remove/test links when the event ends.

## Phase 2: Expand to all three courts
- A single OBS program output and scene switching **does not** produce three separate live streams. Use **three independently encoded outputs** to three distinct YouTube live events and three different private score-browser-source URLs.
- Architecture A: one Windows RTX 4060 laptop receives three phone feeds, and runs **three independent encoder processes/instances**, each with its own camera source, OBS score overlay, profile and independent YouTube stream key. Verify that the specific OBS installation/multi-instance setup is supported, and performance is adequate; do not assume multiple OBS scenes = multiple outputs. Alternatively use dedicated encoders if stability is insufficient.
- Architecture B: three encoder PCs/devices, one per court, each running its own OBS scene/profile. Less central failure coupling but more devices to administer.
- Estimated three 720p30 H.264 streams at the example preset: 3 × (8.0 Mbps video + 0.128 Mbps audio) = **24.384 Mbps outbound**, plus protocol/network overhead. A quoted **50 Mbps plan is not proof of sustained 50 Mbps upload**. Measure actual sustained upload at the venue, over Ethernet when possible. Keep operational headroom for 3 incoming phone feeds, score operations and burst traffic.
- With VDO.Ninja or network phone feeds, test Wi-Fi signal, jitter, phone overheating, power, notification interruptions and audio monitoring. Video feeds can consume network capacity even if YouTube output is elsewhere.
- Set up three distinct YouTube events (Court 1, 2, 3), preferably **Unlisted** for rehearsal. Capture three public watch URLs and save them against the corresponding court only. Confirm all three /watch/{court} pages independently using a spectator device.
- Rotate or replace expiring overlay links before live play and refresh the OBS browser sources. Maintain an operator-controlled emergency slate in each encoder and a contingency if a stream disconnects.

## OBS source stack (bottom to top)
- Bottom: phone camera feed (or capture input) fills canvas.
- Middle: optional sponsor / organiser visuals (planned but not yet integrated).
- Top: signed read-only score Browser Source, canvas 1920×1080; transparent outside the graphic.

## Privacy and security
- Never publish stream keys, private smartphone viewing URLs, or signed overlay URLs. They are not spectator links.
- Only use the **public** `youtube.com/watch?v=...` or `youtube.com/live/...` URL in S Tournament's Viewer Links.
- Signed overlay URL expiry is 24 hours. Recreate it through the Owner screen; rotate the signing secret if compromised (rotating invalidates all issued overlay tokens).
- Viewer pages cannot change score state; the Owner and assigned officials remain separate authenticated roles.
- On YouTube, understand Unlisted vs Public visibility, embedding permissions, Copyright ID/music licensing, live chat controls and privacy for minors.

## Preflight sign-off (on site)
- Each camera view holds stable, full-court composition for 30 min of fast rally simulation.
- Three independent YouTube ingests show healthy status simultaneously, with acceptable motion/compression, no desync or audio feedback.
- Overlay data changes propagate within the acceptable event tolerance, and the player/spectator experience accounts for YouTube delay.
- Each public court URL shows only its own event; changing one event does not overwrite another.
- Hot backup phone has charged battery and camera source-switch instructions.
- If internet uplink is lost, officials can follow a documented match-scoring contingency; do not promise automatic offline synchronization until implemented/tested.

## Reference docs
- YouTube encoder guide: https://support.google.com/youtube/answer/2853702
- YouTube first livestream / encoder setup: https://support.google.com/youtube/answer/2907883
- OBS official: https://obsproject.com/download
- VDO.Ninja operator option: https://vdo.ninja/


## Audience setup — 11 November 2026
For the free-budget event, share the saved YouTube watch links with the large
audience. The website’s /live hub and /watch/1–3 pages remain available. Add the
signed Browser Source above each camera in OBS so the official score is part of
the outgoing video. Public watch pages do not repeatedly fetch independent scores.
Use Main Controller → OBS production to generate the three court links, and
Viewer links & YouTube to save/copy the three public video URLs. Create these
actual YouTube events and start the encoders from the venue; no video is started
by deploying this application. Rehearse all three feeds before the event.
