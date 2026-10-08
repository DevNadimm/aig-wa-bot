'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  if (!user) throw new Error("Unauthorized")

  // Get agent name and type
  let senderName = 'AGENT';
  let senderType = 'HUMAN';
  const { data: agentData } = await supabase.from('human_agents').select('name').eq('auth_user_id', user.id).single();
  
  if (agentData?.name) {
    senderName = agentData.name;
  } else {
    // If not an agent, check if it's an admin
    const { data: adminData } = await supabase.from('admins').select('id').eq('id', user.id).single();
    if (adminData) {
      senderType = 'ADMIN';
    }
  }

  // We need to fetch the customer's phone or lid to send the WhatsApp message
  const { data: conv } = await supabase
    .from("conversations")
    .select("customers(phone, whatsapp_lid)")
    .eq("id", conversationId)
    .single()

  const customerData = (Array.isArray(conv?.customers) ? conv.customers[0] : conv?.customers) as any
  const phone = customerData?.phone
  const lid = customerData?.whatsapp_lid
  
  if (!phone && !lid) {
    throw new Error("Could not find customer phone number or LID")
  }

  // 1. Call the local backend API to actually send the message via Baileys
  // The backend API will also insert the message into the database!
  try {
    const res = await fetch('http://localhost:3001/api/whatsapp/send', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({
        conversationId,
        agentId: user.id, // Set the sender as the human agent
        phone,
        lid,
        senderType,
        senderName,
        text: content
      })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Failed to send message")
    }
  } catch (error) {
    console.error("Error calling backend API:", error)
    throw error
  }

  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId)

  revalidatePath("/dashboard/conversations")
}

export async function changeConversationState(conversationId: string, state: 'HUMAN_ACTIVE' | 'AI_ACTIVE') {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  if (!user) throw new Error("Unauthorized")

  let assigned_agent_id = null;
  
  if (state === 'HUMAN_ACTIVE') {
    const { data: agent } = await supabase.from('human_agents').select('id').eq('auth_user_id', user.id).single();
    if (agent) {
      assigned_agent_id = agent.id;
    }
  }

  // Fetch the conversation before updating to check the previous state
  const { data: convBefore } = await supabase
    .from("conversations")
    .select("state, customers(phone, whatsapp_lid)")
    .eq("id", conversationId)
    .single()
    
  const previousState = convBefore?.state;

  const { error } = await supabase
    .from("conversations")
    .update({ 
      state,
      assigned_agent_id
    })
    .eq("id", conversationId)

  if (error) {
    console.error("Error changing state:", error)
    throw new Error(error.message)
  }

  // If handing over to human, send an automatic notification message
  // BUT only if the AI hasn't already sent a handover wait message (previousState !== 'WAITING_HUMAN')
  if (state === 'HUMAN_ACTIVE' && previousState !== 'WAITING_HUMAN') {
    try {
      const customerData = (Array.isArray(convBefore?.customers) ? convBefore.customers[0] : convBefore?.customers) as any
      const phone = customerData?.phone
      const lid = customerData?.whatsapp_lid
      
      if (phone || lid) {
        await fetch('http://localhost:3001/api/whatsapp/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            conversationId,
            phone,
            lid,
            senderType: 'SYSTEM',
            text: "A human agent has joined the chat and will assist you shortly."
          })
        })
      }
    } catch (e) {
      console.error("Failed to send handoff notification", e)
    }
  }

  revalidatePath("/dashboard/conversations")
}

export async function assignConversationToAgent(conversationId: string, agentId: string | null) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  if (!user) throw new Error("Unauthorized")

  // For now we assume only admins can call this, so we should verify admin status.
  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single()
  if (!admin) throw new Error("Unauthorized - Admin only")

  const state = agentId ? 'HUMAN_ACTIVE' : 'AI_ACTIVE'

  // Fetch the conversation before updating to check the previous state
  const { data: convBefore } = await supabase
    .from("conversations")
    .select("state, customers(phone, whatsapp_lid)")
    .eq("id", conversationId)
    .single()
    
  const previousState = convBefore?.state;

  const { error } = await supabase
    .from("conversations")
    .update({ 
      state,
      assigned_agent_id: agentId
    })
    .eq("id", conversationId)

  if (error) {
    console.error("Error assigning agent:", error)
    throw new Error(error.message)
  }

  // If assigning a human agent, send notification ONLY if we weren't already waiting for one
  if (agentId && previousState !== 'WAITING_HUMAN') {
    try {
      const customerData = (Array.isArray(convBefore?.customers) ? convBefore.customers[0] : convBefore?.customers) as any
      const phone = customerData?.phone
      const lid = customerData?.whatsapp_lid

      if (phone || lid) {
        await fetch('http://localhost:3001/api/whatsapp/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            conversationId,
            phone,
            lid,
            senderType: 'SYSTEM',
            text: "A human agent has joined the chat and will assist you shortly."
          })
        })
      }
    } catch (e) {
      console.error("Failed to send handoff notification", e)
    }
  }

  revalidatePath("/dashboard/conversations")
}
