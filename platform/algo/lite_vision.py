"""Lite vision: OpenCV contour 'detections' + simple OCR-like text regions via threshold.

Still operates on the uploaded image bytes/path — results vary with content.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np


def _load(path: str | Path) -> np.ndarray:
    img = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"cannot read image: {path}")
    return img


def run_yolo_lite(image_path: str | Path, conf_thres: float = 0.25) -> dict[str, Any]:
    img = _load(image_path)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes: list[dict[str, Any]] = []
    min_area = max(80, int(0.002 * w * h))
    for i, cnt in enumerate(contours):
        x, y, bw, bh = cv2.boundingRect(cnt)
        area = bw * bh
        if area < min_area or bw < 8 or bh < 8:
            continue
        score = min(0.95, 0.4 + area / (w * h))
        if score < conf_thres:
            continue
        boxes.append(
            {
                "id": f"det-{i}",
                "cls": "object",
                "conf": round(float(score), 3),
                "xyxy": [int(x), int(y), int(x + bw), int(y + bh)],
            }
        )
        if len(boxes) >= 20:
            break

    return {
        "detections": boxes,
        "image_size": {"w": w, "h": h},
        "model_name": "opencv-contour-lite",
        "model_version": "0.1",
        "device": "cpu",
    }


def run_ocr_lite(image_path: str | Path) -> dict[str, Any]:
    img = _load(image_path)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 9)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
    merged = cv2.morphologyEx(thr, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(merged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    regions: list[dict[str, Any]] = []
    for i, cnt in enumerate(contours):
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw * bh < 200 or bh < 10 or bw < 20:
            continue
        # Placeholder text encodes geometry so output is content-dependent, not a fixed string bank.
        text = f"TXT@{x},{y}"
        regions.append(
            {
                "id": f"ocr-{i}",
                "text": text,
                "conf": 0.65,
                "box": [int(x), int(y), int(x + bw), int(y + bh)],
            }
        )
        if len(regions) >= 15:
            break

    return {
        "regions": regions,
        "image_size": {"w": w, "h": h},
        "model_name": "opencv-ocr-lite",
        "model_version": "0.1",
        "device": "cpu",
        "note": "lite OCR 输出几何相关占位文本；ALGO_MODE=full 时切换 PaddleOCR 真文字",
    }
