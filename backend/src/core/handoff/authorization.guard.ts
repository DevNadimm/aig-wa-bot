import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import { ActorType, ConversationState, AuthorizationError, OwnershipViolation } from '../../types/handoff.types.js';

const logger = pino({ name: 'authorization-guard' });

export async function authorizeHumanReply(conversationId: string, actorId: string, actorType: ActorType): Promise<void> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id')
    .eq('id', conversationId)
    .single();

  if (error) {
    logger.error({ event: 'AUTHORIZE_REPLY_FETCH_ERROR', error, conversationId }, 'Failed to fetch conversation for authorization');
    throw error;
  }

  if (conversation.state !== 'HUMAN_ACTIVE') {
    throw new AuthorizationError('Conversation is not in human mode');
  }

  if (actorType === 'ADMIN') {
    return; // allow
  }

  if (actorType === 'AGENT') {
    if (conversation.assigned_agent_id !== actorId) {
      throw new OwnershipViolation('You are not the assigned agent');
    }
    return; // allow
  }

  throw new AuthorizationError('Unauthorized actor type');
}

export async function authorizeOwnershipAction(action: string, conversationId: string, actorId: string, actorType: ActorType): Promise<void> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('assigned_agent_id')
    .eq('id', conversationId)
    .single();

  if (error) {
    logger.error({ event: 'AUTHORIZE_OWNERSHIP_FETCH_ERROR', error, conversationId }, 'Failed to fetch conversation for ownership authorization');
    throw error;
  }

  if (action === 'assign' || action === 'takeover') {
    if (actorType !== 'ADMIN') {
      throw new AuthorizationError(`Only ADMIN can perform action: ${action}`);
    }
    return;
  }

  if (action === 'transfer' || action === 'release' || action === 'resolve') {
    if (actorType === 'ADMIN') {
      return;
    }

    if (actorType === 'AGENT') {
      if (conversation.assigned_agent_id !== actorId) {
        throw new OwnershipViolation(`You must be the assigned agent to ${action} the conversation`);
      }
      return;
    }
  }

  throw new AuthorizationError(`Unauthorized action or actor type: ${action}`);
}
