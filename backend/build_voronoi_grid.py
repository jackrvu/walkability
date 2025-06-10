"""
Builds a rasterised Voronoi "biome" grid from article points.

• One point per article.
• Fortune / Delaunay (via SciPy) → Voronoi cells.
• Each 1×1 in-game tile gets a single byte (article-id).
• Writes binary grid to:  public/assets/biome_grid.bin
"""

import json, struct, zlib, pathlib, sys
from collections import defaultdict

import numpy as np
from scipy.spatial import Voronoi, KDTree

# ─── Tunables (keep in sync with the TS side) ────────────────────────────
SCALE   = 57         # metres per embedding unit  (chosen earlier)
RES     = 1          # metres per raster cell    ( = 1×1 tiles)
MIN_X, MAX_X = -8.730, 5.095
MIN_Y, MAX_Y = -6.258, 5.199
# ------------------------------------------------------------------------

DATA   = pathlib.Path("articles_clustered_normalized.json")
OUT    = pathlib.Path("frontend/public/assets/biome_grid.bin")
OUT.parent.mkdir(parents=True, exist_ok=True)

print("Loading points …")
pts = json.loads(DATA.read_text())

# 1 ─ Extract article points ----------------------------------------------
points = []
ids = []
for i, p in enumerate(pts):
    if "x" not in p or "y" not in p:  # Handle case where x/y fields don't exist
        continue
    points.append([p["x"], p["y"]])
    ids.append(i)

seeds = np.array(points)
ids = np.array(ids, dtype=np.uint16)  # Changed from uint8 to uint16 to handle larger values

print(f"  articles: {len(ids)}")

# 2 ─ Voronoi in embedding space ------------------------------------------
vor = Voronoi(seeds)

# 3 ─ KD-Tree of seed points (fast nearest-seed lookup) -------------------
kdt = KDTree(seeds)

# 4 ─ Raster grid bounds in embedding space -------------------------------
width_u  = (MAX_X - MIN_X)
height_u = (MAX_Y - MIN_Y)
width_m  = width_u  * SCALE
height_m = height_u * SCALE
W = int(np.ceil(width_m  / RES))
H = int(np.ceil(height_m / RES))

print(f"  grid: {W} × {H} tiles  (≈{W*H/1e6:.2f} M)")

grid = np.empty(W * H, dtype=np.uint16)  # Changed from uint8 to uint16 to match ids dtype

# 5 ─ Fill grid: nearest seed per tile (log N per query)
#     ≈ < 1 s for < 1 M tiles.
xs = (np.arange(W) * RES - width_m/2)  / SCALE + (MIN_X + MAX_X)/2
ys = (np.arange(H) * RES - height_m/2) / SCALE + (MIN_Y + MAX_Y)/2
for gy, y in enumerate(ys):
    _, idxs = kdt.query(np.column_stack([np.full(W, xs), np.full(W, y)]), k=1)
    grid[gy*W:(gy+1)*W] = ids[idxs]

# 6 ─ Compress + write -----------------------------------------------------
packed = zlib.compress(grid.tobytes(), level=9)
out_path = pathlib.Path("biome_grid.bin")
out_path.write_bytes(struct.pack("<II", W, H) + packed)
print(f"  wrote {out_path}  ({len(packed)//1024} kB gzip)\n✔ done.")
