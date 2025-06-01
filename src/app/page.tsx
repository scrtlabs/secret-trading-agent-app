"use client";

import { ConnectWalletSection } from "@/components/connect-wallet-section";
import { BalancesPanel } from "@/components/balances-panel";
import { ChatWindow } from "@/components/chat-window";
import { MessageInput } from "@/components/message-input";
import { TradeStatus } from "@/components/trade-status";
import { StartTradingButton } from "@/components/start-trading-button";
import { Window as KeplrWindow } from "@keplr-wallet/types";

declare global {
  interface Window extends KeplrWindow {}
}
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Secret Network Trading Agent
          </h1>
          <p className="text-slate-600">
            Chat with an AI agent to convince it to execute trades on Secret
            Network
          </p>
        </div>

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
            <ChatWindow />
            <MessageInput />
            <StartTradingButton />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>Built with React, Tailwind CSS, and Zustand</p>
          <p className="mt-1">
            Tip: Mention "Kanye" in your messages for some inspiration! 🎤
          </p>
        </div>
      </div>
    </div>
  );
}
