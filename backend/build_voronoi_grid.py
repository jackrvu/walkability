"""
Builds a rasterised grid based on article clusters.

• Uses pre-existing cluster assignments from articles JSON
• Generates Voronoi boundaries between clusters
• Each 1×1 in-game tile gets a single byte (cluster-id)
• Writes binary grid to: biome_grid.bin
"""

import json, struct, zlib, pathlib, sys
from collections import defaultdict

import numpy as np
from scipy.spatial import Voronoi, KDTree

# ─── Tunables (keep in sync with the TS side) ────────────────────────────
RES     = 1          # metres per raster cell    ( = 1×1 tiles)
# ------------------------------------------------------------------------

DATA   = pathlib.Path("articles_clustered_normalized.json")
OUT    = pathlib.Path("biome_grid.bin")

print("Loading articles...")
articles = json.loads(DATA.read_text())

# 1 ─ Extract points and clusters --------------------------------------------
points = []
cluster_ids = []
for article in articles:
    # Skip if any required field is missing
    if not all(key in article for key in ["x", "y", "cluster"]):
        continue
    points.append([float(article["x"]), float(article["y"])])
    cluster_ids.append(article["cluster"])

# Convert to numpy arrays and check we have points
if not points:
    print("Error: No valid points found in input data")
    sys.exit(1)

points = np.array(points, dtype=np.float64)
cluster_ids = np.array(cluster_ids, dtype=np.uint16)

print(f"  points: {len(points)}")

# 2 ─ Generate Voronoi diagram from points ---------------------
vor = Voronoi(points)

# 3 ─ KD-Tree of points ---------------------------------------
kdt = KDTree(points)

# 4 ─ Raster grid bounds ----------------------------------------------
MIN_X, MAX_X = np.min(points[:,0]), np.max(points[:,0])
MIN_Y, MAX_Y = np.min(points[:,1]), np.max(points[:,1])
width_u  = (MAX_X - MIN_X)
height_u = (MAX_Y - MIN_Y)
W = int(np.ceil(width_u / RES))
H = int(np.ceil(height_u / RES))

print(f"  grid: {W} × {H} tiles  (≈{W*H/1e6:.2f} M)")

grid = np.empty(W * H, dtype=np.uint16)

# 5 ─ Fill grid: assign cluster IDs based on nearest point
xs = np.arange(W) * RES + MIN_X
ys = np.arange(H) * RES + MIN_Y
for gy, y in enumerate(ys):
    _, idxs = kdt.query(np.column_stack([xs, np.full(W, y)]), k=1)
    grid[gy*W:(gy+1)*W] = cluster_ids[idxs]

# 6 ─ Compress + write ------------------------------------------------
packed = zlib.compress(grid.tobytes(), level=9)
OUT.write_bytes(struct.pack("<II", W, H) + packed)
print(f"  wrote {OUT}  ({len(packed)//1024} kB gzip)\n✔ done.")
