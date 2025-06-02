import { NextRequest, NextResponse } from "next/server";
import { getWalletFromRequest } from "@/lib/auth";
import { agentInstance } from "@/utils/agentInstance";

export async function GET(request: NextRequest) {
    const wallet = await getWalletFromRequest(request);
    if (!wallet) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await agentInstance.checkAllowedToSpend(wallet);

        return NextResponse.json({ data: true }, { status: 200 });
    } catch (error) {
        // TODO: Handle error
        return NextResponse.json({ error: "Failed to authorize spend. Please approve the spending of both assets in the wallet." }, { status: 400 });
    }

}