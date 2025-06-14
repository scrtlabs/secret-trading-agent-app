"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { secretLCDClient } from '@/lib/utils';

import { AquaSprite } from '@/components/ui/aqua-sprite';

// Your UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Markdown from 'react-markdown';
import { MessageCircle, Send, ChevronDown, ChevronUp, Loader2, Sparkles, BrainCircuit } from 'lucide-react';

// The Message type from your original code
interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

// Get the backend URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


export function ChatInterface() {
  const { token, wallet, setTradeStatus, setLastTradeResult, fetchBalances } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingThinkingText, setStreamingThinkingText] = useState("");
  const [historicExpanded, setHistoricExpanded] = useState<{ [key: number]: boolean }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (thinkingBoxRef.current) {
      thinkingBoxRef.current.scrollTop = thinkingBoxRef.current.scrollHeight;
    }
  }, [streamingThinkingText]);


  const logTradeResult = async (tradeResult: string) => {
    if (!token) return;
    try {
      console.log("Logging trade result to backend...");
      await fetch(`${API_BASE_URL}/api/log_trade`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ trade_result: tradeResult }),
      });
    } catch (error) {
      console.error("Failed to log trade result via backend:", error);
    }
  };


  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !token) return;

    setIsLoading(true);
    setStreamingThinkingText("");

    const userMessage: Message = { role: "user", content: input };
    const messagesToSend = [...messages, userMessage];
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get("content-type");

      // Handle the JSON "action" response for trading
      if (contentType && contentType.includes("application/json")) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        const { action, trade_args, message } = await response.json();
        
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = message;
            return newMessages;
        });

        if (action === "execute_trade") {
          setTradeStatus(true);
          try {
            if (!wallet.isConnected || !wallet.secretAddress || !wallet.secretSigner) {
              throw new Error("Wallet is not ready for trading.");
            }
            const lcdClient = secretLCDClient(wallet.secretAddress, wallet.secretSigner, wallet.enigmaUtils);
            const tx = await lcdClient.tx.compute.executeContract(trade_args, { gasLimit: 3_000_000 });

            if (tx.code === 0) {
              const successMessage = `Trade successful! Hash: ${tx.transactionHash}`;
              setMessages(prev => [...prev, { role: "assistant", content: successMessage }]);
              setLastTradeResult(successMessage);
              await logTradeResult(successMessage);
              fetchBalances();
            } else {
              const errorMessage = `On-chain error (code ${tx.code}): ${tx.rawLog}`;
              setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
              setLastTradeResult(errorMessage);
              await logTradeResult(errorMessage);
            }
          } catch (e: any) {
            const errorMessage = `Failed to sign or broadcast trade: ${e.message}`;
            setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
            setLastTradeResult(errorMessage);
          } finally {
            setTradeStatus(false);
          }
        }
      } else {
        if (!response.body) throw new Error("Response body is null");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponseText = "";
        
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponseText += decoder.decode(value, { stream: true });

          const thinkRegex = /<think>([\s\S]*?)<\/think>/gs;
          let liveThoughts = "";
          const lastThinkStart = fullResponseText.lastIndexOf("<think>");
          const lastThinkEnd = fullResponseText.lastIndexOf("</think>");
          if (lastThinkStart > -1 && lastThinkStart > lastThinkEnd) {
            liveThoughts = fullResponseText.substring(lastThinkStart + 7);
          }
          setStreamingThinkingText(liveThoughts);

          const visibleContent = fullResponseText.replace(thinkRegex, "").replace(/<think>[\s\S]*/s, "").trim();
          const completedMatch = fullResponseText.match(thinkRegex);
          const thinking = completedMatch ? completedMatch.map(t => t.replace(/<\/?think>/g, "").trim()).join("\n\n---\n\n") : undefined;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.content = visibleContent;
              lastMessage.thinking = thinking;
            }
            return newMessages;
          });
        }
      }
    } catch (e: any) {
      const errorMessage = `An error occurred: ${e.message}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
      setStreamingThinkingText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  return (
    <Card className="flex flex-col flex-1 bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.1)] min-h-0">
      <CardHeader className="flex-shrink-0 pt-10 px-[30px] relative">
        <CardTitle className="text-center text-2xl font-semibold text-[#1e3a8a] mb-4 flex items-center justify-center gap-2">
          <MessageCircle className="h-6 w-6 text-[#1e3a8a]" />
          Trading Agent Chat
        </CardTitle>
        
        <AquaSprite
            isLoading={isLoading}
            isThinking={isLoading && streamingThinkingText.length > 0}
            onClick={() => {
              if (messages.length > 0) {
                  setMessages([]);
              }
            }}
            className="absolute top-[-20px] right-0"
        />
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-[30px] space-y-6 min-h-0 overscroll-behavior-contain">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-4">
              <Sparkles className="h-10 w-10 text-[#4caf50]/70" />
              <p className="max-w-md">Hi! I'm Aqua, your friendly crypto navigation partner.
                <br/>Today I'm trying to convince you to trade sUSDC for sSCRT.
                <br/>Ask me questions and when I have convinced you, let me know by typing "you have convinced me"
                <br/>I hope to become smarter and help people navigate the crypto world with soveignty and safety!</p>
          </div>
        )}
        
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          return (
            <div key={index} className="space-y-4">
              {message.role === 'assistant' && message.thinking && (
                <div className="p-3 rounded-lg bg-[#f9f9f9]">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setHistoricExpanded(prev => ({...prev, [index]: !prev[index]}))}>
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-2"><BrainCircuit size={14}/>Archived Thoughts</span>
                    {historicExpanded[index] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  {historicExpanded[index] && <pre className="mt-2 text-xs whitespace-pre-wrap font-mono p-3 bg-white border border-gray-200 text-gray-700 rounded-md">{message.thinking}</pre>}
                </div>
              )}

              {isLastMessage && isLoading && streamingThinkingText.trim().length > 0 && (
                <div className="p-3 rounded-lg bg-[#f9f9f9]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-600 animate-pulse flex items-center gap-2">
                      <BrainCircuit size={14}/>Thinking...
                    </span>
                  </div>
                  <div
                    ref={thinkingBoxRef}
                    className="mt-2 rounded-md bg-white overflow-y-auto max-h-[40px] border border-gray-200"
                  >
                    <pre className="text-xs whitespace-pre-wrap font-mono p-3 text-gray-700">
                      {streamingThinkingText}
                    </pre>
                  </div>
                </div>
              )}
              
              {message.content && (
                <div className={cn("flex items-end gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                  {message.role === 'assistant' && <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><Sparkles className="h-4 w-4 text-[#4caf50]"/></div>}
                  <div className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2 shadow-sm",
                      message.role === "user" 
                        ? "bg-[#4caf50] text-white rounded-br-none" 
                        : "bg-[#f1f0ea] text-gray-800 rounded-bl-none" 
                  )}>
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isLoading && messages.length > 0 && messages[messages.length-1]?.content === '' && !streamingThinkingText && (
            <div className="flex justify-start items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Waiting for response...</span>
            </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <div className="px-[30px] pb-[30px] pt-5 mt-auto flex-shrink-0">
        <div className="flex gap-2 items-center">
          <Input
            placeholder={wallet.isConnected ? "Type your message..." : "Connect wallet to chat"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!wallet.isConnected || isLoading}
            className="flex-1 bg-[#f1f0ea] border-none rounded-lg text-gray-900 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-[#4caf50]/50 focus-visible:ring-offset-2"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || !wallet.isConnected || isLoading} 
            size="icon" 
            className="flex-shrink-0 bg-[#4caf50] text-white rounded-lg hover:bg-[#45a049] disabled:bg-[#4caf50] disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}