import boto3
import base64
import json
import numpy as np
from sklearn.decomposition import IncrementalPCA
from boto3.dynamodb.types import TypeDeserializer
from dotenv import load_dotenv
import os
from tqdm import tqdm

# Load environment variables
success = load_dotenv("../.env")

# AWS DynamoDB client
dynamodb = boto3.client('dynamodb', region_name=os.getenv("AWS_REGION"))
print(os.getenv("AWS_REGION"))
deserializer = TypeDeserializer()

def decode_embedding(embedding_str):
    # Assumes the string is base64-encoded float32 array
    decoded_bytes = base64.b64decode(embedding_str)
    return np.frombuffer(decoded_bytes, dtype=np.float32)

def scan_full_table(table_name):
    items = []
    response = dynamodb.scan(TableName=table_name)
    items.extend(response['Items'])
    while 'LastEvaluatedKey' in response:
        response = dynamodb.scan(
            TableName=table_name,
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response['Items'])
    return items

# Main transformation function
def main():
    print("Scanning articles table...")
    articles = scan_full_table("article")
    ipca = IncrementalPCA(n_components=2, batch_size=256)
    all_embeddings = []

    # First pass: collect embeddings
    print("Collecting embeddings...")
    for item in tqdm(articles, desc="Decoding embeddings"):
        parsed = {k: deserializer.deserialize(v) for k, v in item.items()}
        try:
            emb = decode_embedding(parsed['embedding'])
            all_embeddings.append(emb)
        except Exception as e:
            print(f"Error decoding embedding for {parsed.get('article_id')}: {e}")

    all_embeddings = np.stack(all_embeddings)
    print("Fitting PCA...")
    ipca.fit(all_embeddings)  # Fit PCA once

    # Second pass: transform and upload
    print("Transforming and uploading articles...")
    for item in tqdm(articles, desc="Processing articles"):
        parsed = {k: deserializer.deserialize(v) for k, v in item.items()}
        try:
            emb = decode_embedding(parsed['embedding'])
            x, y = ipca.transform([emb])[0]

            new_article = {
                "id": parsed['article_id'],
                "abstract": parsed['abstract'],
                "authors": parsed['authors'],
                "categories": parsed['categories'],
                "published_date": parsed['published_date'],
                "source": parsed['source'],
                "title": parsed['title'],
                "url": parsed['url'],
                "x": x,
                "y": y,
            }

            # Upload to target table
            dynamodb.put_item(
                TableName="two_dimensional_embeddings",
                Item={k: {'S': str(v)} if isinstance(v, str) else {'N': str(v)} for k, v in new_article.items()}
            )

        except Exception as e:
            print(f"Skipping article {parsed.get('article_id')}: {e}")

if __name__ == "__main__":
    main()
