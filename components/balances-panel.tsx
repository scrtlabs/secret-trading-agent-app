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
import { Coins, Key, RefreshCw, Settings } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ViewingKeysModal } from "./ui/viewing-keys-modal";

export function BalancesPanel() {
  const { wallet, balances, isLoading, viewingKeys, fetchBalances } =
    useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (wallet.isConnected && viewingKeys) {
      fetchBalances();
    }
  }, [wallet.isConnected, viewingKeys, fetchBalances]);

  const handleRefresh = () => {
    fetchBalances();
  };

  const handleManageKeys = () => {
    setIsModalOpen(true);
  };

  if (!wallet.isConnected) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Balances
            </div>
            <div className="flex items-center gap-2">
              {viewingKeys && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleManageKeys}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Connect your wallet to view balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>sSCRT:</span>
              <span className="text-muted-foreground">--</span>
            </div>
            <div className="flex justify-between">
              <span>sUSDC:</span>
              <span className="text-muted-foreground">--</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Balances
            </div>
            <div className="flex items-center gap-2">
              {viewingKeys && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleManageKeys}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Your Secret Network token balances</CardDescription>
        </CardHeader>
        <CardContent>
          {viewingKeys ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">sSCRT</span>
                <span className="text-lg font-bold">{balances.sSCRT}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">sUSDC</span>
                <span className="text-lg font-bold">{balances.sUSDC}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>sSCRT:</span>
                <span className="text-muted-foreground">--</span>
              </div>
              <div className="flex justify-between">
                <span>sUSDC:</span>
                <span className="text-muted-foreground">--</span>
              </div>
            </div>
          )}
        </CardContent>
        {!viewingKeys && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="text-center p-6">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-4">
                Viewing keys are required.
              </p>
              <Button onClick={handleManageKeys}>Manage</Button>
            </div>
          </div>
        )}
      </Card>
      <ViewingKeysModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
