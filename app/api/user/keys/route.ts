import { NextRequest, NextResponse } from "next/server";
import { agentInstance } from "@/utils/agentInstance";
import { getWalletFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const { sscrtKey, susdcKey } = await request.json();
    const walletAddress = await getWalletFromRequest(request);

    if (!walletAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await agentInstance.setViewingKeys(walletAddress, sscrtKey, susdcKey);
        return NextResponse.json({ data: "Viewing keys set" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to set viewing keys" }, { status: 500 });
    }
}