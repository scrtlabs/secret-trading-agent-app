// components/BalancesPanel.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Key, RefreshCw, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function BalancesPanel() {
  const { wallet, balances, isLoading, fetchBalances, authorizeSingleToken } = useAppStore();
  const [authorizingToken, setAuthorizingToken] = useState<'sSCRT' | 'sUSDC' | null>(null);

  useEffect(() => {
    if (wallet.isConnected) {
      fetchBalances();
    }
  }, [wallet.isConnected, fetchBalances]);

  const handleRefresh = () => {
    fetchBalances();
  };

  const handleAuthorize = async (token: 'sSCRT' | 'sUSDC') => {
    setAuthorizingToken(token);
    await authorizeSingleToken(token);
    setAuthorizingToken(null);
  };
  
  const cardClasses = "bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.1)]";

  if (!wallet.isConnected) {
    return (
      <Card className={`${cardClasses} opacity-50`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Coins className="h-5 w-5" /> Balances
          </CardTitle>
          <CardDescription>Connect wallet to view balances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 p-3 bg-gray-100 rounded-lg" />
          <div className="h-10 p-3 bg-gray-100 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const renderBalanceRow = (token: 'sSCRT' | 'sUSDC') => {
    const balance = balances[token];
    const isAuthorizingThisToken = authorizingToken === token;

    return (
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="font-medium text-gray-700">{token}</span>
        
        {/* --- THIS LOGIC FIXES THE UI FLASH --- */}
        {(isLoading && balance === null) ? (
          // 1. Initial loading state: Show a placeholder
          <span className="text-lg font-bold text-gray-400">--</span>
        ) : balance !== null ? (
          // 2. Balance is available: Show the balance
          <span className="text-lg font-bold text-gray-800">{balance}</span>
        ) : (
          // 3. Needs authorization: Show the button
          <Button
            size="sm"
            disabled={authorizingToken !== null}
            onClick={() => handleAuthorize(token)}
            className="bg-[#4caf50] text-white hover:bg-[#45a049] disabled:bg-[#4caf50] disabled:opacity-70"
          >
            {isAuthorizingThisToken ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Key className="mr-2 h-4 w-4" />
            )}
            Authorize
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-800">
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
        {renderBalanceRow('sSCRT')}
        {renderBalanceRow('sUSDC')}
      </CardContent>
    </Card>
  );
}