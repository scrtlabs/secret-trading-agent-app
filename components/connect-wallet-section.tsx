"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, WalletIcon as WalletX, Handshake } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { truncateAddress } from "@/lib/utils";

export function ConnectWalletSection() {
  const {
    wallet,
    isLoading,
    connectWallet,
    disconnectWallet,
    getAutoConnect,
    authorizeSpend,
    user,
  } = useAppStore();

  useEffect(() => {
    if (getAutoConnect()) {
      connectWallet();
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

  if (wallet.isConnected && wallet.secretAddress && user) {
    const isAllowedToSpend =
      user.allowed_to_spend_sscrt === "true" &&
      user.allowed_to_spend_susdc === "true";
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
        <CardContent className="space-y-4">
          {!isAllowedToSpend && (
            <Button
              onClick={authorizeSpend}
              variant="default"
              className="w-full"
            >
              <Handshake className="h-4 w-4 mr-2" />
              Authorize Spending
            </Button>
          )}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Use Keplr Browser Extension to connect to Secret Network and Noble
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleConnect} disabled={isLoading} className="w-full">
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}
