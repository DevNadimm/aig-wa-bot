"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SentIcon, UserCircleIcon, BotIcon, Tick01Icon, TickDouble01Icon, Clock01Icon, Loading02Icon, Shield01Icon, FlashIcon, AlertCircleIcon } from "hugeicons-react";
import { sendMessage, changeConversationState, assignConversationToAgent } from "./actions";
import { createClient } from"@/lib/supabase/client";

const MSG_PAGE_SIZE = 30;

export function ChatInterface({ conversation, messages: initialMessages, currentUserId, currentUserAgentId, isAdmin, availableAgents, hasMoreMessages: initialHasMore }: { conversation: any, messages: any[], currentUserId: string, currentUserAgentId: string, isAdmin: boolean, availableAgents?: any[], hasMoreMessages: boolean }) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [localState, setLocalState] = useState(conversation.state);
  const [localAssignedAgentId, setLocalAssignedAgentId] = useState(conversation.assigned_agent_id);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const router = useRouter();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync with server-side props when conversation changes
  useEffect(() => {
    setMessages(initialMessages);
    setHasMore(initialHasMore);
    setLocalState(conversation.state);
    setLocalAssignedAgentId(conversation.assigned_agent_id);
    isInitialLoad.current = true;
  }, [initialMessages, initialHasMore, conversation.state, conversation.assigned_agent_id]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior:"instant" });
      isInitialLoad.current = false;
    } else {
      const container = scrollContainerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
          messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
        }
      }
    }
  }, [messages]);

  // Detect scrolling to fade overlay
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => setIsScrolling(false), 400);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;

    try {
      const supabase = createClient();
      const oldestMessage = messages[0];

      const { data: olderMsgs } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(MSG_PAGE_SIZE);

      if (olderMsgs && olderMsgs.length > 0) {
        const reversed = olderMsgs.reverse();
        setMessages(prev => [...reversed, ...prev]);
        setHasMore(olderMsgs.length === MSG_PAGE_SIZE);

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages, conversation.id]);

  // IntersectionObserver for the top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadOlderMessages();
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadOlderMessages]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            setMessages((prev: any[]) => {
              if (prev.some((m: any) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new;
            setMessages((prev: any[]) => 
              prev.map(msg => msg.id === updatedMsg.id ? { ...msg, status: updatedMsg.status } : msg)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedConv = payload.new;
          setLocalState(updatedConv.state);
          setLocalAssignedAgentId(updatedConv.assigned_agent_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      await sendMessage(conversation.id, inputText);
      setInputText("");
      inputRef.current?.focus();
      
      let stateChanged = false;
      if (localState === 'WAITING_HUMAN') {
        setLocalState('HUMAN_ACTIVE');
        if (!isAdmin) setLocalAssignedAgentId(currentUserAgentId);
        await changeConversationState(conversation.id, 'HUMAN_ACTIVE');
        stateChanged = true;
      }
      
      // Refresh the page so the Inbox list updates its timestamp/state
      router.refresh();
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStateChange = async (newState: 'HUMAN_ACTIVE' | 'AI_ACTIVE') => {
    try {
      setLocalState(newState); // Optimistic update
      if (newState === 'AI_ACTIVE') setLocalAssignedAgentId(null);
      else if (newState === 'HUMAN_ACTIVE' && !isAdmin) setLocalAssignedAgentId(currentUserAgentId);
      
      await changeConversationState(conversation.id, newState);
      router.refresh();
    } catch (error) {
      console.error(error);
      setLocalState(conversation.state); // Revert on failure
      setLocalAssignedAgentId(conversation.assigned_agent_id);
    }
  };

  const handleAssignAdmin = async (agentId: string) => {
    try {
      if (agentId === "") {
        setLocalState('AI_ACTIVE');
        setLocalAssignedAgentId(null);
        await assignConversationToAgent(conversation.id, null);
      } else {
        setLocalState('HUMAN_ACTIVE');
        setLocalAssignedAgentId(agentId);
        await assignConversationToAgent(conversation.id, agentId);
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      setLocalState(conversation.state);
      setLocalAssignedAgentId(conversation.assigned_agent_id);
    }
  };

  const customerInitials = (conversation.customers?.name ||"U")
    .split("").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return"Today";
    if (date.toDateString() === yesterday.toDateString()) return"Yesterday";
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  let lastDateLabel ="";

  const isAssignedAgent = isAdmin || 
    (localState === 'HUMAN_ACTIVE' && conversation.state !== 'HUMAN_ACTIVE') || 
    (localAssignedAgentId === currentUserAgentId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] relative">
      {/* Header */}
      <div className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-zinc-800/60 bg-[#09090b]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-300">
            {customerInitials}
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">{conversation.customers?.name || conversation.customers?.phone ||"Unknown Customer"}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                localState === 'WAITING_HUMAN' ? 'bg-orange-400' :
                localState === 'HUMAN_ACTIVE' ? 'bg-indigo-400' : 'bg-emerald-400'
              }`} />
              <span className="text-[10px] text-zinc-500 font-mono tracking-tight uppercase">
                {localState.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center justify-center font-medium gap-1.5 h-8 px-3 rounded-md text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.4)] border ${
            localState === 'HUMAN_ACTIVE' 
              ? 'bg-indigo-600 text-white border-indigo-700' 
              : localState === 'WAITING_HUMAN' 
              ? 'bg-orange-600 text-white border-orange-700' 
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}>
            {localState === 'HUMAN_ACTIVE' && <Shield01Icon className="w-3.5 h-3.5" />}
            {localState === 'AI_ACTIVE' && <FlashIcon className="w-3.5 h-3.5" />}
            {localState === 'WAITING_HUMAN' && <AlertCircleIcon className="w-3.5 h-3.5" />}
            {localState.replace('_', ' ')}
          </div>
          {isAdmin && (
            <div className="relative">
              <select 
                className="appearance-none h-8 bg-[#121214] hover:bg-zinc-800/50 border border-zinc-800/80 text-xs text-zinc-300 rounded-md pl-3 pr-8 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors shadow-sm cursor-pointer"
                value={localState === 'AI_ACTIVE' ? "" : (localAssignedAgentId || "")}
                onChange={(e) => handleAssignAdmin(e.target.value)}
              >
                <option value="" className="bg-zinc-900 text-zinc-100">AI (Unassigned)</option>
                {availableAgents?.map(agent => (
                  <option key={agent.id} value={agent.id} className="bg-zinc-900 text-zinc-100">{agent.name}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
          )}
          {localState !== 'HUMAN_ACTIVE' ? (
            isAdmin ? (
              <Button 
                onClick={() => handleStateChange('HUMAN_ACTIVE')}
                size="sm"
              >
                <Shield01Icon className="w-3.5 h-3.5" /> Take Over
              </Button>
            ) : (
              <Button disabled variant="secondary" size="sm">
                <Shield01Icon className="w-3.5 h-3.5" /> Waiting for assignment
              </Button>
            )
          ) : isAssignedAgent ? (
            <Button 
              onClick={() => handleStateChange('AI_ACTIVE')}
              variant="secondary"
              size="sm"
            >
              <BotIcon className="w-3.5 h-3.5 text-emerald-400" /> Release to AI
            </Button>
          ) : (
            <Button disabled variant="secondary" size="sm">
              <UserCircleIcon className="w-3.5 h-3.5" /> Assigned to another agent
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-[#0a0a0c]">
        {/* Top Sentinel */}
        <div ref={topSentinelRef} className="h-1" />

        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/50 rounded-full px-4 py-1.5">
              <Loading02Icon className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-[11px] text-zinc-400">Loading older messages...</span>
            </div>
          </div>
        )}

        {!hasMore && messages.length > MSG_PAGE_SIZE && (
          <div className="text-center py-3 mb-2">
            <span className="text-[10px] text-zinc-600 bg-zinc-900/50 px-3 py-1 rounded-full">Beginning of conversation</span>
          </div>
        )}

        {messages.map((msg: any, idx: number) => {
          const isMe = msg.sender_type === 'HUMAN' || msg.sender_type === 'AI' || msg.sender_type === 'SYSTEM';
          const isAI = msg.sender_type === 'AI';
          const isSystem = msg.sender_type === 'SYSTEM';
          const isCustomer = !isMe;

          // Date separator
          const currentDateLabel = getDateLabel(msg.created_at);
          let showDateSeparator = false;
          if (currentDateLabel !== lastDateLabel) {
            showDateSeparator = true;
            lastDateLabel = currentDateLabel;
          }

          // Tick01Icon if consecutive same sender (no avatar needed)
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isSameSender = prevMsg && prevMsg.sender_type === msg.sender_type;
          const timeDiff = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) / 60000 : 999;
          const isGrouped = isSameSender && timeDiff < 3 && !showDateSeparator;
          
          return (
            <div key={msg.id || idx}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="flex-1 h-px bg-zinc-800/50" />
                  <span className="px-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{currentDateLabel}</span>
                  <div className="flex-1 h-px bg-zinc-800/50" />
                </div>
              )}
              
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
                <div className={`flex max-w-[65%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-7">
                    {!isGrouped && (
                      isAI ? (
                        <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                          <BotIcon className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                      ) : isSystem ? (
                        <div className="h-7 w-7 rounded-full bg-zinc-800/80 flex items-center justify-center ring-1 ring-zinc-700/30">
                          <Shield01Icon className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      ) : isCustomer ? (
                        <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center ring-1 ring-zinc-700/50">
                          <span className="text-[9px] text-zinc-400 font-bold">{customerInitials}</span>
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                          <UserCircleIcon className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                      )
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender label */}
                    {!isGrouped && isAI && (
                      <span className="text-[9px] text-emerald-500/70 mb-1 ml-1 uppercase font-bold tracking-wider">
                        AI Bot
                      </span>
                    )}
                    {!isGrouped && isSystem && (
                      <span className="text-[9px] text-zinc-500/70 mb-1 mr-1 uppercase font-bold tracking-wider flex items-center gap-1">
                        System
                      </span>
                    )}
                    {!isGrouped && !isMe && !isAI && (
                      <span className="text-[9px] text-zinc-500 mb-1 ml-1 font-semibold">
                        {conversation.customers?.name ||"Customer"}
                      </span>
                    )}
                    
                    <div className={`px-3.5 py-2 text-[13px] leading-relaxed ${
                      isAI 
                        ? 'bg-zinc-800/80 text-zinc-200 rounded-2xl rounded-bl-md border border-zinc-700/30' 
                        : isSystem
                        ? 'bg-zinc-800/40 text-zinc-400 rounded-2xl rounded-br-md border border-zinc-800/40 italic'
                        : isMe 
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-md shadow-indigo-900/20' 
                        : 'bg-[#18181b] text-zinc-200 rounded-2xl rounded-bl-md border border-zinc-800/60'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {/* Timestamp & Status */}
                    {!isGrouped && (
                      <div className="flex items-center gap-1 mt-0.5 px-1">
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          msg.status === 'read' ? <TickDouble01Icon className="w-3 h-3 text-blue-400" /> :
                          msg.status === 'delivered' ? <TickDouble01Icon className="w-3 h-3 text-zinc-500" /> :
                          msg.status === 'sent' ? <Tick01Icon className="w-3 h-3 text-zinc-500" /> :
                          <Clock01Icon className="w-3 h-3 text-zinc-700" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-[#09090b] border-t border-zinc-800/50">
        <form onSubmit={handleSend} className="flex items-center gap-2">
            <input 
              ref={inputRef}
              disabled={localState === 'AI_ACTIVE' || (localState === 'HUMAN_ACTIVE' && !isAssignedAgent) || (localState === 'WAITING_HUMAN' && !isAdmin)}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={localState === 'AI_ACTIVE' ? "Take over to reply..." : (localState === 'WAITING_HUMAN' && !isAdmin) ? "Waiting for admin assignment..." : (localState === 'HUMAN_ACTIVE' && !isAssignedAgent) ? "Assigned to another agent" : "Type a message..."} 
              className="flex-1 h-10 px-4 bg-[#121214] border border-zinc-800 rounded-full text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || isSending || localState === 'AI_ACTIVE' || (localState === 'HUMAN_ACTIVE' && !isAssignedAgent) || (localState === 'WAITING_HUMAN' && !isAdmin)}
            className="h-10 w-10 shrink-0 rounded-full  shadow-indigo-900/30 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none flex items-center justify-center transition-all active:scale-95"
          >
            {isSending ? <Loading02Icon className="w-4 h-4 animate-spin" /> : <SentIcon className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
      </div>
      
      {/* Overlay if AI is Active */}
      {localState === 'AI_ACTIVE' && (
        <div 
          className="absolute bottom-20 left-1/2 -translate-x-1/2 transition-opacity duration-300 ease-in-out"
          style={{ opacity: isScrolling ? 0.15 : 1 }}
        >
          <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-full px-4 py-1.5 flex items-center justify-center gap-2">
            <BotIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-zinc-300">AI is handling this conversation</span>
          </div>
        </div>
      )}
    </div>
  );
}
