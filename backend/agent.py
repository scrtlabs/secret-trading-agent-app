import os
import ollama
from dotenv import load_dotenv
import asyncio
from typing import AsyncGenerator, List, Dict

# Load environment variables from the root .env.local file
load_dotenv()

class TradingAgent:
    """
    The TradingAgent class, implemented in Python.
    Interacts with a protected Ollama-compatible endpoint.
    """
    def __init__(self):
        """Initializes the agent and the authenticated Ollama client."""
        
        # --- THIS IS THE UPDATED AUTHENTICATION LOGIC ---
        
        # 1. Get the host URL and API key from environment variables
        host_url = os.getenv("SECRET_AI_URL")
        api_key = os.getenv("SECRET_AI_API_KEY")

        if not host_url or not api_key:
            raise ValueError("SECRET_AI_URL and SECRET_AI_API_KEY must be set in your .env.local file.")

        # 2. Create the headers dictionary for authentication
        headers = {
            "Authorization": f"Bearer {api_key}"
        }

        # 3. Initialize the Ollama client with the host and headers
        self.client = ollama.AsyncClient(host=host_url, headers=headers)
        self.model = os.getenv("OLLAMA_MODEL", "llama3")
        
        print(f"Python TradingAgent initialized.")
        print(f"Ollama client configured for host: {host_url} with Authorization header.")


    async def _trade_placeholder(self, user_id: str) -> str:
        """A placeholder for your real trading logic."""
        print(f"Executing placeholder trade for user: {user_id}")
        await asyncio.sleep(1)
        return f"Trade executed successfully for user {user_id}. Hash: 0x123abc..."


    async def _load_persistent_memory_placeholder(self, user_id: str) -> List[Dict]:
        """A placeholder for loading history from your DB/Arweave."""
        return []


    async def chat_stream(self, user_id: str, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """
        Handles the chat logic and yields a stream of responses.
        """
        user_message = messages[-1].get('content', '').lower()


        system_prompt = {
            "role": "system",
            "content": "You are a $SCRT trading agent."
        }
        
        history = await self._load_persistent_memory_placeholder(user_id)
        messages_with_history = [system_prompt] + history + messages

        try:
            stream = await self.client.chat(
                model=self.model,
                messages=messages_with_history,
                stream=True
            )

            async for chunk in stream:
                content = chunk['message']['content']
                yield content
        except Exception as e:
            print(f"ERROR: Error streaming from Secret AI endpoint: {e}")
            yield f"Error: Could not stream from the Secret AI model. Please check your URL and API Key. Details: {e}"