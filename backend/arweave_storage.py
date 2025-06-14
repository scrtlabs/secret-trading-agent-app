# /app/backend/arweave_storage.py (Rewritten without SDK)

import os
import json
import time
import asyncio
import base64
from typing import List, Dict

import aiohttp

class ArweaveStorageClient:
    """
    A client to interact with Apillon storage API for persistent AI memory using direct HTTP requests.
    """
    def __init__(self):
        # 1. Load credentials from environment variables
        api_key = os.getenv("APILLON_API_KEY")
        api_secret = os.getenv("APILLON_API_SECRET")
        self.bucket_uuid = os.getenv("APILLON_BUCKET_UUID")

        if not all([api_key, api_secret, self.bucket_uuid]):
            raise ValueError("APILLON_API_KEY, APILLON_API_SECRET, and APILLON_BUCKET_UUID must be set.")

        # 2. Prepare for direct API calls
        self.base_url = f"https://api.apillon.io/storage/buckets/{self.bucket_uuid}"
        
        # Create the Basic Auth header from API key and secret
        auth_string = f"{api_key}:{api_secret}"
        auth_bytes = base64.b64encode(auth_string.encode('utf-8'))
        self.headers = {
            "Authorization": f"Basic {auth_bytes.decode('utf-8')}",
            "Content-Type": "application/json"
        }
        print("ArweaveStorageClient (HTTP Direct) configured successfully.")

    async def store_memory(self, user_id: str, message: str, response: str) -> None:
        """
        Stores a single trade record as a JSON file in the bucket.
        Follows the three-step upload process: start, upload, end.
        """
        print(f"ARWEAVE: Storing trade history for user {user_id}...")
        payload = {
            "user_id": user_id,
            "timestamp": int(time.time()),
            "message": message, # This will be "TRADE_EXECUTION"
            "response": response
        }
        file_content = json.dumps(payload).encode('utf-8')
        file_name = f"trade-{user_id}-{int(time.time())}.json"
        
        async with aiohttp.ClientSession() as session:
            try:
                # --- Step 1: Start the upload session ---
                upload_start_data = {"files": [{"fileName": file_name, "contentType": "application/json"}]}
                async with session.post(f"{self.base_url}/upload", headers=self.headers, json=upload_start_data) as resp:
                    resp.raise_for_status()
                    upload_details = await resp.json()
                
                session_uuid = upload_details['data']['sessionUuid']
                file_to_upload = next((f for f in upload_details['data']['files'] if f['fileName'] == file_name), None)

                if not file_to_upload:
                    raise Exception("Failed to get upload URL for the file.")
                
                upload_url = file_to_upload['url']

                # --- Step 2: Upload the actual file content ---
                async with session.put(upload_url, data=file_content) as upload_resp:
                    upload_resp.raise_for_status()

                # --- Step 3: End the upload session ---
                async with session.post(f"{self.base_url}/upload/{session_uuid}/end", headers=self.headers) as end_resp:
                    end_resp.raise_for_status()
                
                print(f"ARWEAVE: Successfully stored trade history: {file_name}")

            except aiohttp.ClientError as e:
                print(f"ARWEAVE ERROR: Failed to store memory via API. Error: {e}")
                raise

    async def _download_and_parse_json(self, session, url: str) -> Dict:
        """Helper to asynchronously download a file from a URL and parse it as JSON."""
        try:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            print(f"ARWEAVE ERROR: Failed to download or parse file from {url}: {e}")
            return None

    async def get_memory(self, user_id: str) -> List[Dict]:
        """
        Retrieves and parses all completed trade history files for a user from the bucket.
        """
        print(f"ARWEAVE: Retrieving trade history for user {user_id}...")
        async with aiohttp.ClientSession() as session:
            try:
                # --- Step 1: List all content in the bucket ---
                async with session.get(f"{self.base_url}/content", headers=self.headers) as resp:
                    if not resp.ok:
                        print(f"APPILLON API ERROR: Status {resp.status}, Body: {await resp.text()}")
                        return []
                    bucket_content = await resp.json()
                
                items_from_api = bucket_content.get('data', {}).get('items', [])
                if not items_from_api:
                    print("ARWEAVE: No items found in the bucket.")
                    return []
                
                print(f"ARWEAVE: Found {len(items_from_api)} total items in the bucket. Now filtering...")

                # --- Step 2: Filter for the user's files that are CONFIRMED UPLOADED ---
                #
                # THIS IS THE FIX: We add two conditions:
                # 1. `item.get('fileStatus') == 4` ensures the file is fully uploaded.
                # 2. `'link' in item` is a safeguard to ensure the download link exists.
                # This prevents the KeyError when a file is still pending (fileStatus: 2).
                #
                user_files = [
                    item for item in items_from_api
                    if (item.get('name', '').startswith(f"trade-{user_id}-") and
                        item.get('type') == 2 and
                        item.get('fileStatus') == 4 and # Check for "Uploaded" status
                        'link' in item)                 # Ensure the link key exists
                ]
                
                if not user_files:
                    print(f"ARWEAVE: No completed trade history files found for user {user_id}.")
                    return []

                # --- Step 3: Concurrently download and parse all relevant files ---
                tasks = [self._download_and_parse_json(session, f['link']) for f in user_files]
                memory_items = [item for item in await asyncio.gather(*tasks) if item]

                # --- Step 4: Sort memory by timestamp to maintain chronological order ---
                memory_items.sort(key=lambda x: x.get('timestamp', 0))

                print(f"ARWEAVE: Found and loaded {len(memory_items)} trade history entries.")
                return memory_items
            
            except aiohttp.ClientError as e:
                print(f"ARWEAVE ERROR: Failed to retrieve history via API. Error: {e}")
                return []
            except Exception as e:
                # Catching the KeyError here for better logging, though the fix should prevent it.
                print(f"ARWEAVE ERROR: An unexpected error occurred: {e}")
                import traceback
                traceback.print_exc()
                return []

# Create a single, shared instance that can be imported and used throughout the application
storage_client = ArweaveStorageClient()