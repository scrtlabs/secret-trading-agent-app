"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, RefreshCw } from "lucide-react"
import { useAppStore } from "@/lib/store"

export function BalancesPanel() {
  const { wallet, balances, isLoading, fetchBalances } = useAppStore()

  useEffect(() => {
    if (wallet.isConnected) {
      fetchBalances()
    }
  }, [wallet.isConnected, fetchBalances])

  const handleRefresh = () => {
    fetchBalances()
  }

  if (!wallet.isConnected) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Balances
          </CardTitle>
          <CardDescription>Connect your wallet to view balances</CardDescription>
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
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Balances
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Your Secret Network token balances</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
