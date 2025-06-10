import json

# Read the JSON file
with open('articles.json', 'r') as f:
    articles = json.load(f)

# Extract x and y coordinates
x_coords = [article['x'] for article in articles]
y_coords = [article['y'] for article in articles]

# Calculate extrema
x_min, x_max = min(x_coords), max(x_coords)
y_min, y_max = min(y_coords), max(y_coords)

# Print results
print(f"X-direction extrema: ({x_min:.3f}, {x_max:.3f})")
print(f"Y-direction extrema: ({y_min:.3f}, {y_max:.3f})")
print(f"Number of points: {len(articles)}")
# Scale coordinates by 57x
for article in articles:
    article['x'] = article['x'] * 57
    article['y'] = article['y'] * 57

# Write scaled articles to new JSON file
with open('articles_clustered_normalized.json', 'w') as f:
    json.dump(articles, f, indent=2)

print("Scaled coordinates written to articles_clustered_normalized.json")
