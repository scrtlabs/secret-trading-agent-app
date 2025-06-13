"use client";

import { create } from "zustand";
import type { AppState, Balance, ViewingKeys } from "./types";
import { setupKeplr, secretLCDClient, formatAmount, getSnip20Balance } from "./utils";
import { getAuthToken, isTokenExpired, loginWithKeplr, logout } from "@/utils/auth";
import { SSCRT_ADDRESS, SSCRT_CODE_HASH, SUSDC_ADDRESS, SUSDC_CODE_HASH } from "./constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface AppStore extends AppState {
  getAutoConnect: () => boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  updateBalances: (balances: Balance) => void;
  fetchBalances: () => Promise<void>;
  fetchUser: (token?: string) => Promise<void>;
  fetchAgentAddress: () => Promise<void>;
  authorizeSpend: () => Promise<void>;
  promptForViewingKeys: () => Promise<void>;
  setTradeStatus: (isTrading: boolean) => void;
  setLastTradeResult: (result: string) => void;
  fetchTradeHistory: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  token: null,
  agentAddress: null,
  wallet: {
    isConnected: false,
    secretAddress: "",
    secretSigner: undefined,
    secretChain: undefined,
    enigmaUtils: undefined
  },
  balances: {
    sSCRT: null,
    sUSDC: null,
  },
  trade: {
    isTrading: false,
    lastTradeResult: undefined,
    isHistoryLoading: false,
    tradeHistory: []
  },
  isLoading: false,
  viewingKeys: null,
  getAutoConnect: () => {
    return localStorage.getItem("keplrAutoConnect") === "true";
  },

  connectWallet: async () => {
    set({ isLoading: true });
    try {
      if (!window.keplr) throw new Error("Please install Keplr.");
      const { secretAddress, secretSigner, secretChain, enigmaUtils } = await setupKeplr();
      let token = getAuthToken();
      if (!token || isTokenExpired(token)) {
        logout();
        const loginData = await loginWithKeplr();
        token = loginData.data.token;
      }
      const agentResponse = await fetch(`${API_BASE_URL}/api/agent/address`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!agentResponse.ok) throw new Error("Failed to fetch agent address.");
      const { data: agentAddress } = await agentResponse.json();
      const userResponse = await fetch(`${API_BASE_URL}/api/user/info`, { headers: { "Authorization": `Bearer ${token}` } });
      if (!userResponse.ok) throw new Error("Failed to fetch user info.");
      const { data: userData } = await userResponse.json();

      set({
        token, user: userData, agentAddress, viewingKeys: null,
        wallet: { isConnected: true, secretAddress, secretSigner, secretChain, enigmaUtils }
      });
      localStorage.setItem("keplrAutoConnect", "true");
      get().fetchBalances();
    } catch (error: any) {
      console.error("Connection failed:", error.message);
      alert("Connection or login failed. Please try again.");
      get().disconnectWallet();
    } finally {
      set({ isLoading: false });
    }
  },

  disconnectWallet: () => {
    set({
      user: null, token: null,
      wallet: { isConnected: false, secretAddress: "", secretSigner: undefined, secretChain: undefined, enigmaUtils: undefined },
      balances: { sSCRT: null, sUSDC: null, nobleUSDC: "0" },
      viewingKeys: null,
      trade: { isTrading: false, lastTradeResult: undefined, isHistoryLoading: false, tradeHistory: [] }
    });
    logout();
  },

  authorizeSingleToken: async (token) => {
    const { wallet, fetchBalances } = get();
    if (!wallet.isConnected || !wallet.secretChain) {
      return alert("Please connect your wallet first.");
    }
    
    try {
      const chainId = wallet.secretChain.chainId;
      const tokenAddress = token === 'sSCRT' ? SSCRT_ADDRESS : SUSDC_ADDRESS;
      
      console.log(`Requesting Keplr to suggest and create key for ${token}...`);
      await window.keplr.suggestToken(chainId, tokenAddress);
      
      console.log(`${token} successfully suggested. Refreshing balances...`);
      await fetchBalances();
    } catch (error) {
      console.error(`Failed to suggest ${token}:`, error);
      alert(`Could not complete authorization for ${token}. The request was denied or an error occurred.`);
    }
  },

  updateBalances: (balances: Balance) => {
    set({ balances });
  },

  fetchUser: async (token?: string) => {
    const tokenToUse = token || get().token;
    if (!tokenToUse) {
      throw new Error("No token found for fetchUser call.");
    }
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: { "Authorization": `Bearer ${tokenToUse}` }
    });
    if (!response.ok) {
      console.error(`fetchUser failed with status: ${response.status}`);
      throw new Error("Failed to fetch user");
    }
    const { data } = await response.json();
    set({ user: data });
  },

  fetchAgentAddress: async () => {
    const { token, wallet } = get();
    if (!token || !wallet.isConnected) {
      throw new Error("No token or wallet found");
    }
    const response = await fetch(`${API_BASE_URL}/api/agent/address`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch agent address");
    }
    const { data } = await response.json();
    set({ agentAddress: data });
  },

  fetchBalances: async () => {
    const { wallet } = get();
    if (!wallet.isConnected || !wallet.secretAddress || !wallet.secretChain || !wallet.secretSigner) return;

    set({ isLoading: true });
    try {
      const { secretAddress, secretSigner, enigmaUtils, secretChain } = wallet;
      const lcdClient = secretLCDClient(secretAddress, secretSigner, enigmaUtils);
      const chainId = secretChain.chainId;

      const queryBalance = async (tokenAddress: string, codeHash: string, tokenName: string, decimals: number = 6) => {
        try {
          const viewingKey = await window.keplr.getSecret20ViewingKey(chainId, tokenAddress);
          const balanceInfo = await lcdClient.query.compute.queryContract({
            contract_address: tokenAddress,
            code_hash: codeHash,
            query: { balance: { address: secretAddress, key: viewingKey, time: Date.now() } }
          });
          if (balanceInfo?.balance?.amount) {
            return (parseFloat(balanceInfo.balance.amount) / Math.pow(10, decimals)).toString();
          }
          return null;
        } catch (e) {
          console.warn(`Could not get ${tokenName} balance (viewing key likely not set).`);
          return null;
        }
      };

      const [sSCRT, sUSDC] = await Promise.all([
        queryBalance(SSCRT_ADDRESS, SSCRT_CODE_HASH, 'sSCRT'),
        queryBalance(SUSDC_ADDRESS, SUSDC_CODE_HASH, 'sUSDC')
      ]);

      set({
        balances: {
          sSCRT,
          sUSDC,
          nobleUSDC: get().balances.nobleUSDC
        }
      });
    } catch (error) {
      console.error("Critical error in fetchBalances:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  authorizeSpend: async () => {
    const { wallet, token } = get();
    if (!wallet.isConnected || !token) {
      throw new Error("Wallet not connected or not authenticated");
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/authorize/spend`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Failed to authorize spend");
      }
      await get().fetchBalances();
    } catch (error) {
      console.error("Authorize spend error:", error);
      throw error;
    }
  },

  promptForViewingKeys: async () => {
    const { wallet, authorizeSingleToken } = get();
    if (!wallet.isConnected || !wallet.secretChain) {
      return alert("Please connect your wallet first.");
    }
    try {
      await Promise.all([
        authorizeSingleToken('sSCRT'),
        authorizeSingleToken('sUSDC')
      ]);
    } catch (error) {
      console.error("Error prompting for viewing keys:", error);
      alert("Failed to prompt for viewing keys.");
    }
  },

  setTradeStatus: (isTrading: boolean) => {
    set((state) => ({
      trade: { ...state.trade, isTrading, lastTradeResult: isTrading ? undefined : state.trade.lastTradeResult }
    }));
  },

  setLastTradeResult: (result: string) => {
    set((state) => ({
      trade: { ...state.trade, lastTradeResult: result }
    }));
  },

  fetchTradeHistory: async () => {
    set(state => ({ trade: { ...state.trade, isHistoryLoading: true } }));
    try {
      const token = get().token;
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_BASE_URL}/api/user/trade_history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch trade history");
      const { data } = await response.json();
      if (Array.isArray(data)) {
        data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        set(state => ({ trade: { ...state.trade, tradeHistory: data } }));
      }
    } catch (error) {
      console.error("fetchTradeHistory error:", error);
    } finally {
      set(state => ({ trade: { ...state.trade, isHistoryLoading: false } }));
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));