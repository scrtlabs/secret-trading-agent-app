// components/TradeStatus.tsx (Final Version with Trade History)

"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Clock, CheckCircle, History, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/store";

// A small helper function to find the transaction hash in the result string
function getTxHash(result: string): string | null {
  // This regex looks for the word "Hash:" followed by a space, and captures the word characters (the hash) that follow.
  const match = result.match(/Hash: (\w+)/);
  return match ? match[1] : null;
}

export function TradeStatus() {
  // Get everything we need from the store. The actions are at the top level.
  const { wallet, user, trade, fetchTradeHistory } = useAppStore();

  // This effect runs once when the user connects, fetching their trade history.
  useEffect(() => {
    if (wallet.isConnected && user) {
      fetchTradeHistory();
    }
  }, [wallet.isConnected, user, fetchTradeHistory]); // Dependencies ensure this runs only when needed

  // Disconnected State
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

  // Connected State
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trade Status
        </CardTitle>
        <CardDescription>The status of your most recent trade and history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* === CURRENT TRADE STATUS SECTION (Unchanged) === */}
        <div className="flex items-center justify-between">
          <span>Current Trade:</span>
          <div className="flex items-center gap-2">
            {trade.isTrading ? (
              <><Clock className="h-4 w-4 animate-spin" /><Badge variant="outline">In Progress</Badge></>
            ) : trade.lastTradeResult ? (
              <><CheckCircle className="h-4 w-4 text-green-500" /><Badge variant="default">Completed</Badge></>
            ) : (
              <Badge variant="secondary">Idle</Badge>
            )}
          </div>
        </div>

        {trade.lastTradeResult && (
          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{trade.lastTradeResult}</p>
          </div>
        )}

        {/* === NEW: TRADE HISTORY SECTION === */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
            <History className="h-4 w-4" />
            Trade History
          </h4>
          <ScrollArea className="h-48 w-full pr-4">
            <div className="space-y-3">
              {trade.isHistoryLoading ? (
                // 1. Loading State
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : trade.tradeHistory.length === 0 ? (
                // 2. Empty State
                <p className="text-xs text-muted-foreground text-center py-4">No past trades found.</p>
              ) : (
                // 3. Populated State
                trade.tradeHistory.map((item, index) => {
                  const txHash = getTxHash(item.response);
                  const timestamp = item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : 'Just now';

                  return (
                    <div key={index} className="p-3 text-xs border rounded-lg bg-secondary/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-foreground">Trade Executed</span>
                        <span className="text-muted-foreground">{timestamp}</span>
                      </div>
                      {txHash ? (
                        <a 
                          href={`https://www.mintscan.io/secret/txs/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-blue-500 hover:underline"
                        >
                          View Transaction <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-muted-foreground truncate">{item.response}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}