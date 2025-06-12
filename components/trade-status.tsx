// components/TradeStatus.tsx (Final, Cleaned Version)

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function TradeStatus() {
  // We no longer need the `isAllowedToSpend` check, so we can simplify the destructuring.
  const { trade, wallet, user } = useAppStore();

  if (!wallet.isConnected || !user) {
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
    );
  }

  // --- THIS IS THE FIX ---
  // The 'isAllowedToSpend' constant and the entire "Agent Status" div have been removed.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trade Status
        </CardTitle>
        <CardDescription>The status of your most recent trade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* The component now starts directly with the trading status */}
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

        {/* This logic for displaying the result remains perfect */}
        {trade.lastTradeResult && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{trade.lastTradeResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}