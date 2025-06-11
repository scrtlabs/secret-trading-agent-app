"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Markdown from 'react-markdown';
import { MessageCircle, Send, ChevronDown, ChevronUp, Trash2, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto p-4">
      <Card className="flex flex-col h-[75vh] bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Trading Agent Chat
            </CardTitle>
            {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={() => setMessages([])}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                <Sparkles className="h-10 w-10 text-primary/50" />
                <p>Your AI trading partner is ready.<br/>Ask anything to begin.</p>
            </div>
          )}
          
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            return (
              <div key={index} className="space-y-4">
                {/* --- HISTORIC THOUGHTS BOX (Slate Gray) --- */}
                {message.role === 'assistant' && message.thinking && (
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setHistoricExpanded(prev => ({...prev, [index]: !prev[index]}))}>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2"><BrainCircuit size={14}/>Archived Thoughts</span>
                      {historicExpanded[index] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {historicExpanded[index] && <pre className="mt-2 text-xs whitespace-pre-wrap font-mono p-3 bg-slate-900 text-slate-300 rounded-md">{message.thinking}</pre>}
                  </div>
                )}

                {/* --- LIVE "THINKING..." BOX (NOW ALSO Slate Gray) --- */}
                {isLastMessage && isLoading && streamingThinkingText.trim().length > 0 && (
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsLiveThinkingExpanded(prev => !prev)}>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse flex items-center gap-2">
                        <BrainCircuit size={14}/>Thinking...
                      </span>
                      {isLiveThinkingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <div
                      ref={thinkingBoxRef}
                      className={cn(
                        "mt-2 rounded-md bg-slate-900 overflow-y-auto transition-all duration-300 ease-in-out",
                        isLiveThinkingExpanded ? "max-h-96" : "h-12"
                      )}
                    >
                      {/* --- Text color is now slate-300 instead of blue-300 --- */}
                      <pre className="text-xs whitespace-pre-wrap font-mono p-3 text-slate-300">
                        {streamingThinkingText}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* --- MESSAGE BUBBLES --- */}
                {message.content && (
                  <div className={cn("flex items-end gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === 'assistant' && <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary"/></div>}
                    <div className={cn(
                      "max-w-[85%] rounded-lg px-4 py-2 shadow-sm",
                      message.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-none"
                    )}>
                      <Markdown>{message.content}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages.length > 0 && messages[messages.length-1]?.content === '' && !streamingThinkingText && (
             <div className="flex justify-start items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Waiting for response...</span>
             </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        
        {/* --- INPUT AREA --- */}
        <div className="border-t p-4 flex-shrink-0 bg-background/80">
          <div className="flex gap-2 items-center">
            <Input
              placeholder={wallet.isConnected ? "Type your message..." : "Connect wallet to chat"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!wallet.isConnected || isLoading}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!input.trim() || !wallet.isConnected || isLoading} size="icon" className="flex-shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 flex justify-center">
            <StartTradingButton />
          </div>
        </div>
      </Card>
    </div>
  );
}