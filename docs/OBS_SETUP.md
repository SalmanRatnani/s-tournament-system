# Production broadcasting plan — three independent court feeds

## Your configuration

- Broadcast computer: HP OMEN Ryzen 7000 series / 16 GB RAM / RTX 4060.
- Network: 50 Mbps claimed; **verify this is sustained upload** at the venue, not just download.
- Devices: 3 camera phones and 3 referee scoring phones.
- Output: three separate YouTube videos, one per court. Each video must have its OWN unique live event and stream key.

## Recommended conservative approach

**Start with a trial of three independent OBS Studio processes** (not the normal multi-RTMP plugin, which typically mirrors one OBS output to multiple destinations). OBS supports `--multi`, `--profile` and `--collection` options, with a separate profile/scene collection for each court. A per-scene multistream extension may simplify operations but should be load-tested first; avoid newly published extensions on tournament day without extensive validation.

Example Windows shortcut target for Court 1 (the exact installation path may differ):

```text
"C:\Program Files\obs-studio\bin\64bit\obs64.exe" --multi --profile "COURT 01" --collection "COURT 01"
```

Create profiles and scene collections named `COURT 01`, `COURT 02`, `COURT 03` in OBS first. Then duplicate the shortcut twice, changing both names. Keep the three instances independent. OBS's WebSocket control (if enabled) must use different ports per instance.

**Lower resource option:** a well-reviewed plugin that explicitly supports binding a unique scene to each RTMP output. Confirm not just multiple stream keys but *simultaneous independent scene rendering*. At October 2026, niche per-scene plugins exist, but verify release age, signatures, compatibility and reliability before trusting a live event.

## Camera source pair

For each phone, open `https://vdo.ninja` and select `Add your Camera to OBS`. The phone provides a **VIEW** URL. Enter it into the matching OBS court scene as a Browser Source. Do not use PUSH URLs as browser sources.

| Source | Camera sender | OBS scene | Scoreboard browser source |
|---|---|---|---|
| Court 1 | Phone camera A | COURT 01 | `https://YOUR-DOMAIN/overlay/1` |
| Court 2 | Phone camera B | COURT 02 | `https://YOUR-DOMAIN/overlay/2` |
| Court 3 | Phone camera C | COURT 03 | `https://YOUR-DOMAIN/overlay/3` |

For each OBS scene, stack the score overlay **above** the camera source, and set the overlay Browser Source dimensions to 1920 × 1080. The overlay browser source itself has a transparent canvas.

## Initial broadcast configuration

- Resolution: 1280 × 720, 30 fps per output.
- Encoder: NVIDIA NVENC, H.264; keyframe interval 2 seconds, CBR as recommended by streaming platform.
- Start with about 3,000–4,000 kbps VIDEO bitrate per court plus ~128 kbps stereo audio. Total roughly 10–14 Mbps upstream, plus network overhead; check YouTube health and increase only if stable.
- Enable OBS reconnects, turn off unnecessary preview windows, and connect the laptop via Ethernet if possible.
- Use permanent chargers, phone coolers if necessary, solid mounts and reliable venue Wi-Fi.
- Complete a **30–60 minute simultaneous load test** and monitor OBS Stats, encoder lag, dropped frames, laptop thermals and stream health.

## Recording and score latency

- Referee point goes through Supabase database, updates all live clients and OBS browsers.
- YouTube viewer may see score ahead of the actual rally because of streaming latency. Keep an eye on expected viewer sync and optionally delay the public textual scores in a later milestone.
- Do not put YouTube RTMP stream keys, referee passwords or production Supabase service keys in OBS browser source URLs or in public application records.

Official references:
- [VDO.Ninja mobile camera into OBS](https://docs.vdo.ninja/getting-started/mobile-phone-camera-into-webcam)
- [OBS multiple independent profiles/instances](https://obsproject.com/forum/threads/obs-multi-key-operation.169561/)
- [OBS Multiple RTMP Outputs plugin](https://obsproject.com/forum/resources/multiple-rtmp-outputs-plugin.964/)
- [YouTube Live recommended encoder settings](https://support.google.com/youtube/answer/2853702)
