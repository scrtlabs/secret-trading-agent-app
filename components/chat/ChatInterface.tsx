"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Markdown from 'react-markdown';
import { MessageCircle, Send, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { StartTradingButton } from '@/components/start-trading-button';

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

export function ChatInterface() {
  const { token, wallet } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [streamingThinkingText, setStreamingThinkingText] = useState("");
  const [isLiveThinkingExpanded, setIsLiveThinkingExpanded] = useState(true);
  const [historicExpanded, setHistoricExpanded] = useState<{ [key: number]: boolean }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingThinkingText]);

  useEffect(() => {
    if (thinkingBoxRef.current) {
      thinkingBoxRef.current.scrollTop = thinkingBoxRef.current.scrollHeight;
    }
  }, [streamingThinkingText]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !token) return;

    setIsLoading(true);
    setStreamingThinkingText("");
    // Default the box to its collapsed, two-line preview state.
    setIsLiveThinkingExpanded(false); 

    const userMessage: Message = { role: "user", content: input };
    const assistantPlaceholder: Message = { role: "assistant", content: "" };
    
    const messagesToSend = [...messages, userMessage];
    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setInput("");

    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/chat`;
    let fullResponseText = "";
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gs;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok || !response.body) throw new Error(`API Error: ${response.status}`);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullResponseText += decoder.decode(value, { stream: true });

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
    } catch (e: any) {
      setMessages(prev => {
        const newMessages = [...prev.slice(0, -1)];
        return [...newMessages, { role: 'assistant', content: `An error occurred: ${e.message}` }];
      });
    } finally {
      setIsLoading(false);
      setStreamingThinkingText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-col h-[70vh]">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />Chat with Trading Agent</CardTitle>
            {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={() => setMessages([])}><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-8">Start a conversation!</div>
          )}
          
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            return (
              <div key={index}>
                {/* HISTORIC thought box */}
                {message.role === 'assistant' && message.thinking && (
                  <div className="mb-2 p-3 border rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setHistoricExpanded(prev => ({...prev, [index]: !prev[index]}))}>
                      <span className="text-sm font-semibold text-gray-500">Thoughts</span>
                      {historicExpanded[index] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {historicExpanded[index] && <pre className="mt-2 text-xs whitespace-pre-wrap font-mono p-2 bg-black text-green-400 rounded">{message.thinking}</pre>}
                  </div>
                )}

                {/* LIVE "Thinking..." box */}
                {isLastMessage && isLoading && streamingThinkingText.trim().length > 0 && (
                  <div className="mb-2 p-3 border rounded-lg bg-yellow-50/50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsLiveThinkingExpanded(prev => !prev)}>
                      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 animate-pulse">Thinking...</span>
                      {isLiveThinkingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div
                      ref={thinkingBoxRef}
                      className={cn(
                        "mt-2 rounded bg-black overflow-y-auto transition-all duration-300 ease-in-out",
                        // --- THIS IS THE FINAL FIX ---
                        // Use a fixed `h-12` for the collapsed state, not `max-h-12`
                        isLiveThinkingExpanded ? "max-h-96" : "h-12"
                      )}
                    >
                      <pre className="text-xs whitespace-pre-wrap font-mono p-2 text-yellow-300">
                        {streamingThinkingText}
                      </pre>
                    </div>
                  </div>
                )}
                
                {message.content && (
                  <div className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-lg px-4 py-2", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <Markdown>{message.content}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages.length > 0 && messages[messages.length-1]?.content === '' && !streamingThinkingText && (
             <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>
      
      <div className="mt-4 flex gap-2">
        <Input
          placeholder={wallet.isConnected ? "Type your message..." : "Connect wallet to chat"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!wallet.isConnected || isLoading}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} disabled={!input.trim() || !wallet.isConnected || isLoading} size="icon">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <StartTradingButton />
    </div>
  );
}