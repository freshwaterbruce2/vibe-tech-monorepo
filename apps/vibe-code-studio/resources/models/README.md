# Vibe Code Studio Models

Place any local ONNX (and related JSON) model files in this folder.

During packaging, `electron-builder.yml` copies `resources/models` into the app's bundled `models/` directory.

Notes:

- Large model binaries should not be committed to git; keep them local.
- Runtime databases/logs still live on `D:\` per the repo rules.

