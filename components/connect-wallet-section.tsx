// components/ConnectWalletSection.tsx (Final, Cleaned Version)

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, WalletIcon as WalletX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { truncateAddress } from "@/lib/utils";

export function ConnectWalletSection() {
  const {
    wallet,
    isLoading,
    connectWallet,
    disconnectWallet,
    getAutoConnect,
    user, // We still need `user` to know when the connection is fully complete
  } = useAppStore();

  useEffect(() => {
    if (getAutoConnect()) {
      // connectWallet(); // Keep commented for manual testing, or re-enable
    }
  }, []);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  // --- The UI is now much simpler ---
  if (wallet.isConnected && wallet.secretAddress && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Wallet Connected
          </CardTitle>
          <CardDescription>
            Secret Address: {truncateAddress(wallet.secretAddress)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The "Authorize Spending" button and its logic are now gone. */}
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
          >
            <WalletX className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  // This part for the disconnected state is correct and remains the same.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Use Keplr Browser Extension to connect to Secret Network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleConnect} disabled={isLoading} className="w-full">
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}