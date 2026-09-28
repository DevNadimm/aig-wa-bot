import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import { HandoffAuditEvent, HandoffEventType } from '../../types/handoff.types.js';

const logger = pino({ name: 'audit-service' });

export class AuditService {
  async recordHandoffEvent(event: HandoffAuditEvent): Promise<void> {
    try {
      const {
        conversationId,
        eventType,
        actorId,
        actorType,
        previousOwner,
        newOwner,
        previousState,
        newState,
        reason,
        metadata,
      } = event;

      const eventData = {
        actor_id: actorId,
        actor_type: actorType,
        previous_owner: previousOwner,
        new_owner: newOwner,
        previous_state: previousState,
        new_state: newState,
        reason,
        metadata,
      };

      const { error } = await supabase
        .from('conversation_events')
        .insert({
          conversation_id: conversationId,
          event_type: eventType,
          actor_id: actorId,
          actor_type: actorType,
          event_data: eventData,
        });

      if (error) {
        logger.error({ error, event }, 'Failed to record handoff event in Supabase');
        throw error;
      }

      logger.info(
        {
          event_type: eventType,
          conversation_id: conversationId,
          actor_id: actorId,
          actor_type: actorType,
        },
        'Handoff event recorded'
      );
    } catch (err) {
      logger.error({ err, event }, 'Exception in recordHandoffEvent');
      throw err;
    }
  }
}

export const auditService = new AuditService();
