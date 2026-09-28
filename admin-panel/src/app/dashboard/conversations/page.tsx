import { createClient } from"@/lib/supabase/server";
import { ChatInterface } from"./ChatInterface";
import { InboxList } from"./InboxList";
import { ConversationsLayout } from"./ConversationsLayout";
import { Comment01Icon } from "hugeicons-react";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser(); const user = data?.user;
  const resolvedParams = await searchParams;
  const selectedId = resolvedParams.id as string | undefined;

  let currentUserAgentId = null;
  let isAdmin = false;
  let availableAgents: any[] = [];
  
  if (user) {
    const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single();
    if (admin) {
      isAdmin = true;
      const { data: agents } = await supabase.from('human_agents').select('id, name').eq('status', 'ACTIVE');
      availableAgents = agents || [];
    } else {
      const { data: agent } = await supabase.from('human_agents').select('id').eq('auth_user_id', user.id).single();
      if (agent) currentUserAgentId = agent.id;
    }
  }

  const INBOX_PAGE_SIZE = 20;

  // Fetch conversations with customer info (only first page)
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("id", { count: 'exact', head: true });

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id,
      state,
      priority,
      last_message_at,
      assigned_agent_id,
      customers (id, name, phone)
    `)
    .order("last_message_at", { ascending: false })
    .limit(INBOX_PAGE_SIZE);

  const hasMoreConversations = (totalConversations || 0) > INBOX_PAGE_SIZE;

  // Fetch messages for selected conversation (only last 30)
  let selectedConversation = null;
  let messages: any[] = [];
  let hasMoreMessages = false;

  const MSG_PAGE_SIZE = 30;

  if (selectedId && conversations) {
    selectedConversation = conversations.find(c => c.id === selectedId);
    
    if (selectedConversation) {
      // Get total count first
      const { count } = await supabase
        .from("conversation_messages")
        .select("id", { count: 'exact', head: true })
        .eq("conversation_id", selectedId);

      const { data: msgs } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: false })
        .limit(MSG_PAGE_SIZE);
        
      messages = (msgs || []).reverse();
      hasMoreMessages = (count || 0) > MSG_PAGE_SIZE;
    }
  }

  // If no ID selected but we have conversations, default to first
  if (!selectedId && conversations && conversations.length > 0) {
    selectedConversation = conversations[0];

    const { count } = await supabase
      .from("conversation_messages")
      .select("id", { count: 'exact', head: true })
      .eq("conversation_id", selectedConversation.id);

    const { data: msgs } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: false })
      .limit(MSG_PAGE_SIZE);
      
    messages = (msgs || []).reverse();
    hasMoreMessages = (count || 0) > MSG_PAGE_SIZE;
  }

  return (
    <ConversationsLayout 
      inbox={
        <InboxList 
          initialConversations={conversations || []} 
          selectedId={selectedId || selectedConversation?.id || null}
          currentUserAgentId={currentUserAgentId || ''}
          hasMoreConversations={hasMoreConversations}
        />
      }
      chat={
        selectedConversation ? (
              <ChatInterface 
                conversation={selectedConversation} 
                messages={messages} 
                currentUserId={user?.id || ''} 
                currentUserAgentId={currentUserAgentId || ''}
                isAdmin={isAdmin}
                availableAgents={availableAgents}
                hasMoreMessages={hasMoreMessages}
              />
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <Comment01Icon className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">No Conversation Selected</h3>
            <p className="text-sm text-zinc-500 mt-1">Select a chat from the sidebar to start messaging.</p>
          </div>
        )
      }
    />
  );
}
