import json
import os

# Read the articles.json file
articles_path = '/Users/jackvu/Desktop/latex projects/drift_ideating/walkability/backend/articles.json'

with open(articles_path, 'r') as f:
    articles = json.load(f)

# Find current min/max x and y values
x_values = [article['x'] for article in articles]
y_values = [article['y'] for article in articles]

x_min = min(x_values)
x_max = max(x_values)
y_min = min(y_values)
y_max = max(y_values)

# Min-max scale to [-5000, 5000] range
target_min = -5000
target_max = 5000
target_range = target_max - target_min

# Scale each article's coordinates
scaled_articles = []
for article in articles:
    scaled_article = article.copy()
    # Scale x coordinate
    scaled_article['x'] = target_min + ((article['x'] - x_min) / (x_max - x_min)) * target_range
    
    # Scale y coordinate 
    scaled_article['y'] = target_min + ((article['y'] - y_min) / (y_max - y_min)) * target_range
    
    scaled_articles.append(scaled_article)

# Write to new file
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, 'scaled_articles.json')
with open(output_path, 'w') as f:
    json.dump(scaled_articles, f, indent=2)

print(f"Scaled {len(scaled_articles)} articles to range [-5000, 5000] and saved to scaled_articles.json")
