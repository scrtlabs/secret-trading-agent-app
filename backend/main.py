# /app/backend/main.py

import time
import re
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from agent import TradingAgent
import db
from auth import create_access_token, verify_token

app = FastAPI()
agent = TradingAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_scheme = HTTPBearer()

# --- CHANGE 2: Replace your get_current_user_id function with this one ---
async def get_current_user_id(request: Request, credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    # --- DEBUGGING PRINTS to see what the backend is receiving ---
    print("--- AUTHENTICATION CHECK ---")
    print("INCOMING REQUEST HEADERS:", request.headers)
    print("EXTRACTED CREDENTIALS FROM HEADER:", credentials)
    # --- END OF DEBUGGING PRINTS ---

    if not credentials:
        print("AUTH FAILED: No credentials were found in the header.")
        raise HTTPException(status_code=401, detail="No credentials provided")

    token = credentials.credentials
    user_id = verify_token(token)
    
    if user_id is None:
        print("AUTH FAILED: The token is invalid or expired.")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    print(f"AUTH SUCCESS: Token is valid for user_id: {user_id}")
    return user_id


@app.on_event("startup")
async def startup_event():
    await agent.connect()


class LoginRequest(BaseModel):
    walletAddress: str
    timestamp: int
    signature: str

@app.post("/api/login")
async def login(req: LoginRequest):
    # The logic here is now much cleaner and more robust.
    try:
        # 1. Directly use the timestamp from the request
        if abs(int(time.time() * 1000) - req.timestamp) > 300_000: # 5 minutes
            raise HTTPException(status_code=400, detail="Message timestamp is out of date.")
            
    except (ValueError, TypeError):
        # This will catch if the timestamp is not a valid number
        raise HTTPException(status_code=400, detail="Invalid timestamp format.")
    
    # 2. Reconstruct the message on the backend for signature verification.
    # This is a key security step. The backend must verify the signature against
    # the exact same message string the user saw in their wallet.
    message_to_verify = f"Login to Secret Trading App\nTimestamp: {req.timestamp}\nWallet: {req.walletAddress}"
    
    # In a production system, you would add full cryptographic verification here
    # using `message_to_verify`, `req.signature`, and `req.walletAddress`.
    # For now, we proceed as before.
    print(f"Server-side message to verify: '{message_to_verify}'")
        
    # 3. The rest of the function remains the same.
    user = await agent.create_user(req.walletAddress)
    token = create_access_token(data={"sub": req.walletAddress})
    return {"data": {"user": user, "token": token}}

@app.get("/api/agent/address")
async def get_agent_address(user_id: str = Depends(get_current_user_id)):
    return {"data": agent.get_agent_secret_address()}

class KeysRequest(BaseModel): sscrtKey: str; susdcKey: str
@app.post("/api/user/keys")
async def set_user_keys(req: KeysRequest, user_id: str = Depends(get_current_user_id)):
    return {"data": await agent.set_viewing_keys(user_id, req.sscrtKey, req.susdcKey)}

@app.get("/api/user/info")
async def get_user_info(user_id: str = Depends(get_current_user_id)):
    """
    Gets the user's current status from the database.
    If the user doesn't exist for a valid token, it creates them.
    """
    user = await agent.get_user(user_id)
    
    # --- THIS IS THE FIX ---
    # If the user is None, it means they have a valid token but no DB entry.
    # We create one for them, making the system self-healing.
    if not user:
        print(f"User for token not found in DB. Creating new entry for {user_id}...")
        user = await agent.create_user(user_id)

    if not user:
        # This should now be impossible, but it's good practice to have a final check.
        raise HTTPException(status_code=404, detail="User could not be found or created.")
        
    return {"data": user}

@app.get("/api/user/authorize_spend")
async def authorize_spend(user_id: str = Depends(get_current_user_id)):
    try:
        return {"data": await agent.check_allowed_to_spend(user_id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ChatMsg(BaseModel): role: str; content: str
class ChatReq(BaseModel): messages: List[ChatMsg]
@app.post("/api/chat")
async def chat_endpoint(req: ChatReq, user_id: str = Depends(get_current_user_id)):
    messages = [msg.model_dump() for msg in req.messages]
    user_message = messages[-1].get('content', '').lower()

    if user_message == "you have convinced me":
        try:
            # 1. Prepare the transaction details using the new agent method.
            trade_args = agent.prepare_trade_transaction(user_id)
            
            # 2. Return a structured JSON object with instructions for the frontend.
            return {
                "action": "execute_trade",
                "trade_args": trade_args,
                "message": "Excellent! Please approve the transaction in your wallet to execute the trade."
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Normal chat logic for all other messages.
        return StreamingResponse(agent.chat_stream(user_id, messages), media_type="text/plain")