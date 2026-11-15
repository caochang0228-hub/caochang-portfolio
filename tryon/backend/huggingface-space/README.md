---
title: TRY ON AI
emoji: 👗
colorFrom: yellow
colorTo: gray
sdk: gradio
sdk_version: 6.29.0
python_version: "3.12"
app_file: app.py
pinned: false
license: cc-by-nc-sa-4.0
---

# TRY ON AI · Hugging Face ZeroGPU

Free, real virtual try-on backend for the TRY ON iPhone PWA.

- Model: CatVTON MaskFree
- Input: person image and garment image as Base64 data URLs
- Output: generated JPEG data URL
- API name: `/try_on`
- No COS or paid API required
- Photos are processed for the current request and are not added to a permanent gallery by this app

## Deployment

Create or duplicate a public Gradio Space, select **ZeroGPU**, and copy the three files in this folder to the Space root.

After the Space is running, set `tryon/config.js`:

```js
window.TRYON_CONFIG = {
  apiBase: "https://YOUR-SPACE.hf.space",
  apiMode: "hf-zero-gpu"
};
```

CatVTON code and checkpoints are available under CC BY-NC-SA 4.0 for non-commercial use.
