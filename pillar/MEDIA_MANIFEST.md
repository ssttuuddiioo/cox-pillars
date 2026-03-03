# Media Manifest — Pillar Kiosks

Each pillar kiosk needs a `media/` folder on the local filesystem.
Default location: `./media` relative to `pillar/`, or set via `MEDIA_PATH` env var.

These files are NOT in the git repo — copy them to each PC on install day.

---

## Carbon & Climate (`PILLAR=carbon`)

```
media/
  photos/
    solar-panels.jpg          Hero image — solar panel installation
    solar-detail-1.jpg        Thumbnail — close-up of floating solar
    solar-detail-2.jpg        Thumbnail — aerial view
    seea-partnership.jpg      Hero image — SEEA/Drawdown partnership
  videos/
    flux-hybrid.mp4           Hero video — Flux Hybrids demonstration
```

## Water (`PILLAR=water`)

```
media/
  photos/
    water-1.jpg
    water-2.jpg
    water-3.jpg
  videos/
    (none yet)
```

## Circularity & Waste (`PILLAR=circularity`)

```
media/
  photos/
    circularity-1.jpg
    circularity-2.jpg
    circularity-3.jpg
  videos/
    (none yet)
```

## Habitat & Species (`PILLAR=habitat`)

```
media/
  photos/
    habitat-1.jpg
    habitat-2.jpg
    habitat-3.jpg
  videos/
    (none yet)
```

---

## Specifications

### Video
- Resolution: 1080x1920 (portrait) or 1920x1080 (landscape, cropped to fit)
- Codec: H.264 MP4
- Audio: AAC
- Duration: 30–120 seconds recommended

### Images
- Hero photos: 1080px wide minimum, JPG
- Thumbnails: 400x400px minimum, JPG
