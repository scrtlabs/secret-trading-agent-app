import type { ChatMessage, ViewingKeys } from "./types"

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

const VIEWING_KEYS_STORAGE_KEY = "secret-trading-viewing-keys"

export const saveViewingKeys = (viewingKeys: ViewingKeys): void => {
  try {
    localStorage.setItem(VIEWING_KEYS_STORAGE_KEY, JSON.stringify(viewingKeys))
  } catch (error) {
    console.error("Failed to save viewing keys:", error)
  }
}

export const loadViewingKeys = (): ViewingKeys => {
  try {
    const stored = localStorage.getItem(VIEWING_KEYS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load viewing keys:", error)
  }
  return null
}

export const clearViewingKeys = (): void => {
  try {
    localStorage.removeItem(VIEWING_KEYS_STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear viewing keys:", error)
  }
}
