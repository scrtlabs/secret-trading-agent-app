import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest } from "@/lib/auth";
import { agentInstance } from "@/utils/agentInstance";

interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  walletAddress: string;
}

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  response: string;
  timestamp: number;
}

// In-memory storage for demo purposes
// In production, use a proper database

const chatHistory = new Map<string, ChatMessage[]>();

export async function GET(request: NextRequest) {
  try {
    // Verify JWT and get wallet address
    const walletAddress = await getWalletFromRequest(request);
    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get chat history for this wallet
    const history = await agentInstance.getHistory(walletAddress)
    const messages: { role: "user" | "assistant", content: string }[] = []
    history.reverse().forEach((item) => {
      messages.push({
        role: "user",
        content: item.message,
      })
      messages.push({
        role: "assistant",
        content: item.response,
      })
    })
    return NextResponse.json({
      data: messages || []
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT and get wallet address
    const walletAddress = await getWalletFromRequest(request);

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChatRequest = await request.json();
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }
    if (!agentInstance.isInitialized) {
      await agentInstance.initialize()
    }

    // Simulate AI response (replace with actual AI integration)
    const aiResponse = await agentInstance.chat(walletAddress, message);

    return NextResponse.json({
      data: {
        message,
        response: aiResponse,
      }
    });
  } catch (error) {
    console.error("Chat POST error:", error);

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify JWT and get wallet address
    const walletAddress = await getWalletFromRequest(request);

    // Clear chat history for this wallet
    chatHistory.delete(walletAddress);

    return NextResponse.json({
      message: "Chat history cleared",
      walletAddress,
    });
  } catch (error) {
    console.error("Chat DELETE error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
