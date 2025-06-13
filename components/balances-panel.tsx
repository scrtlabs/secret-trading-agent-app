// components/BalancesPanel.tsx (Final, Correct Version)

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Key, RefreshCw, Loader2 } from "lucide-react"; // Added Loader2 for spinner
import { useAppStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

export function BalancesPanel() {
  const { wallet, balances, isLoading, fetchBalances, authorizeSingleToken } =
    useAppStore();
    
  // --- THIS IS THE FIX for the "disappearing balances" bug ---
  // Local state to track which specific token is being authorized.
  const [authorizingToken, setAuthorizingToken] = useState<'sSCRT' | 'sUSDC' | null>(null);

  // --- THIS IS THE FIX for the initial flash ---
  // This standard useEffect ensures balances are fetched once, after connecting.
  useEffect(() => {
    if (wallet.isConnected) {
      fetchBalances();
    }
  }, [wallet.isConnected, fetchBalances]);

  const handleRefresh = () => {
    fetchBalances();
  };

  const handleAuthorize = async (token: 'sSCRT' | 'sUSDC') => {
    setAuthorizingToken(token); // Start loading for this specific token
    await authorizeSingleToken(token);
    setAuthorizingToken(null); // Stop loading for this token
  };

  if (!wallet.isConnected) {
    // ... (Disconnected UI is unchanged and correct)
    return <Card className="opacity-50">...</Card>;
  }

  // --- Helper function to render each balance row ---
  const renderBalanceRow = (token: 'sSCRT' | 'sUSDC') => {
    const balance = balances[token];
    const isAuthorizingThisToken = authorizingToken === token;

    // Condition 1: Show skeleton on the very first, global load
    if (isLoading && balance === null) {
      return <Skeleton className="h-10 w-full" />;
    }

    // Condition 2: If we have a balance, display it
    if (balance !== null) {
      return (
        <div className="flex justify-between items-center">
          <span className="font-medium">{token}</span>
          <span className="text-lg font-bold">{balance}</span>
        </div>
      );
    }
    
    // Condition 3: If no balance, show the authorize button
    return (
      <div className="flex justify-between items-center">
        <span className="font-medium">{token}</span>
        <Button
          size="sm"
          variant="secondary"
          // Disable if *any* token is being authorized to prevent simultaneous popups
          disabled={authorizingToken !== null}
          onClick={() => handleAuthorize(token)}
        >
          {isAuthorizingThisToken ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Key className="mr-2 h-4 w-4" />
          )}
          Authorize
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" /> Balances
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading || authorizingToken !== null} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${isLoading || authorizingToken !== null ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Your Secret Network token balances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 bg-muted rounded-lg">{renderBalanceRow('sSCRT')}</div>
        <div className="p-3 bg-muted rounded-lg">{renderBalanceRow('sUSDC')}</div>
      </CardContent>
    </Card>
  );
}