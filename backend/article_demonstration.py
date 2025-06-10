import json
import matplotlib.pyplot as plt
import numpy as np
from sklearn.cluster import KMeans

# Read the JSON file
with open('articles.json', 'r') as f:
    articles = json.load(f)

# Extract x and y coordinates
x_coords = [article['x'] for article in articles]
y_coords = [article['y'] for article in articles]

# Combine coordinates into a single array for clustering
X = np.array(list(zip(x_coords, y_coords)))

# Calculate number of clusters (total points / 100)
n_clusters = max(1, len(X) // 100)

# Perform k-means clustering
kmeans = KMeans(n_clusters=n_clusters, random_state=42)
clusters = kmeans.fit_predict(X)

# Create the scatter plot
plt.figure(figsize=(10, 8))
plt.scatter(x_coords, y_coords, c=clusters, cmap='tab20', alpha=0.6)
plt.title(f'Article Embeddings Visualization ({n_clusters} clusters)')
plt.xlabel('X Coordinate')
plt.ylabel('Y Coordinate')

# Add grid
plt.grid(True, linestyle='--', alpha=0.7)

# Add colorbar
plt.colorbar(label='Cluster')

# Save the plot
plt.savefig('article_embeddings_clustered.png', dpi=300, bbox_inches='tight')
plt.close()
