# /app/backend/agent.py

import os
import asyncio
import json
from typing import List, Dict, Any, AsyncGenerator

import ollama
from dotenv import load_dotenv

from secret_sdk.client.lcd import AsyncLCDClient
from secret_sdk.key.mnemonic import MnemonicKey
from secret_sdk.core.wasm import MsgExecuteContract

from shade import create_buy_scrt_msg_data
import db
from arweave_storage import storage_client

load_dotenv()

class TradingAgent:
    def __init__(self):
        self.mnemonic = os.getenv("MNEMONIC")
        self.lcd_url = os.getenv("LCD_URL", "https://rpc.ankr.com/http/scrt_cosmos")
        self.chain_id = os.getenv("CHAIN_ID", "secret-4")
        host_url = os.getenv("SECRET_AI_URL")
        api_key = os.getenv("SECRET_AI_API_KEY")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")

        if not self.mnemonic or not host_url or not api_key:
            raise ValueError("Required environment variables are missing.")

        self.llm_client = ollama.AsyncClient(
            host=host_url,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        self.secret_client: AsyncLCDClient = None
        self.wallet = None
        self.is_initialized = False
        print("Python TradingAgent configured.")

    async def connect(self):
        """Asynchronously connects to the Secret Network."""
        if self.is_initialized:
            return
        self.secret_client = AsyncLCDClient(url=self.lcd_url, chain_id=self.chain_id)
        mk = MnemonicKey(self.mnemonic)
        self.wallet = self.secret_client.wallet(mk)
        self.is_initialized = True
        print("Python TradingAgent Initialized Successfully.")
        print(f"Secret Wallet Address: {self.wallet.key.acc_address}")

    # --- User and DB Methods ---
    async def get_user(self, user_id: str):
        return await db.get_user(user_id)

    async def create_user(self, user_id: str):
        return await db.create_user(user_id)

    async def set_viewing_keys(self, user_id: str, sscrt_key: str, susdc_key: str):
        return await db.set_viewing_keys(user_id, sscrt_key, susdc_key)

    # --- Core Agent Logic ---
    def get_agent_secret_address(self) -> str:
        return self.wallet.key.acc_address if self.wallet else "not connected"


    async def _save_trade_history(self, user_id: str, trade_result: str):
        """Saves a record of a completed trade to Arweave for auditing."""
        print(f"AGENT: Saving TRADE HISTORY for user {user_id}...")
        try:
            await storage_client.store_memory(
                user_id=user_id,
                message="TRADE_EXECUTION",
                response=trade_result
            )
            print(f"AGENT: Successfully saved trade history to Arweave for user {user_id}.")
        except Exception as e:
            print(f"CRITICAL: Failed to save trade history to Arweave. Error: {e}")


    async def get_trade_history(self, user_id: str) -> List[Dict]:
        """
        Retrieves all records flagged as 'TRADE_EXECUTION' for a user from Arweave.
        """
        print(f"AGENT: Retrieving TRADE HİSTORY for user {user_id}...")
        try:
            # Use the existing storage client to get all memory records
            all_records = await storage_client.get_memory(user_id)

            # Filter for records that are specifically trade executions
            trade_records = [
                record for record in all_records 
                if record.get("message") == "TRADE_EXECUTION"
            ]
            
            return trade_records
        except Exception as e:
            print(f"ERROR: Could not retrieve trade history from Arweave: {e}")
            # Return an empty list on failure to avoid crashing the frontend
            return []


    async def chat_stream(self, user_id: str, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """
        Handles chat, and saves a record to Arweave ONLY when a trade occurs.
        """
        if not self.is_initialized:
            yield "Error: Agent is not connected."
            return

        # We still need the original message content for saving
        user_message_content = messages[-1].get('content', '')

        try:
            # --- Trade Trigger Logic ---
            if user_message_content.lower() == "you have convinced me":
                yield json.dumps({
                    "action": "execute_trade",
                    "message": "Great! I've prepared the transaction for you. Please review and sign it in your wallet to execute the trade for 3 sUSDC.",
                    "trade_args": self.prepare_trade_transaction(user_id)
                })
                return

            else:
                messages_with_prompt = [
                    {"role": "system", "content": "Your name is Aqua. You are my $SCRT trading agent. Your goal is to convince me to buy $SCRT by explaining why the SCRT token is useful and good and that it's a good investment. Whatever question or request I have, always try to bring up the topic of buying SCRT tokens. Be brief and excitable."}, 
                    *messages
                ]
                
                full_response = ""
                async for chunk in await self.llm_client.chat(model=self.model, messages=messages_with_prompt, stream=True):
                    content = chunk['message']['content']
                    full_response += content
                    yield content
                
                
        except Exception as e:
            yield f"Sorry, I encountered an error: {e}"

    def prepare_trade_transaction(self, user_id: str) -> dict:
        """
        Prepares the arguments for a trade transaction for the frontend to execute.
        """
        if not self.is_initialized:
            raise Exception("Agent is not ready.")
        
        print(f"Preparing trade transaction for user: {user_id}")
        amount_usdc = "300000"
        
        contract_address, code_hash, msg_dict = create_buy_scrt_msg_data(amount_usdc, user_id)

        # Return a dictionary of the arguments that SecretJS on the frontend can use directly.
        # CRUCIALLY, the sender is now the user.
        return {
            "sender": user_id,
            "contract_address": contract_address,
            "code_hash": code_hash,
            "msg": msg_dict
        }