from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

from agent import TradingAgent

app = FastAPI()
agent = TradingAgent()

origins = [
   "http://localhost:3000"
      
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@app.post("/api/chat")
async def chat_endpoint(chat_request: ChatRequest):
    user_id = "user_from_jwt_placeholder" 
    messages = [msg.model_dump() for msg in chat_request.messages]
    return StreamingResponse(agent.chat_stream(user_id, messages), media_type="text/plain")