import boto3
import json
from boto3.dynamodb.types import TypeDeserializer
from dotenv import load_dotenv
import os
from tqdm import tqdm
from decimal import Decimal

# Load environment variables
success = load_dotenv("../.env")

# AWS DynamoDB client
dynamodb = boto3.client('dynamodb', region_name=os.getenv("AWS_REGION"))
deserializer = TypeDeserializer()

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

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

def main():
    print("Scanning two_dimensional_embeddings table...")
    articles = scan_full_table("two_dimensional_embeddings")
    
    # Convert DynamoDB items to regular Python dictionaries
    processed_articles = []
    for item in tqdm(articles, desc="Processing articles"):
        parsed = {k: deserializer.deserialize(v) for k, v in item.items()}
        processed_articles.append(parsed)
    
    # Write to JSON file
    print("Writing to articles.json...")
    with open('articles.json', 'w') as f:
        json.dump(processed_articles, f, indent=2, cls=DecimalEncoder)
    
    print(f"Successfully exported {len(processed_articles)} articles to articles.json")

if __name__ == "__main__":
    main() 