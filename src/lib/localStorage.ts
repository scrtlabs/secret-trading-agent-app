import type { ChatMessage } from "./types"

const CHAT_STORAGE_KEY = "secret-trading-chat"

export const saveChatMessages = (messages: ChatMessage[]): void => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.error("Failed to save chat messages:", error)
  }
}

export const loadChatMessages = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
    }
  } catch (error) {
    console.error("Failed to load chat messages:", error)
  }
  return []
}

export const clearChatMessages = (): void => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear chat messages:", error)
  }
}
