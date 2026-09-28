import { detectIntent } from '../ai/router.js';
import { logger } from '../../app.js';
import { supabase } from '../../config/supabase.js';
import { executeWorkflow } from '../workflow/engine.js';
import { configCache } from '../config/cache.js';

const conversationLocks = new Set<string>();

export async function processIncomingMessage(
  remoteJid: string, 
  text: string, 
  botId: string, 
  organizationId: string,
  realPhone?: string,
  pushName?: string,
  messageId?: string,
  lid?: string,
  isFromMe: boolean = false
) {
  logger.info(`Pipeline started for message from ${remoteJid} (phone: ${realPhone}, name: ${pushName}, lid: ${lid}, isFromMe: ${isFromMe})`);

  // 1. Resolve Customer
  const phone = realPhone || remoteJid.split('@')[0];
  let customerId = await resolveCustomer(phone, organizationId, pushName, lid);

  if (!customerId) {
    logger.error('Failed to resolve customer. Aborting pipeline.');
    return;
  }

  // Handle manual reset command from user
  const cmd = text.trim().toLowerCase();
  if (!isFromMe && (cmd === 'reset' || cmd === 'restart' || cmd === '/reset' || cmd === '/restart')) {
    logger.info(`Received reset command from ${phone}. Resolving active conversation.`);
    
    // Close any active conversations for this customer
    await supabase.from('conversations')
      .update({ state: 'RESOLVED' })
      .eq('customer_id', customerId)
      .in('state', ['AI_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'WAITING_INPUT']);
      
    // Send confirmation
    const { sendWhatsAppMessage } = await import('../whatsapp/sender.js');
    await sendWhatsAppMessage(remoteJid, 'আপনার সেশনটি সফলভাবে রিস্টার্ট করা হয়েছে! এখন আপনি নতুনভাবে চ্যাট শুরু করতে পারেন।');
    
    return; // Exit pipeline, next message starts a new session
  }

  // 2. Resolve Conversation
  let conv = await resolveConversation(customerId);

  if (!conv || !conv.id) return;
  const conversationId = conv.id;

  // Save the incoming message to the database
  const { error: msgError } = await supabase.from('conversation_messages').insert([{
    conversation_id: conversationId,
    sender_type: isFromMe ? 'HUMAN' : 'CUSTOMER',
    content: text,
    status: isFromMe ? 'sent' : 'delivered',
    whatsapp_message_id: messageId
  }]);
  
  if (msgError) {
    if (msgError.code === '23505') { // Unique constraint violation
      logger.warn(`Duplicate message detected for ID ${messageId}. Ignoring.`);
      return;
    }
    logger.error({ err: msgError }, 'Failed to save incoming message');
  }

  // Update last_message_at on conversation
  await supabase.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // If this was an outgoing message sent directly from the owner's phone (fromMe), 
  // we do NOT want the AI to reply to itself. We just exit.
  if (isFromMe) {
    logger.info(`Message was fromMe (owner replied directly). Saved to DB. Exiting pipeline.`);
    return;
  }

  // If a human is actively handling this or the customer is waiting for a human,
  // we DO NOT trigger the AI. We only save the message for the human to see.
  if (conv.state === 'HUMAN_ACTIVE' || conv.state === 'WAITING_HUMAN') {
    logger.info({ event: 'human_mode_ai_blocked', conversationId, state: conv.state });
    // Phase 6: Record event for assigned agent notification
    try {
      const { storeCustomerMessageInHumanMode } = await import('../handoff/human-message.service.js');
      await storeCustomerMessageInHumanMode(conversationId, conv.assigned_agent_id ?? null);
    } catch (eventErr) {
      logger.error({ err: eventErr }, 'Failed to record customer message event in human mode');
    }
    return;
  }

  // Check if AI is already processing this conversation
  if (conversationLocks.has(conversationId)) {
    logger.warn(`Conversation ${conversationId} is already being processed by AI. Skipping parallel execution.`);
    return;
  }

  // Acquire execution lock
  conversationLocks.add(conversationId);

  try {
    // Phase 6: Check for explicit customer human request BEFORE AI processing
    try {
      const { detectCustomerHumanRequest, evaluateHandoffDecision } = await import('../handoff/handoff-decision.service.js');
      if (detectCustomerHumanRequest(text)) {
        logger.info({ event: 'customer_requested_human', conversationId });
        const { sendWhatsAppMessage } = await import('../whatsapp/sender.js');
        const handoffResult = await evaluateHandoffDecision(
          { requires_human: true, reason: 'CUSTOMER_REQUESTED_HUMAN' as const },
          conversationId,
          organizationId,
        );
        if (handoffResult.approved) {
          if (handoffResult.agent) {
            // Agent assigned — ownership service already transitioned state
            const systemMessages = configCache.getTable('system_messages');
            const msg = systemMessages.find(m => m.message_key === 'handoff_assigned');
            await sendWhatsAppMessage(remoteJid, msg?.content || 'You have been connected to a support agent.', conversationId, 'SYSTEM');
          } else {
            // No agent available — queue
            const { assignConversation } = await import('../handoff/ownership.service.js');
            // Transition to WAITING_HUMAN
            const { data: waitUpdate } = await supabase
              .from('conversations')
              .update({
                state: 'WAITING_HUMAN',
                handoff_reason: 'CUSTOMER_REQUESTED_HUMAN',
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversationId)
              .in('state', ['AI_ACTIVE', 'WAITING_INPUT'])
              .select('id')
              .maybeSingle();
            if (waitUpdate) {
              const systemMessages = configCache.getTable('system_messages');
              const msg = systemMessages.find(m => m.message_key === 'handoff_waiting');
              await sendWhatsAppMessage(remoteJid, handoffResult.queuedMessage || msg?.content || 'Please wait, we are connecting you to an agent.', conversationId, 'SYSTEM');
            }
          }
          return; // Exit pipeline — handoff handled
        }
        // If handoff not approved (shouldn't happen for customer request), continue to AI
      }
    } catch (handoffErr) {
      logger.error({ err: handoffErr }, 'Error in customer human request detection');
      // Continue to normal AI processing if handoff detection fails
    }

    // 2.5 Check if we need to resume a workflow
    if (conv.state === 'WAITING_INPUT' && conv.current_workflow_id && conv.current_step_id) {
      logger.info(`Resuming workflow ${conv.current_workflow_id} at step ${conv.current_step_id}`);
      
      let agentId: string | undefined = undefined;
      if (conv.current_intent_id) {
        const intent = configCache.getRecord('intents', conv.current_intent_id);
        if (intent) agentId = intent.agent_id;
      }
      
      await executeWorkflow(conv.current_workflow_id, conversationId, remoteJid, text, agentId, conv.current_step_id, true);
      return;
    }

    // 3. Intent Routing
    const intentResult = await detectIntent(text, organizationId);
    logger.info(`Detected Intent: ${intentResult?.intent}`);

    // 4. Fetch the Workflow ID and Agent ID for this intent
    if (intentResult && intentResult.intent === 'api_error') {
      await executeApiError(remoteJid, conversationId);
    } else if (intentResult && intentResult.intent !== 'fallback') {
      const { data: intentData } = await supabase
        .from('intents')
        .select('id, workflow_id, agent_id')
        .eq('slug', intentResult.intent)
        .eq('organization_id', organizationId)
        .single();

      if (intentData && intentData.workflow_id && conversationId) {
        // Update conversation with intent and workflow
        await supabase.from('conversations').update({
          current_intent_id: intentData.id,
          current_workflow_id: intentData.workflow_id
        }).eq('id', conversationId);

        // 5. Execute Workflow
        await executeWorkflow(intentData.workflow_id, conversationId, remoteJid, text, intentData.agent_id);
        return;
      }
    }

    // Fallback: If no workflow is mapped, send a default response
    if (intentResult?.intent !== 'api_error') {
      await executeFallback(remoteJid, conversationId);
    }
  } finally {
    // Release execution lock
    conversationLocks.delete(conversationId);
  }
}

async function executeApiError(remoteJid: string, conversationId: string) {
  const { sendWhatsAppMessage } = await import('../whatsapp/sender.js');
  
  const systemMessages = configCache.getTable('system_messages');
  const errorObj = systemMessages.find(m => m.message_key === 'ApiError');
  
  const errorMessage = errorObj?.content || "দুঃখিত, আমাদের সিস্টেমে এই মুহূর্তে একটি কারিগরি ত্রুটি চলছে (AI Server Issue)। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা আমাদের কাস্টমার সাপোর্টে কল করুন।";
  
  await sendWhatsAppMessage(remoteJid, errorMessage, conversationId);
}

async function executeFallback(remoteJid: string, conversationId: string) {
  const { sendWhatsAppMessage } = await import('../whatsapp/sender.js');
  
  // Try to find a custom fallback message in the database
  const systemMessages = configCache.getTable('system_messages');
  const fallbackObj = systemMessages.find(m => m.message_key === 'Fallback');
  
  const fallbackMsg = fallbackObj?.content || "দুঃখিত, আমি আপনার কথাটি বুঝতে পারিনি। আমরা শুধুমাত্র ডাক্তারের অ্যাপয়েন্টমেন্ট, চিকিৎসা খরচ, এবং মেডিকেল ভিসা সংক্রান্ত সহায়তা প্রদান করে থাকি। এর বাইরের কোনো প্রশ্নের উত্তর আমরা দিতে পারবো না।";
  
  await sendWhatsAppMessage(remoteJid, fallbackMsg, conversationId);
}

async function resolveCustomer(phone: string, organizationId: string, pushName?: string, lid?: string): Promise<string | null> {
  // Try to find customer
  let query = supabase
    .from('customers')
    .select('id, name, whatsapp_lid')
    .eq('organization_id', organizationId);
    
  if (lid) {
    query = query.or(`phone.eq.${phone},whatsapp_lid.eq.${lid}`);
  } else {
    query = query.eq('phone', phone);
  }

  const { data: existing } = await query.limit(1).maybeSingle();

  if (existing) {
    const updates: any = {};
    if (pushName && !existing.name) updates.name = pushName;
    if (lid && !existing.whatsapp_lid) updates.whatsapp_lid = lid;
    
    if (Object.keys(updates).length > 0) {
      await supabase.from('customers').update(updates).eq('id', existing.id);
    }
    return existing.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert([{ 
      phone, 
      whatsapp_lid: lid || null,
      organization_id: organizationId,
      name: pushName || null
    }])
    .select('id')
    .single();

  if (error) {
    logger.error({ err: error }, 'Error creating customer');
    return null;
  }

  return newCustomer.id;
}

async function resolveConversation(customerId: string): Promise<{ id: string, state: string, current_workflow_id?: string, current_step_id?: string, current_intent_id?: string, assigned_agent_id?: string } | null> {
  // Find active conversation
  const { data: active } = await supabase
    .from('conversations')
    .select('id, state, current_workflow_id, current_step_id, current_intent_id, assigned_agent_id')
    .eq('customer_id', customerId)
    .in('state', ['AI_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'WAITING_INPUT'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return { 
    id: active.id, 
    state: active.state,
    current_workflow_id: active.current_workflow_id,
    current_step_id: active.current_step_id,
    current_intent_id: active.current_intent_id,
    assigned_agent_id: active.assigned_agent_id,
  };

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert([{ customer_id: customerId, state: 'AI_ACTIVE' }])
    .select('id, state')
    .single();

  if (error) {
    logger.error({ err: error }, 'Error creating conversation');
    return null;
  }

  return { id: newConv.id, state: newConv.state };
}
