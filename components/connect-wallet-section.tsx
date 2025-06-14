// components/ConnectWalletSection.tsx

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, WalletIcon as WalletX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { truncateAddress } from "@/lib/utils";

export function ConnectWalletSection() {
  const { wallet, isLoading, connectWallet, disconnectWallet, getAutoConnect, user } = useAppStore();

  useEffect(() => {
    if (getAutoConnect()) {
      // connectWallet();
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
  
  const cardClasses = "bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.1)]";

  if (wallet.isConnected && wallet.secretAddress && user) {
    return (
      <Card className={cardClasses}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Wallet className="h-5 w-5 text-green-500" />
            Wallet Connected
          </CardTitle>
          <CardDescription>
            Secret Address: {truncateAddress(wallet.secretAddress)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDisconnect} variant="outline" className="w-full">
            <WalletX className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Use Keplr Browser Extension to connect to Secret Network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleConnect} 
          disabled={isLoading} 
          className="w-full bg-[#4caf50] text-white hover:bg-[#45a049] disabled:bg-[#4caf50] disabled:opacity-70"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}