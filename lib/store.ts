// lib/store.ts

"use client";

import { create } from "zustand";
import type { AppState, Balance, ViewingKeys } from "./types";
import { loadViewingKeys, saveViewingKeys } from "./localStorage";
import { setupKeplr, secretLCDClient, formatAmount, getSnip20Balance } from "./utils";
import { getAuthToken, isTokenExpired, loginWithKeplr, logout } from "@/utils/auth";
import { SSCRT_ADDRESS, SSCRT_CODE_HASH, SUSDC_ADDRESS, SUSDC_CODE_HASH } from "./constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface AppStore extends AppState {
  // Wallet actions
  getAutoConnect: () => boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // Balance actions
  updateBalances: (balances: Balance) => void;
  fetchBalances: () => Promise<void>;
  fetchUser: (token?: string) => Promise<void>;
  fetchAgentAddress: () => Promise<void>;
  authorizeSpend: () => Promise<void>;

  // Viewing key actions
  createViewingKey: (tokenAddress: string) => Promise<string | undefined>;
  setViewingKeys: (viewingKeys: ViewingKeys) => void;
  loadViewingKeysFromStorage: () => void;

  // Trade actions
  setConvinced: (convinced: boolean) => void;
  startTrading: () => Promise<void>;

  // UI actions
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
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
    sSCRT: "0",
    sUSDC: "0",
    nobleUSDC: "0",
  },
  viewingKeys: null,
  trade: {
    isConvinced: false,
    isTrading: false,
  },
  isLoading: false,

  getAutoConnect: () => {
    return localStorage.getItem("keplrAutoConnect") === "true";
  },

  // Wallet actions
  connectWallet: async () => {
    set({ isLoading: true });
    try {
        if (!window.keplr) throw new Error("Please install Keplr.");

        // Step 1: Connect wallet and get a valid token
        const { secretAddress, secretSigner, secretChain, enigmaUtils } = await setupKeplr();
        let token = getAuthToken();
        if (!token || isTokenExpired(token)) {
            logout();
            const loginData = await loginWithKeplr();
            token = loginData.data.token;
        }

        // Step 2: Fetch non-user data
        const agentResponse = await fetch(`${API_BASE_URL}/api/agent/address`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!agentResponse.ok) throw new Error("Failed to fetch agent address.");
        const { data: agentAddress } = await agentResponse.json();
        
        // Step 3: Get the most up-to-date user status by checking allowances
        let finalUserData = null;
        try {
            console.log("Attempting to verify on-chain allowances to get latest user status...");
            const verificationResponse = await fetch(`${API_BASE_URL}/api/user/authorize_spend`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (verificationResponse.ok) {
                const { data: verifiedUserData } = await verificationResponse.json();
                finalUserData = verifiedUserData;
                console.log("Allowance check successful. User status is up-to-date.");
            } else {
                 const err = await verificationResponse.json();
                 console.warn(`Initial allowance check failed (this is expected if viewing keys are not set): ${err.detail}`);
            }
        } catch (e) {
            console.warn("Could not perform initial allowance check.", e);
        }
        
        // If the allowance check failed (e.g., no viewing keys), fall back to basic info.
        if (!finalUserData) {
            console.log("Falling back to basic user info endpoint...");
            const userResponse = await fetch(`${API_BASE_URL}/api/user/info`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!userResponse.ok) throw new Error("Failed to fetch user info.");
            const { data: userData } = await userResponse.json();
            finalUserData = userData;
        }
        
        const viewingKeys = loadViewingKeys();

        // Step 4: Perform the single, atomic update with the best data we could get.
        set({
            token,
            user: finalUserData,
            agentAddress,
            viewingKeys: viewingKeys || null,
            wallet: {
                isConnected: true,
                secretAddress, secretSigner, secretChain, enigmaUtils
            },
            isLoading: false
        });
        localStorage.setItem("keplrAutoConnect", "true");

    } catch (error: any) {
        console.error("Connection failed:", error.message);
        alert("Connection or login failed. Please try again.");
        get().disconnectWallet();
        set({ isLoading: false });
    }
  },

  createViewingKey: async (tokenAddress: string) => {
    const { wallet } = get();
    if (!wallet.isConnected || !wallet.secretSigner || !wallet.secretAddress || !wallet.enigmaUtils) {
      console.error("Cannot create key: Wallet not ready.");
      return undefined;
    }

    const { secretSigner, secretAddress, enigmaUtils } = wallet;
    const lcdClient = secretLCDClient(secretAddress, secretSigner, enigmaUtils);
    const newKey = "vk_" + Math.random().toString(36).substring(2, 12);

    set({ isLoading: true }); // SETS THE GLOBAL LOADING STATE
    try {
      const tx = await lcdClient.tx.snip20.setViewingKey({
        sender: secretAddress,
        contract_address: tokenAddress,
        msg: { set_viewing_key: { key: newKey } },
      }, { gasLimit: 200_000 });

      if (tx.code !== 0) {
        throw new Error(`Transaction failed: ${tx.rawLog}`);
      }
      
      return newKey;
    } catch (error) {
      console.error("Error creating viewing key:", error);
      return undefined;
    } finally {
      set({ isLoading: false }); // ALWAYS TURNS OFF THE GLOBAL LOADING STATE
    }
  },


  authorizeSpend: async () => {
    const { token, wallet, agentAddress, user } = get();
    if (!token || !wallet.isConnected || !wallet.secretAddress || !agentAddress) {
      throw new Error("Cannot authorize: Wallet or session not ready.");
    }
    
    // --- THIS IS THE FIX ---
    // First, check if the user is already authorized.
    if (user?.allowed_to_spend_susdc === "true") {
        alert("You are already authorized to spend sUSDC.");
        return;
    }

    set({ isLoading: true });
    try {
        // This on-chain logic is now only run when necessary.
        const lcdClient = secretLCDClient(wallet.secretAddress, wallet.secretSigner, wallet.enigmaUtils);
        await lcdClient.tx.compute.executeContract({
            sender: wallet.secretAddress,
            contract_address: SUSDC_ADDRESS,
            msg: { increase_allowance: { spender: agentAddress, amount: "100000000" } },
            code_hash: SUSDC_CODE_HASH,
        }, { gasLimit: 150_000 });

        console.log("On-chain approval successful. Verifying with backend...");

        // After success, ask the backend to verify and update its DB.
        const response = await fetch(`${API_BASE_URL}/api/user/authorize_spend`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Backend failed to verify spend authorization.");

        const { data: updatedUser } = await response.json();
        set({ user: updatedUser }); // Update the UI with the confirmed status.

    } catch (error: any) {
        console.error("Authorization failed:", error);
        alert(`Failed to authorize spending: ${error.message}`);
    } finally {
        set({ isLoading: false });
    }
  },

  disconnectWallet: () => {
    set({
      user: null,
      token: null,
      wallet: {
        isConnected: false,
        secretAddress: "",
        secretSigner: undefined,
        secretChain: undefined,
        enigmaUtils: undefined
      },
      balances: {
        sSCRT: "0",
        sUSDC: "0",
      },
      trade: {
        isConvinced: false,
        isTrading: false,
      },
    });
    logout()
  },

  // Viewing key actions
  setViewingKeys: async (viewingKeys: ViewingKeys) => {
    try {
        const { token } = get();
        if (!token || !viewingKeys) {
            throw new Error("User or viewing keys not found");
        }

        // Send the new keys to the Python backend to be saved
        const response = await fetch(`${API_BASE_URL}/api/user/keys`, {
            method: "POST",
            body: JSON.stringify({ sscrtKey: viewingKeys.sSCRT, susdcKey: viewingKeys.sUSDC }),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to set viewing keys on the backend.");
        }

        // Save keys locally for future sessions
        saveViewingKeys(viewingKeys);
        // Update the state to remove the overlay
        set({ viewingKeys });
        
        // Now that keys are set, fetch balances
        get().fetchBalances();

    } catch (error) {
        console.error("Failed to set viewing keys:", error);
        alert("Failed to set viewing keys");
    }
  },

  loadViewingKeysFromStorage: () => {
    const viewingKeys = loadViewingKeys();
    if (viewingKeys) {
      set({ viewingKeys });
    }
  },
  // Balance actions
  updateBalances: (balances: Balance) => {
    set({ balances });
  },

  fetchUser: async (token?: string) => {
    // This new logic fixes the race condition.
    // 1. Prioritize the token passed as an argument.
    // 2. Fall back to the token in the store's state only if no argument is given.
    const tokenToUse = token || get().token;

    if (!tokenToUse) {
      throw new Error("No token found for fetchUser call.");
    }

    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: {
        "Authorization": `Bearer ${tokenToUse}`,
      }
    });

    if (!response.ok) {
      // This helps in debugging if the error persists.
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
      headers: {
        "Authorization": `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      throw new Error("Failed to fetch agent address");
    }
    const { data } = await response.json();
    set({ agentAddress: data });
  },

  fetchBalances: async () => {
    const { wallet, viewingKeys } = get();
    if (!wallet.isConnected || !viewingKeys) return;

    set({ isLoading: true });
    try {
        const { secretAddress, secretSigner, enigmaUtils } = wallet;
        if (!secretAddress || !secretSigner) throw new Error("Wallet not fully connected.");
        
        const lcdClient = secretLCDClient(secretAddress, secretSigner, enigmaUtils);

        // --- Pass the code hashes to the updated utility function ---
        const sscrtCoinBalance = await getSnip20Balance(
            SSCRT_ADDRESS, viewingKeys.sSCRT, lcdClient, secretAddress, SSCRT_CODE_HASH
        );
        const sUSDCBalance = await getSnip20Balance(
            SUSDC_ADDRESS, viewingKeys.sUSDC, lcdClient, secretAddress, SUSDC_CODE_HASH
        );

        const mockBalances = {
          sSCRT: formatAmount(sscrtCoinBalance, 6).toString(),
          sUSDC: formatAmount(sUSDCBalance, 6).toString(),
        };

        set({ balances: mockBalances, isLoading: false });
    } catch (error) {
        console.error("Failed to fetch balances:", error);
        set({ isLoading: false });
    }
  },

  // Trade actions
  setConvinced: (convinced: boolean) => {
    set((state) => ({
      trade: { ...state.trade, isConvinced: convinced },
    }));
  },

  setTradeStatus: (isTrading: boolean) => {
    set((state) => ({ 
        trade: { ...state.trade, isTrading },
        ...(isTrading && { lastTradeResult: undefined })
    }));
  },
  setLastTradeResult: (result: string) => {
      set((state) => ({ trade: { ...state.trade, lastTradeResult: result } }));
  },

  // UI actions
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

}));