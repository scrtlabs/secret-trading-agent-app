// components/TradeStatus.tsx

"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Clock, CheckCircle, History, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/store";

function getTxHash(result: string): string | null {
  const match = result.match(/Hash: (\w+)/);
  return match ? match[1] : null;
}

export function TradeStatus() {
  const { wallet, user, trade, fetchTradeHistory } = useAppStore();
  
  const cardClasses = "bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.1)]";

  useEffect(() => {
    if (wallet.isConnected && user) {
      fetchTradeHistory();
    }
  }, [wallet.isConnected, user, fetchTradeHistory]);

  if (!wallet.isConnected || !user) {
    return (
      <Card className={`${cardClasses} opacity-50`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
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

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <TrendingUp className="h-5 w-5" />
          Trade Status
        </CardTitle>
        <CardDescription>The status of your most recent trade and history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Current Trade:</span>
          <div className="flex items-center gap-2">
            {trade.isTrading ? (
              <><Clock className="h-4 w-4 animate-spin" /><Badge variant="outline">In Progress</Badge></>
            ) : trade.lastTradeResult ? (
              <><CheckCircle className="h-4 w-4 text-green-500" /><Badge className="bg-green-100 text-green-800">Completed</Badge></>
            ) : (
              <Badge variant="secondary">Idle</Badge>
            )}
          </div>
        </div>

        {trade.lastTradeResult && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 whitespace-pre-wrap">{trade.lastTradeResult}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-gray-800">
            <History className="h-4 w-4" />
            Trade History
          </h4>
          <ScrollArea className="h-48 w-full pr-4">
            <div className="space-y-3">
              {trade.isHistoryLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : trade.tradeHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No past trades found.</p>
              ) : (
                trade.tradeHistory.map((item, index) => {
                  const txHash = getTxHash(item.response);
                  const timestamp = item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : 'Just now';
                  return (
                    <div key={index} className="p-3 text-xs border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-800">Trade Executed</span>
                        <span className="text-gray-500">{timestamp}</span>
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
                        <p className="text-gray-500 truncate">{item.response}</p>
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