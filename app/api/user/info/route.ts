import { NextRequest, NextResponse } from "next/server";
import { agentInstance } from "@/utils/agentInstance";
import { getWalletFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const walletAddress = await getWalletFromRequest(request);

  if (!walletAddress) {
    return NextResponse.json({ error: "Session is required" }, { status: 400 });
  }

  try {
    const user = await agentInstance.getUser(walletAddress);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: user,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
