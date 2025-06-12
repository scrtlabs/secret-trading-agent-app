"use client";

import { ConnectWalletSection } from "@/components/connect-wallet-section";
import { BalancesPanel } from "@/components/balances-panel";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { TradeStatus } from "@/components/trade-status";
import { StartTradingButton } from "@/components/start-trading-button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wallet & Balances */}
          <div className="space-y-6">
            <ConnectWalletSection />
            <BalancesPanel />
            <TradeStatus />
          </div>

          {/* Middle Column - Chat */}
          <div className="lg:col-span-2 space-y-4">
            <ChatInterface />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>🤫 🌏</p>
        </div>
      </div>
    </div>
  );
}
