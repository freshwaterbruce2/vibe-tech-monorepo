import base64

# pyrefly: ignore [missing-import]
import cv2

# pyrefly: ignore [missing-import]
import numpy as np

try:
    # pyrefly: ignore [missing-import]
    import vtracer
except Exception:
    vtracer = None


class VectorEngine:
    def __init__(
        self, max_dimension: int = 2048, max_colors: int = 32, min_area: float = 3.0
    ):
        self.max_dimension = max_dimension
        self.max_colors = max_colors
        self.min_area = min_area

    def check_user_credits(self, user_id=None):
        return True

    def process_image(
        self,
        image_data: bytes,
        image_format: str | None = None,
        preset: str = "svg-wrapper",
    ) -> str:
        if not self.check_user_credits():
            raise ValueError("Insufficient credits.")

        if preset == "svg-wrapper":
            return self._process_as_exact_svg_wrapper(image_data, image_format)

        if preset.startswith("vtracer"):
            return self._process_with_vtracer(image_data, image_format, preset)

        image = self._decode_image(image_data)
        rgb, alpha = self._normalize_channels(image)
        rgb, alpha = self._resize_for_tracing(rgb, alpha)

        visible_mask = alpha > 12
        height, width = visible_mask.shape
        if not np.any(visible_mask):
            return self._blank_svg(width, height)

        labels, centers = self._quantize_visible_pixels(rgb, visible_mask)
        paths = self._build_svg_paths(labels, centers, visible_mask)

        if not paths:
            return self._fallback_mask_svg(visible_mask, width, height)

        return "\n".join(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                (
                    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
                    f'width="{width}" height="{height}" role="img">'
                ),
                "  <title>VectorShift SVG output</title>",
                *paths,
                "</svg>",
                "",
            ]
        )

    def _process_as_exact_svg_wrapper(
        self,
        image_data: bytes,
        image_format: str | None,
    ) -> str:
        image = self._decode_image(image_data)
        height, width = image.shape[:2]
        mime_type = self._mime_type_for_format(image_format)
        encoded = base64.b64encode(image_data).decode("ascii")

        return "\n".join(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                (
                    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
                    f'width="{width}" height="{height}" role="img">'
                ),
                "  <title>VectorShift exact visual SVG output</title>",
                "  <desc>Contains the original raster image embedded inside an SVG image element.</desc>",
                (
                    f'  <image href="data:{mime_type};base64,{encoded}" x="0" y="0" '
                    f'width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet" />'
                ),
                "</svg>",
                "",
            ]
        )

    def _process_with_vtracer(
        self,
        image_data: bytes,
        image_format: str | None,
        preset: str,
    ) -> str:
        if vtracer is None:
            raise RuntimeError(
                "vtracer is not installed. Run: python -m pip install -r requirements.txt"
            )

        normalized_format = (image_format or "png").lower().lstrip(".")
        if normalized_format == "jpg":
            normalized_format = "jpeg"

        options = self._vtracer_options(preset)
        svg = vtracer.convert_raw_image_to_svg(
            image_data,
            img_format=normalized_format,
            **options,
        )

        if not isinstance(svg, str) or "<svg" not in svg:
            raise ValueError("VTracer did not return SVG output.")

        return svg

    def _mime_type_for_format(self, image_format: str | None) -> str:
        normalized_format = (image_format or "png").lower().lstrip(".")
        if normalized_format in {"jpg", "jpeg"}:
            return "image/jpeg"
        if normalized_format == "webp":
            return "image/webp"
        return "image/png"

    def _vtracer_options(self, preset: str) -> dict[str, object]:
        if preset == "vtracer-detailed":
            return {
                "colormode": "color",
                "hierarchical": "stacked",
                "mode": "spline",
                "filter_speckle": 1,
                "color_precision": 8,
                "layer_difference": 4,
                "corner_threshold": 50,
                "length_threshold": 3.5,
                "max_iterations": 16,
                "splice_threshold": 45,
                "path_precision": 3,
            }

        if preset == "vtracer-lineart":
            return {
                "colormode": "binary",
                "hierarchical": "stacked",
                "mode": "spline",
                "filter_speckle": 2,
                "color_precision": 6,
                "layer_difference": 16,
                "corner_threshold": 60,
                "length_threshold": 3.5,
                "max_iterations": 12,
                "splice_threshold": 45,
                "path_precision": 3,
            }

        return {
            "colormode": "color",
            "hierarchical": "stacked",
            "mode": "spline",
            "filter_speckle": 2,
            "color_precision": 7,
            "layer_difference": 8,
            "corner_threshold": 60,
            "length_threshold": 4.0,
            "max_iterations": 12,
            "splice_threshold": 45,
            "path_precision": 3,
        }

    def _decode_image(self, image_data: bytes) -> np.ndarray:
        image_buffer = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(image_buffer, cv2.IMREAD_UNCHANGED)
        if image is None:
            raise ValueError("Could not decode image.")
        return image

    def _normalize_channels(self, image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        if image.ndim == 2:
            rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            alpha = np.full(image.shape, 255, dtype=np.uint8)
            return rgb, alpha

        if image.shape[2] == 4:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
            alpha = image[:, :, 3]
            return rgb, alpha

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        alpha = np.full(image.shape[:2], 255, dtype=np.uint8)
        return rgb, alpha

    def _resize_for_tracing(
        self,
        rgb: np.ndarray,
        alpha: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray]:
        height, width = alpha.shape
        largest_side = max(width, height)
        if largest_side <= self.max_dimension:
            return rgb, alpha

        scale = self.max_dimension / largest_side
        new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        return (
            cv2.resize(rgb, new_size, interpolation=cv2.INTER_AREA),
            cv2.resize(alpha, new_size, interpolation=cv2.INTER_AREA),
        )

    def _quantize_visible_pixels(
        self,
        rgb: np.ndarray,
        visible_mask: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray]:
        visible_pixels = rgb[visible_mask].reshape(-1, 3).astype(np.float32)
        unique_count = len(np.unique(visible_pixels.astype(np.uint8), axis=0))
        color_count = max(1, min(self.max_colors, unique_count, len(visible_pixels)))

        if color_count == 1:
            labels = np.full(visible_pixels.shape[0], 0, dtype=np.int32)
            centers = np.array([visible_pixels.mean(axis=0)], dtype=np.float32)
        else:
            sample = visible_pixels
            if len(visible_pixels) > 120_000:
                rng = np.random.default_rng(42)
                indices = rng.choice(len(visible_pixels), size=120_000, replace=False)
                sample = visible_pixels[indices]

            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 35, 1.0)
            cv2.setRNGSeed(42)
            _, _, centers = cv2.kmeans(
                sample,
                color_count,
                None,
                criteria,
                1,
                cv2.KMEANS_PP_CENTERS,
            )

            distances = np.sum(
                (visible_pixels[:, None, :] - centers[None, :, :]) ** 2, axis=2
            )
            labels = np.argmin(distances, axis=1).astype(np.int32)

        label_image = np.full(visible_mask.shape, -1, dtype=np.int16)
        label_image[visible_mask] = labels
        return label_image, centers

    def _build_svg_paths(
        self,
        labels: np.ndarray,
        centers: np.ndarray,
        visible_mask: np.ndarray,
    ) -> list[str]:
        paths: list[str] = []
        label_ids, counts = np.unique(labels[visible_mask], return_counts=True)
        ordered_label_ids = [
            int(label)
            for label, _count in sorted(
                zip(label_ids, counts), key=lambda item: -item[1]
            )
        ]

        kernel = np.ones((2, 2), np.uint8)
        for label_id in ordered_label_ids:
            mask = np.where(labels == label_id, 255, 0).astype(np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            contours, _hierarchy = cv2.findContours(
                mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS
            )

            path_data = []
            for contour in contours:
                area = abs(cv2.contourArea(contour))
                if area < self.min_area:
                    continue

                perimeter = cv2.arcLength(contour, True)
                epsilon = max(0.45, 0.0025 * perimeter)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                if len(approx) < 3:
                    continue

                path_data.append(self._contour_to_path(approx))

            if path_data:
                fill = self._rgb_to_hex(centers[label_id])
                paths.append(
                    f'  <path fill="{fill}" fill-rule="evenodd" d="{" ".join(path_data)}" />'
                )

        return paths

    def _fallback_mask_svg(
        self, visible_mask: np.ndarray, width: int, height: int
    ) -> str:
        mask = np.where(visible_mask, 255, 0).astype(np.uint8)
        contours, _hierarchy = cv2.findContours(
            mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS
        )
        path_data = [
            self._contour_to_path(contour) for contour in contours if len(contour) >= 3
        ]

        return "\n".join(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',
                f'  <path fill="#111111" fill-rule="evenodd" d="{" ".join(path_data)}" />',
                "</svg>",
                "",
            ]
        )

    def _blank_svg(self, width: int, height: int) -> str:
        return "\n".join(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" />',
                "",
            ]
        )

    def _contour_to_path(self, contour: np.ndarray) -> str:
        points = contour.reshape(-1, 2)
        commands = [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
        commands.extend(f"L {point[0]:.2f} {point[1]:.2f}" for point in points[1:])
        commands.append("Z")
        return " ".join(commands)

    def _rgb_to_hex(self, rgb: np.ndarray) -> str:
        r, g, b = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
        return f"#{r:02X}{g:02X}{b:02X}"
