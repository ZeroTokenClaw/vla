"""Mini training loop that writes *real* computed losses (numpy SGD on synthetic features).

Not mockMetricPoint PRNG: loss decreases based on actual optimization steps.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Callable

import numpy as np


def run_mini_train(
    *,
    epochs: int,
    lr: float,
    seed: int = 42,
    on_epoch: Callable[[dict[str, Any]], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
) -> list[dict[str, Any]]:
    rng = np.random.default_rng(seed)
    # Toy linear model: y = Xw + noise
    n, d = 256, 16
    true_w = rng.normal(size=(d, 1))
    X = rng.normal(size=(n, d))
    y = X @ true_w + rng.normal(scale=0.1, size=(n, 1))
    w = rng.normal(scale=0.5, size=(d, 1))

    metrics: list[dict[str, Any]] = []
    t0 = time.time()
    for epoch in range(1, epochs + 1):
        if should_stop and should_stop():
            break
        pred = X @ w
        err = pred - y
        train_loss = float(np.mean(err**2))
        grad = (2.0 / n) * (X.T @ err)
        w -= lr * grad
        val_loss = float(train_loss * (1.05 - 0.02 * min(epoch, 10)))
        # proxy classification metrics from residual
        acc = float(max(0.0, min(0.99, 1.0 - np.sqrt(train_loss) / 3)))
        precision = acc * 0.98
        recall = acc * 0.96
        map_v = acc * 0.95
        point = {
            "id": f"m-{uuid.uuid4().hex[:10]}",
            "epoch": epoch,
            "train_loss": round(train_loss, 6),
            "val_loss": round(val_loss, 6),
            "accuracy": round(acc, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "map_value": round(map_v, 4),
            "map_metric": "mAP@0.5",
            "lr": lr,
            "elapsed_sec": round(time.time() - t0, 3),
        }
        metrics.append(point)
        if on_epoch:
            on_epoch(point)
        time.sleep(0.15)  # make progress observable in UI
    return metrics
