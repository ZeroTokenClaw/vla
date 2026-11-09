"""VLA quality detectors using OpenCV on real video/image paths."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np


def _read_frames(video_path: str | Path, max_frames: int = 60) -> list[np.ndarray]:
    cap = cv2.VideoCapture(str(video_path))
    frames: list[np.ndarray] = []
    if not cap.isOpened():
        return frames
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, total // max_frames) if total else 1
    idx = 0
    while len(frames) < max_frames:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            frames.append(frame)
        idx += 1
    cap.release()
    return frames


def detect_blur(frames: list[np.ndarray], threshold: float = 80.0) -> list[dict[str, Any]]:
    issues = []
    for i, f in enumerate(frames):
        gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if score < threshold:
            issues.append(
                {
                    "issue_type": "blur",
                    "severity": "high" if score < threshold / 2 else "medium",
                    "location": {"frame": i},
                    "message": f"Laplacian 清晰度 {score:.1f} < {threshold}",
                    "score": score,
                }
            )
    return issues[:5]


def detect_shake(frames: list[np.ndarray], threshold: float = 12.0) -> list[dict[str, Any]]:
    issues = []
    if len(frames) < 2:
        return issues
    prev = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
    motion = []
    for i in range(1, len(frames)):
        cur = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        flow = cv2.calcOpticalFlowFarneback(prev, cur, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
        motion.append(float(np.mean(mag)))
        prev = cur
    if motion:
        peak = max(motion)
        if peak > threshold:
            issues.append(
                {
                    "issue_type": "shake",
                    "severity": "medium",
                    "location": {"frame": int(np.argmax(motion)) + 1},
                    "message": f"光流平均幅度峰值 {peak:.2f} > {threshold}",
                    "score": peak,
                }
            )
    return issues


def detect_missing(meta: dict[str, Any]) -> list[dict[str, Any]]:
    issues = []
    required = ["instruction", "actions", "nodes", "video_url"]
    for key in required:
        val = meta.get(key)
        if val is None or val == "" or val == []:
            issues.append(
                {
                    "issue_type": "missing",
                    "severity": "high",
                    "location": {"field": key},
                    "message": f"缺失字段: {key}",
                }
            )
    return issues


def detect_mismatch(meta: dict[str, Any]) -> list[dict[str, Any]]:
    issues = []
    instruction = str(meta.get("instruction") or "")
    actions = meta.get("actions") or []
    if instruction and actions:
        # keyword overlap heuristic
        text = instruction + " " + " ".join(str(a.get("desc", "")) for a in actions)
        if "抓" in instruction and "抓" not in text.replace(instruction, ""):
            # weak signal only if no action desc mentions 抓
            descs = " ".join(str(a.get("desc", "") + a.get("type", "")) for a in actions)
            if "抓" not in descs and "pick" not in descs.lower():
                issues.append(
                    {
                        "issue_type": "mismatch",
                        "severity": "low",
                        "location": {},
                        "message": "任务指令含「抓」但动作描述未体现抓取语义",
                    }
                )
    return issues


def run_quality(video_path: str | None, meta: dict[str, Any]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    issues.extend(detect_missing(meta))
    issues.extend(detect_mismatch(meta))
    if video_path and Path(video_path).exists():
        frames = _read_frames(video_path)
        if frames:
            issues.extend(detect_blur(frames))
            issues.extend(detect_shake(frames))
            # occlusion proxy: dark region ratio
            dark_ratios = []
            for i, f in enumerate(frames[:: max(1, len(frames) // 10)]):
                gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
                ratio = float(np.mean(gray < 25))
                dark_ratios.append((i, ratio))
            for i, ratio in dark_ratios:
                if ratio > 0.35:
                    issues.append(
                        {
                            "issue_type": "occlusion",
                            "severity": "medium",
                            "location": {"frame": i},
                            "message": f"过暗区域占比 {ratio:.2f}，可能遮挡/欠曝",
                            "score": ratio,
                        }
                    )
                    break
    elif not video_path:
        issues.append(
            {
                "issue_type": "missing",
                "severity": "high",
                "location": {"field": "video"},
                "message": "视频文件缺失，无法做画面级检测",
            }
        )
    return issues
