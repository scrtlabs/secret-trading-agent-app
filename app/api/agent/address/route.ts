import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest } from "@/lib/auth";
import { agentInstance } from "@/utils/agentInstance";

export async function GET(request: NextRequest) {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const address = agentInstance.getAgentSecretAddress();
        return NextResponse.json({ data: address });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get agent address" }, { status: 500 });
    }
}