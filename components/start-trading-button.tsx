"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store"

export function StartTradingButton() {
  const { wallet, trade, isLoading, startTrading } = useAppStore()

  const handleStartTrading = async () => {
    try {
      await startTrading()
    } catch (error) {
      console.error("Failed to start trading:", error)
    }
  }

  if (!wallet.isConnected || !trade.isConvinced || trade.isTrading) {
    return null
  }

  return (
    <Button
      onClick={handleStartTrading}
      disabled={isLoading}
      size="lg"
      className="w-full bg-green-600 hover:bg-green-700"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Executing Trade...
        </>
      ) : (
        <>
          <TrendingUp className="h-4 w-4 mr-2" />
          Start Trading
        </>
      )}
    </Button>
  )
}
