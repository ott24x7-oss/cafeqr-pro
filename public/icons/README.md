# PWA Icons

The build expects PNG icons at:
- `public/icons/icon-192.png`  (192×192)
- `public/icons/icon-512.png`  (512×512)

A vector source is provided in `icon.svg`. Convert with any tool:

```bash
# Using rsvg-convert (recommended)
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png

# Or using ImageMagick
magick icon.svg -resize 192x192 icon-192.png
magick icon.svg -resize 512x512 icon-512.png

# Or use https://realfavicongenerator.net/ for a complete favicon set.
```

If the PNGs are missing, the manifest will still validate, but installs may
fall back to default icons in some browsers.
