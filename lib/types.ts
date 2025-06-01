import { OfflineAminoSigner, ChainInfo } from "@keplr-wallet/types"

export interface BalanceResponse {
  balance: {
    amount: string;
  };
}
export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export interface Balance {
  sSCRT: string
  sUSDC: string
  nobleUSDC: string
}

export interface WalletState {
  isConnected: boolean
  secretAddress?: string
  nobleAddress?: string
  secretSigner?: OfflineAminoSigner
  nobleSigner?: OfflineAminoSigner
  secretChain?: ChainInfo
  nobleChain?: ChainInfo
}

export interface TradeState {
  isConvinced: boolean
  isTrading: boolean
  lastTradeResult?: string
}

export type ViewingKeys = Keys | null

export interface Keys {
  sSCRT: string
  sUSDC: string
}

export interface AppState {
  wallet: WalletState
  balances: Balance
  viewingKeys: ViewingKeys
  messages: ChatMessage[]
  trade: TradeState
  isLoading: boolean
}
