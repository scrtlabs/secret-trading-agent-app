import { OfflineAminoSigner, ChainInfo } from "@keplr-wallet/types";
import { EncryptionUtils } from "secretjs";

export interface BalanceResponse {
  balance: {
    amount: string;
  };
}
export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  thinking?: string;
}

export interface Balance {
  sSCRT: string;
  sUSDC: string;
}

export interface WalletState {
  isConnected: boolean;
  secretAddress?: string;
  secretSigner?: OfflineAminoSigner;
  secretChain?: ChainInfo;
  enigmaUtils?: EncryptionUtils;
}

export interface TradeState {
  isConvinced: boolean;
  isTrading: boolean;
  lastTradeResult?: string;
}

export type ViewingKeys = Keys | null;

export interface Keys {
  sSCRT: string;
  sUSDC: string;
}

export interface AppState {
  user: User | null;
  token: string | null;
  agentAddress: string | null;
  wallet: WalletState;
  balances: Balance;
  viewingKeys: ViewingKeys;
  messages: ChatMessage[];
  trade: TradeState;
  isLoading: boolean;
}
