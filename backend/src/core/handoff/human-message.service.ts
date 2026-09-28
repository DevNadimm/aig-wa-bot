import pino from 'pino';
import { supabase } from '../../config/supabase.js';
import { ActorType, HandoffEventType } from '../../types/handoff.types.js';
import { sendWhatsAppMessage } from '../whatsapp/sender.js';
import { authorizeHumanReply } from './authorization.guard.js';
import { auditService } from './audit.service.js';
import crypto from 'crypto';

const logger = pino({ name: 'human-message-service' });

export async function sendHumanMessage(
    conversationId: string,
    agentId: string,
    actorType: ActorType,
    content: string
): Promise<{ messageId: string; whatsappMessageId?: string }> {
    logger.info({ event: 'SEND_HUMAN_MESSAGE_INIT', conversationId, agentId, actorType });

    // 1. Enforce ownership and state
    await authorizeHumanReply(conversationId, agentId, actorType);

    // 2. Fetch conversation with customer info
    const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select(`
            id,
            customer_id,
            customers (
                phone,
                whatsapp_lid,
                whatsapp_session_id
            )
        `)
        .eq('id', conversationId)
        .single();

    if (conversationError || !conversationData) {
        logger.error({ event: 'FETCH_CONVERSATION_FAILED', error: conversationError, conversationId });
        throw new Error(`Failed to fetch conversation: ${conversationError?.message}`);
    }

    // Cast the customers relation data
    const customer = conversationData.customers as any;
    
    if (!customer) {
        logger.error({ event: 'CUSTOMER_NOT_FOUND', conversationId });
        throw new Error('Customer data not found for conversation');
    }

    const sessionId = customer.whatsapp_session_id;

    // 3. Determine WhatsApp remoteJid
    let remoteJid: string;
    if (customer.whatsapp_lid) {
        remoteJid = `${customer.whatsapp_lid}@lid`;
    } else if (customer.phone) {
        remoteJid = `${customer.phone}@s.whatsapp.net`;
    } else {
        logger.error({ event: 'NO_CUSTOMER_CONTACT_INFO', conversationId });
        throw new Error('Customer has no phone or whatsapp_lid');
    }

    // 4. Send WhatsApp message
    let whatsappMessageId: string | undefined;
    try {
        await sendWhatsAppMessage(
            remoteJid,
            content,
            conversationId,
            'HUMAN_AGENT'
        );
    } catch (error) {
        logger.error({ event: 'SEND_WHATSAPP_MESSAGE_FAILED', error, conversationId });
        throw new Error(`Failed to send WhatsApp message: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. Record audit event
    const messageId = crypto.randomUUID();
    
    try {
        await auditService.recordHandoffEvent({
            conversationId: conversationId,
            eventType: HandoffEventType.HUMAN_MESSAGE_SENT,
            actorType: actorType,
            actorId: agentId,
            metadata: { whatsappMessageId, messageId, contentSnippet: content.substring(0, 50) }
        });
    } catch (error) {
        logger.error({ event: 'RECORD_AUDIT_EVENT_FAILED', error, conversationId });
        // Non-blocking error
    }

    logger.info({ event: 'SEND_HUMAN_MESSAGE_SUCCESS', conversationId, whatsappMessageId, messageId });
    
    return {
        messageId,
        whatsappMessageId
    };
}

export async function storeCustomerMessageInHumanMode(
    conversationId: string,
    assignedAgentId: string | null
): Promise<void> {
    logger.info({ event: 'STORE_CUSTOMER_MESSAGE_HUMAN_MODE_INIT', conversationId, assignedAgentId });

    try {
        await auditService.recordHandoffEvent({
            conversationId: conversationId,
            eventType: HandoffEventType.CUSTOMER_MESSAGE_IN_HUMAN_MODE,
            actorType: ActorType.SYSTEM,
            actorId: 'SYSTEM',
            metadata: { assignedAgentId }
        });
        logger.info({ event: 'STORE_CUSTOMER_MESSAGE_HUMAN_MODE_SUCCESS', conversationId });
    } catch (error) {
        logger.error({ event: 'STORE_CUSTOMER_MESSAGE_HUMAN_MODE_FAILED', error, conversationId });
        throw new Error(`Failed to store customer message in human mode: ${error instanceof Error ? error.message : String(error)}`);
    }
}
