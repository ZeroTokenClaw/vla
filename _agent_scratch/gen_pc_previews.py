from pathlib import Path
import random


def make_pc(path, title, bg, clusters, accent):
    rng = random.Random(hash(title) & 0xFFFFFFFF)
    circles = []
    for cx, cy, rx, ry, color, n, _label in clusters:
        for _ in range(n):
            x = cx + (rng.random() * 2 - 1) * rx
            y = cy + (rng.random() * 2 - 1) * ry
            r = 0.8 + rng.random() * 1.4
            op = 0.55 + rng.random() * 0.4
            circles.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{color}" opacity="{op:.2f}"/>'
            )
    legend_parts = []
    for i, (*_, c, __, lab) in enumerate(clusters):
        legend_parts.append(
            f'<rect x="16" y="{20 + i * 18}" width="10" height="10" fill="{c}"/>'
            f'<text x="32" y="{28 + i * 18}" fill="#cbd5e1" font-size="11" '
            f'font-family="Segoe UI,Arial">{lab}</text>'
        )
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg[0]}"/>
      <stop offset="100%" stop-color="{bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="720" height="420" fill="url(#g)"/>
  <text x="20" y="28" fill="{accent}" font-size="14" font-weight="700" font-family="Segoe UI,Arial">{title}</text>
  {"".join(circles)}
  <g>{"".join(legend_parts)}</g>
</svg>
'''
    Path(path).write_text(svg, encoding="utf-8")
    print("wrote", path)


make_pc(
    r"e:/omp/vla/vla-demo-element/public/samples/pointcloud/warehouse_lidar.svg",
    "DataLink · Warehouse LiDAR B3",
    ("#0b1a2a", "#12263a"),
    [
        (360, 300, 260, 40, "#38bdf8", 180, "pallet_plane"),
        (220, 210, 50, 35, "#fbbf24", 70, "carton_A"),
        (480, 200, 55, 40, "#34d399", 80, "carton_B"),
        (560, 140, 70, 55, "#fb7185", 90, "forklift"),
        (120, 120, 40, 40, "#94a3b8", 35, "noise"),
    ],
    "#7dd3fc",
)

make_pc(
    r"e:/omp/vla/vla-demo-antd/public/samples/pointcloud/assembly_cell.svg",
    "Orion · Assembly Cell #SG-07",
    ("#111827", "#1f2937"),
    [
        (360, 320, 280, 35, "#22d3ee", 160, "jig_plane"),
        (300, 200, 35, 55, "#818cf8", 75, "workpiece"),
        (430, 160, 90, 70, "#fb923c", 110, "end_effector"),
        (180, 150, 45, 45, "#a3e635", 55, "fixture"),
        (600, 80, 50, 50, "#64748b", 40, "noise"),
    ],
    "#a5b4fc",
)

make_pc(
    r"e:/omp/vla/vla-demo-naive/public/samples/pointcloud/kitchen_scan.svg",
    "Lingmou EIDE · Kitchen Island Scan",
    ("#0c1220", "#163528"),
    [
        (360, 310, 270, 45, "#34d399", 170, "countertop"),
        (250, 220, 28, 35, "#60a5fa", 60, "mug"),
        (420, 230, 45, 25, "#f472b6", 70, "tray"),
        (520, 150, 80, 70, "#fbbf24", 100, "robot_arm"),
        (100, 100, 35, 35, "#6b7280", 30, "noise"),
    ],
    "#63e2b7",
)

make_pc(
    r"e:/omp/vla/vla-demo-arco/public/samples/pointcloud/curb_lidar.svg",
    "StarCompute · Curb LiDAR Sweep",
    ("#0f172a", "#1e1b4b"),
    [
        (360, 340, 300, 25, "#67e8f9", 150, "road_plane"),
        (200, 250, 90, 35, "#c084fc", 90, "curb"),
        (500, 210, 70, 45, "#f87171", 85, "vehicle"),
        (140, 160, 25, 50, "#4ade80", 55, "pedestrian"),
        (620, 100, 40, 40, "#94a3b8", 35, "noise"),
    ],
    "#c4b5fd",
)
