import { create } from "zustand"
import type { AppState, ChatMessage, Balance } from "./types"
import { saveChatMessages, loadChatMessages } from "./localStorage"

interface AppStore extends AppState {
  // Wallet actions
  connectWallet: (mnemonic: string) => Promise<void>
  disconnectWallet: () => void

  // Balance actions
  updateBalances: (balances: Balance) => void
  fetchBalances: () => Promise<void>

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
    mnemonic: "",
  },
  balances: {
    sSCRT: "0",
    sUSDC: "0",
  },
  messages: [],
  trade: {
    isConvinced: false,
    isTrading: false,
  },
  isLoading: false,

  // Wallet actions
  connectWallet: async (mnemonic: string) => {
    set({ isLoading: true })
    try {
      // Simulate wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1000))

      set({
        wallet: {
          isConnected: true,
          mnemonic,
          address: "secret1..." + Math.random().toString(36).substr(2, 9),
        },
        isLoading: false,
      })

      // Fetch balances after connecting
      get().fetchBalances()
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  disconnectWallet: () => {
    set({
      wallet: {
        isConnected: false,
        mnemonic: "",
      },
      balances: {
        sSCRT: "0",
        sUSDC: "0",
      },
      trade: {
        isConvinced: false,
        isTrading: false,
      },
    })
  },

  // Balance actions
  updateBalances: (balances: Balance) => {
    set({ balances })
  },

  fetchBalances: async () => {
    const { wallet } = get()
    if (!wallet.isConnected) return

    set({ isLoading: true })
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      const mockBalances = {
        sSCRT: (Math.random() * 1000).toFixed(2),
        sUSDC: (Math.random() * 5000).toFixed(2),
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
