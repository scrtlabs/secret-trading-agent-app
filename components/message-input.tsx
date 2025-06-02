"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const { wallet, addMessage, isLoading, token, user } = useAppStore();

  const handleSend = () => {
    if (!message.trim() || !wallet.isConnected) return;

    addMessage(message, "user");
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = !wallet.isConnected || isLoading || !token || !user;

  return (
    <div className="flex gap-2">
      <Input
        placeholder={
          wallet.isConnected
            ? "Type your message to the trading agent..."
            : "Connect wallet to start chatting"
        }
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        className="flex-1"
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || !wallet.isConnected || isLoading}
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
