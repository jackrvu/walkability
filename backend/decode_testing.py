import struct
import zlib
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

def decode_biome_grid(bin_path):
    # Read binary file
    data = Path(bin_path).read_bytes()
    
    # Parse header (W, H as uint32)
    W, H = struct.unpack("<II", data[:8])
    
    # Decompress grid data
    compressed = data[8:]
    grid_bytes = zlib.decompress(compressed)
    
    # Convert to uint16 array and reshape
    grid = np.frombuffer(grid_bytes, dtype=np.uint16).reshape(H, W)
    
    return grid, W, H

def plot_biome_grid(grid, W, H):
    # Create figure 
    plt.figure(figsize=(12, 12))
    
    # Plot grid using imshow with random colormap
    plt.imshow(grid, cmap='tab20', interpolation='nearest')
    
    # Add cluster ID labels
    unique_clusters = np.unique(grid)
    for cluster_id in unique_clusters:
        # Find center of each cluster region
        y_coords, x_coords = np.where(grid == cluster_id)
        if len(x_coords) > 0:  # Only add label if cluster exists
            center_x = np.mean(x_coords)
            center_y = np.mean(y_coords)
            plt.text(center_x, center_y, str(cluster_id), 
                    ha='center', va='center', color='black',
                    fontweight='bold', fontsize=8)
    
    # Add colorbar
    plt.colorbar(label='Cluster ID')
    
    plt.title(f'Voronoi Cluster Grid ({W}x{H})')
    plt.xlabel('X')
    plt.ylabel('Y') 
    
    plt.show()

if __name__ == "__main__":
    # Load and decode grid
    grid, W, H = decode_biome_grid("biome_grid.bin")
    print(f"Loaded grid: {W}x{H}")
    print(f"Number of unique clusters: {len(np.unique(grid))}")
    
    # Plot the grid
    plot_biome_grid(grid, W, H)
