"use client";

import { useState, useRef, useEffect, useCallback } from"react";
import Link from"next/link";
import { UserCircleIcon, Comment01Icon, AlertCircleIcon, Loading02Icon, Search01Icon } from "hugeicons-react";
import { createClient } from"@/lib/supabase/client";

const INBOX_PAGE_SIZE = 20;

export function InboxList({ initialConversations, selectedId, currentUserAgentId, hasMoreConversations }: { 
  initialConversations: any[], 
  selectedId: string | null,
  currentUserAgentId: string,
  hasMoreConversations: boolean 
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [hasMore, setHasMore] = useState(hasMoreConversations);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // Sync with server props
  useEffect(() => {
    setConversations(initialConversations);
    setHasMore(hasMoreConversations);
  }, [initialConversations, hasMoreConversations]);

  // Listen to realtime updates on conversations
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          const updatedConv = payload.new;
          setConversations((prev) => 
            prev.map(c => c.id === updatedConv.id ? { ...c, state: updatedConv.state, last_message_at: updatedConv.last_message_at, assigned_agent_id: updatedConv.assigned_agent_id } : c)
          );
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load more conversations
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || conversations.length === 0) return;

    setIsLoadingMore(true);

    try {
      const supabase = createClient();
      const lastConv = conversations[conversations.length - 1];

      const { data: moreConvs } = await supabase
        .from("conversations")
        .select(`
          id,
          state,
          priority,
          last_message_at,
          customers (id, name, phone)
        `)
        .order("last_message_at", { ascending: false })
        .lt("last_message_at", lastConv.last_message_at)
        .limit(INBOX_PAGE_SIZE);

      if (moreConvs && moreConvs.length > 0) {
        setConversations(prev => [...prev, ...moreConvs]);
        setHasMore(moreConvs.length === INBOX_PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more conversations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, conversations]);

  // IntersectionObserver for auto-loading when scrolling down
  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Filter conversations by search
  const filtered = searchQuery.trim() 
    ? conversations.filter((c: any) => {
        const name = c.customers?.name?.toLowerCase() ||"";
        return name.includes(searchQuery.toLowerCase());
      })
    : conversations;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return"?";
    return name.split("").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
  };

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffHours < 48) return"Yesterday";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800/50 bg-[#09090b]">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mb-3">
          <Comment01Icon className="w-4 h-4 text-indigo-400" /> 
          Live Inbox
          <span className="ml-auto text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">
            {conversations.length}
          </span>
        </h2>
        {/* Search01Icon */}
        <div className="relative">
          <Search01Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input 
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#121214] border border-zinc-800 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm mt-10">
            <Comment01Icon className="w-8 h-8 mx-auto mb-2 opacity-20" />
            {searchQuery ?"No matching conversations." :"No active conversations."}
          </div>
        ) : (
          <div>
            {filtered.map((conv: any, index: number) => {
              const isActive = selectedId === conv.id;
              const initials = getInitials(conv.customers?.name);
              
              return (
                <Link 
                  key={conv.id} 
                  href={`/dashboard/conversations?id=${conv.id}`}
                  className={`block px-3 py-3 transition-all ${
                    isActive 
                      ? 'bg-indigo-600/10 border-l-[3px] border-indigo-500' 
                      : 'border-l-[3px] border-transparent hover:bg-zinc-900/60'
                  } ${index !== filtered.length - 1 ? 'border-b border-b-zinc-800/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive 
                        ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {initials}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-zinc-50' : 'text-zinc-300'}`}>
                          {conv.customers?.name || conv.customers?.phone ||"Unknown"}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                          {getTimeLabel(conv.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          conv.state === 'WAITING_HUMAN' 
                            ? 'bg-orange-500/15 text-orange-400 ring-1 ring-inset ring-orange-500/20' 
                            : conv.state === 'HUMAN_ACTIVE' 
                            ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-inset ring-indigo-500/20' 
                            : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                        }`}>
                          {conv.state === 'WAITING_HUMAN' && <AlertCircleIcon className="w-2.5 h-2.5 mr-0.5 inline" />}
                          {conv.state.replace('_', ' ')}
                        </span>
                        {conv.assigned_agent_id === currentUserAgentId && currentUserAgentId !== '' && (
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 ring-1 ring-inset ring-blue-500/30">
                            My Task
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Bottom Sentinel */}
            <div ref={bottomSentinelRef} className="h-1" />

            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loading02Icon className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
            )}

            {!hasMore && conversations.length >= INBOX_PAGE_SIZE && (
              <div className="text-center py-3">
                <span className="text-[10px] text-zinc-600">No more conversations</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
