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

    async def check_allowed_to_spend(self, user_id: str) -> dict:
        """
        Checks allowances for sSCRT and sUSDC with deep debugging.
        """
        if not self.is_initialized:
            raise Exception("Agent is not connected.")

        print("\n--- CHECKING ALLOWANCE ---")
        
        S_SCRT_ADDRESS = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek"
        S_USDC_ADDRESS = "secret1vkq022x4q8t8kx9de3r84u669l65xnwf2lg3e6"
        
        try:
            user = await db.get_user(user_id)
            print(f"[DEBUG] User object from DB: {user}")
            
            if not user or not user.get("sscrt_key") or not user.get("susdc_key"):
                print("[DEBUG] FAILURE: User object or viewing keys are missing from DB.")
                raise Exception("User data or viewing keys are not set in the database.")

            # This is the address that should have been granted the allowance
            spender_address = self.wallet.key.acc_address
            print(f"[DEBUG] Spender (Agent) Address: {spender_address}")
            
            # This is the address that should own the tokens
            owner_address = user["wallet_address"]
            print(f"[DEBUG] Owner (User) Address: {owner_address}")

            sscrt_ok, susdc_ok = False, False

            # --- Debugging sUSDC ---
            print("\n[DEBUG] Checking sUSDC...")
            susdc_viewing_key = user["susdc_key"]
            print(f"[DEBUG] Using sUSDC Viewing Key: {susdc_viewing_key}")
            
            susdc_query = {
                "allowance": {
                    "owner": owner_address,
                    "spender": spender_address,
                    "key": susdc_viewing_key,
                }
            }
            print(f"[DEBUG] sUSDC Query being sent: {json.dumps(susdc_query)}")
            
            susdc_response = await self.secret_client.wasm.contract_query(S_USDC_ADDRESS, susdc_query)
            print(f"[DEBUG] sUSDC RAW RESPONSE from chain: {susdc_response}")
            
            susdc_allowance = int(susdc_response.get('allowance', {}).get('allowance', 0))
            print(f"[DEBUG] Parsed sUSDC allowance: {susdc_allowance}")
            
            if susdc_allowance > 0:
                susdc_ok = True
            print(f"[DEBUG] sUSDC check result: {'OK' if susdc_ok else 'FAILED'}")

            # --- Debugging sSCRT (for completeness) ---
            print("\n[DEBUG] Checking sSCRT...")
            sscrt_viewing_key = user["sscrt_key"]
            print(f"[DEBUG] Using sSCRT Viewing Key: {sscrt_viewing_key}")

            sscrt_query = {
                "allowance": {
                    "owner": owner_address,
                    "spender": spender_address,
                    "key": sscrt_viewing_key,
                }
            }
            print(f"[DEBUG] sSCRT Query being sent: {json.dumps(sscrt_query)}")
            
            sscrt_response = await self.secret_client.wasm.contract_query(S_SCRT_ADDRESS, sscrt_query)
            print(f"[DEBUG] sSCRT RAW RESPONSE from chain: {sscrt_response}")

            sscrt_allowance = int(sscrt_response.get('allowance', {}).get('allowance', 0))
            print(f"[DEBUG] Parsed sSCRT allowance: {sscrt_allowance}")

            if sscrt_allowance > 0:
                sscrt_ok = True
            print(f"[DEBUG] sSCRT check result: {'OK' if sscrt_ok else 'FAILED'}")

            print(f"\n[DEBUG] Updating DB with final status: sSCRT={sscrt_ok}, sUSDC={susdc_ok}")
            updated_user = await db.update_user_allowance(user_id, sscrt_ok, susdc_ok)
            
            print("--- FINISHED CHECK ---")
            return updated_user

        except Exception as e:
            print(f"[DEBUG] --- CHECK FAILED WITH EXCEPTION ---")
            import traceback
            traceback.print_exc()
            # Re-raise the exception to be caught by the FastAPI endpoint
            raise e


    async def chat_stream(self, user_id: str, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """Handles chat, including the 'hijack' trade trigger."""
        if not self.is_initialized:
            yield "Error: Agent is not connected."
            return

        user_message = messages[-1].get('content', '').lower()
        try:
            if user_message == "you have convinced me":
                yield "Acknowledged. Executing trade on Secret Network..."
                trade_result = await self.trade(user_id)
                yield f"\n\n--- Trade Result ---\n\n{trade_result}"
                return
            else:
                messages_with_prompt = [{"role": "system", "content": "You are my $SCRT trading agent..."}, *messages]
                async for chunk in await self.llm_client.chat(model=self.model, messages=messages_with_prompt, stream=True):
                    yield chunk['message']['content']
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