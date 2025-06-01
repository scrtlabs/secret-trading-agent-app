export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export interface Balance {
  sSCRT: string
  sUSDC: string
}

export interface WalletState {
  isConnected: boolean
  mnemonic: string
  address?: string
}

export interface TradeState {
  isConvinced: boolean
  isTrading: boolean
  lastTradeResult?: string
}

export interface AppState {
  wallet: WalletState
  balances: Balance
  messages: ChatMessage[]
  trade: TradeState
  isLoading: boolean
}
