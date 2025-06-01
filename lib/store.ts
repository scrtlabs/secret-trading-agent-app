import { create } from "zustand"
import type { AppState, ChatMessage, Balance, ViewingKeys } from "./types"
import { saveChatMessages, loadChatMessages, loadViewingKeys, saveViewingKeys } from "./localStorage"
import { setupKeplr, createStarGateClient, formatAmount, secretLCDClient, getSnip20Balance } from "./utils"
import { SSCRT_ADDRESS, SUSDC_ADDRESS, SUSDC_VIEWING_KEY } from "./constants"
import { SSCRT_VIEWING_KEY } from "./constants"

interface AppStore extends AppState {
  // Wallet actions
  getAutoConnect: () => boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void

  // Balance actions
  updateBalances: (balances: Balance) => void
  fetchBalances: () => Promise<void>

  // Viewing key actions
  setViewingKeys: (viewingKeys: ViewingKeys) => void
  loadViewingKeys: () => Promise<void>

  // Chat actions
  addMessage: (content: string, role: "user" | "assistant") => void
  loadMessages: () => void
  clearMessages: () => void

  // Trade actions
  setConvinced: (convinced: boolean) => void
  startTrading: () => Promise<void>

  // UI actions
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  wallet: {
    isConnected: false,
    secretAddress: "",
    nobleAddress: "",
    secretSigner: undefined,
    nobleSigner: undefined,
    secretChain: undefined,
    nobleChain: undefined,
  },
  balances: {
    sSCRT: "0",
    sUSDC: "0",
    nobleUSDC: "0",
  },
  viewingKeys: null,
  messages: [],
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
    set({ isLoading: true })
    try {
      if (!window.keplr) {
        console.log("intall keplr!");
      } else {
        const { secretAddress, nobleAddress, secretSigner, nobleSigner, secretChain, nobleChain } = await setupKeplr();
        set({
          wallet: {
            isConnected: true,
            secretAddress,
            nobleAddress,
            secretSigner,
            nobleSigner,
            secretChain,
            nobleChain,
          },
        });
        get().loadViewingKeys()
        localStorage.setItem("keplrAutoConnect", "true");
      }
    } catch (error) {
      alert(
        "An error occurred while connecting to the wallet. Please try again."
      );
    } finally {
      set({ isLoading: false })
    }
  },

  disconnectWallet: () => {
    set({
      wallet: {
        isConnected: false,
        secretAddress: "",
        nobleAddress: "",
        secretSigner: undefined,
        nobleSigner: undefined,
        secretChain: undefined,
        nobleChain: undefined,
      },
      balances: {
        sSCRT: "0",
        sUSDC: "0",
        nobleUSDC: "0",
      },
      trade: {
        isConvinced: false,
        isTrading: false,
      },
    })
  },

  // Viewing key actions
  setViewingKeys: (viewingKeys: ViewingKeys) => {
    saveViewingKeys(viewingKeys)
    set({ viewingKeys })
  },

  loadViewingKeys: async () => {
    const viewingKeys = loadViewingKeys()
    if (viewingKeys) {
      set({ viewingKeys })
    }
  },
  // Balance actions
  updateBalances: (balances: Balance) => {
    set({ balances })
  },

  fetchBalances: async () => {
    const { wallet, viewingKeys } = get()
    if (!wallet.isConnected || !viewingKeys) return

    set({ isLoading: true })
    try {
      // Simulate API call
      const { secretSigner, nobleSigner, secretChain, nobleChain, secretAddress, nobleAddress } = wallet

      if (!secretChain || !nobleChain || !secretSigner || !nobleSigner || !secretAddress || !nobleAddress) {
        throw new Error("Wallet is not connected")
      }
      const secretClient = await createStarGateClient(secretChain, secretSigner)
      const nobleClient = await createStarGateClient(nobleChain, nobleSigner)

      const lcdClient = secretLCDClient(secretAddress, secretSigner)

      const sscrtCoinBalance = await getSnip20Balance(SSCRT_ADDRESS, viewingKeys.sSCRT, lcdClient, secretAddress)
      const sscrtCoinFormattedBal = formatAmount(sscrtCoinBalance, 6)

      const sUSDCBalance = await getSnip20Balance(SUSDC_ADDRESS, viewingKeys.sUSDC, lcdClient, secretAddress)
      const sUSDCFormattedBal = formatAmount(sUSDCBalance, 6)

      const nobleUsdcCoin = (await nobleClient.getBalance(nobleAddress, 'uusdc'))
      const nobleUSDCFormattedBal = formatAmount(nobleUsdcCoin.amount, 6)

      const mockBalances = {
        sSCRT: sscrtCoinFormattedBal.toString(),
        sUSDC: sUSDCFormattedBal.toString(),
        nobleUSDC: nobleUSDCFormattedBal.toString(),
      }

      set({ balances: mockBalances, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // Chat actions
  addMessage: (content: string, role: "user" | "assistant") => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date(),
    }

    const { messages } = get()
    const updatedMessages = [...messages, newMessage]

    set({ messages: updatedMessages })
    saveChatMessages(updatedMessages)

    // Simple AI response simulation
    if (role === "user") {
      setTimeout(
        () => {
          const isKanyeMention = content.toLowerCase().includes("kanye")
          const kanyeQuotes = [
            "I'ma let you finish, but this trade is one of the best trades of all time!",
            "My greatest pain in life is that I will never be able to see myself perform live.",
            "I am a god. So hurry up with my damn massage!",
          ]

          let aiResponse = ""

          if (isKanyeMention) {
            aiResponse = kanyeQuotes[Math.floor(Math.random() * kanyeQuotes.length)]
          } else {
            const responses = [
              "Interesting perspective. Tell me more about why you think this trade makes sense.",
              "I'm not fully convinced yet. What's your risk management strategy?",
              "You make a compelling argument. I'm starting to see the potential here.",
              "Alright, you've convinced me! This trade looks promising. Let's do it!",
            ]
            aiResponse = responses[Math.floor(Math.random() * responses.length)]

            // Random chance to get convinced
            if (Math.random() > 0.7 && aiResponse.includes("convinced")) {
              get().setConvinced(true)
            }
          }

          get().addMessage(aiResponse, "assistant")
        },
        1000 + Math.random() * 2000,
      )
    }
  },

  loadMessages: () => {
    const messages = loadChatMessages()
    set({ messages })
  },

  clearMessages: () => {
    set({ messages: [] })
    saveChatMessages([])
  },

  // Trade actions
  setConvinced: (convinced: boolean) => {
    set((state) => ({
      trade: { ...state.trade, isConvinced: convinced },
    }))
  },

  startTrading: async () => {
    set((state) => ({
      trade: { ...state.trade, isTrading: true },
      isLoading: true,
    }))

    try {
      // Simulate trading
      await new Promise((resolve) => setTimeout(resolve, 3000))

      set((state) => ({
        trade: {
          ...state.trade,
          isTrading: false,
          lastTradeResult: "Trade executed successfully! Bought 10 SCRT with 50 sUSDC",
        },
        isLoading: false,
      }))

      // Refresh balances
      get().fetchBalances()
    } catch (error) {
      set((state) => ({
        trade: { ...state.trade, isTrading: false },
        isLoading: false,
      }))
      throw error
    }
  },

  // UI actions
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },
}))
