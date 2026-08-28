# VectorShift SVG

Local batch raster-to-SVG converter for app assets.

## What It Does

- Accepts PNG, JPG/JPEG, and WEBP images.
- Converts each image into a standalone SVG.
- Default mode preserves the original image exactly by embedding it in an SVG `<image>` element.
- VTracer modes remain available when you need true editable vector paths.
- Writes output to `D:/VectorShift_Outputs` by default.
- Serves a browser UI at `http://127.0.0.1:3000`.

## Run Locally

```powershell
cd V:\monorepo
pnpm nx dev vectorshift-svg
```

`pnpm nx dev vectorshift-svg` starts the React app and the local FastAPI vector engine. If you
want to run the API separately:

```powershell
python -m pip install -r requirements.txt
pnpm nx api vectorshift-svg
```

Then start the UI with:

```powershell
$env:VECTORSHIFT_MANAGE_FASTAPI='0'
pnpm nx dev vectorshift-svg
```

## Output

Generated SVG files are saved in `D:/VectorShift_Outputs`. You can change that
directory in the app settings panel.

For maximum visual fidelity, use `Exact Visual SVG`. This produces an SVG file
that looks like the original because it embeds the raster image. For true
editable vector paths, use `VTracer High Detail`. For simple one-color icons or
sketches, use `VTracer Line Art`.
