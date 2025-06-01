"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, CheckCircle } from "lucide-react"
import { useAppStore } from "@/lib/store"

export function TradeStatus() {
  const { trade, wallet } = useAppStore()

  if (!wallet.isConnected) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trade Status
          </CardTitle>
          <CardDescription>Connect wallet to view trade status</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Disconnected</Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trade Status
        </CardTitle>
        <CardDescription>Current trading agent status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Agent Status:</span>
          <Badge variant={trade.isConvinced ? "default" : "secondary"}>
            {trade.isConvinced ? "Convinced" : "Not Convinced"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span>Trading:</span>
          <div className="flex items-center gap-2">
            {trade.isTrading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                <Badge variant="outline">In Progress</Badge>
              </>
            ) : trade.lastTradeResult ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default">Completed</Badge>
              </>
            ) : (
              <Badge variant="secondary">Idle</Badge>
            )}
          </div>
        </div>

        {trade.lastTradeResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{trade.lastTradeResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
