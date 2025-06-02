"use client";

import { useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Markdown from "react-markdown";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { MessageCircle, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ChatWindow() {
  const { messages, loadMessages, clearMessages, agentAddress, wallet, user } =
    useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wallet.isConnected && user) {
      loadMessages();
    }
  }, [wallet, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat with Trading Agent
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
          {agentAddress && (
            <div className="text-xs text-muted-foreground">
              Agent Address: {agentAddress}
            </div>
          )}
        </div>
        <CardDescription>
          Convince the AI agent to execute trades for you
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with the trading agent</p>
              <p className="text-sm">
                Try asking about market conditions or trading strategies
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <Markdown>{message.content}</Markdown>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
