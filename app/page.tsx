// app/page.tsx

"use client";

import { ConnectWalletSection } from "@/components/connect-wallet-section";
import { BalancesPanel } from "@/components/balances-panel";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { TradeStatus } from "@/components/trade-status";

export default function HomePage() {
  return (
    // Updated background to a lighter gradient to match the theme
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-2rem)]">
        
        {/* This column contains the info panels and will scroll if content overflows */}
        <div className="space-y-6 overflow-y-auto pr-2">
          <ConnectWalletSection />
          <BalancesPanel />
          <TradeStatus />
        </div>

        {/* This column contains the non-scrolling chat interface */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <ChatInterface />
        </div>

      </div>
    </div>
  );
}