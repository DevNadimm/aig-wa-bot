import { supabase } from '../../config/supabase.js';
import pino from 'pino';

const logger = pino({ name: 'context-builder-service' });

export class ContextBuilderService {
  /**
   * Builds a text summary of the human agent session
   */
  public async buildHandoffContext(conversationId: string, assignedAt?: string): Promise<string> {
    try {
      logger.info({ conversationId, assignedAt }, 'Building handoff context');

      let query = supabase
        .from('conversation_messages')
        .select('created_at, sender_type, content')
        .eq('conversation_id', conversationId)
        .in('sender_type', ['HUMAN', 'CUSTOMER'])
        .order('created_at', { ascending: true });

      if (assignedAt) {
        query = query.gte('created_at', assignedAt);
      } else {
        query = query.limit(20); // If no assignedAt, get last 20 matching messages
      }

      const { data: messages, error } = await query;

      if (error) {
        logger.error({ error }, 'Error fetching conversation messages for context');
        throw error;
      }

      if (!messages || messages.length === 0) {
        return '=== Human Agent Session Summary ===\nNo messages found during the session.\n=== End Summary ===';
      }

      // Build summary string
      let summary = '=== Human Agent Session Summary ===\n';
      for (const msg of messages) {
        const timestamp = new Date(msg.created_at).toISOString().substring(11, 19); // e.g. HH:MM:SS
        const sender = msg.sender_type === 'HUMAN' ? 'Agent' : 'Customer';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        summary += `[${timestamp}] ${sender}: ${content}\n`;
      }
      summary += '=== End Summary ===';

      return summary;
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to build handoff context');
      throw error;
    }
  }

  /**
   * Stores the handoff summary into conversation_variables
   */
  public async storeHandoffSummary(conversationId: string, summary: string): Promise<void> {
    try {
      logger.info({ conversationId }, 'Storing handoff summary');

      const { error } = await supabase
        .from('conversation_variables')
        .upsert(
          {
            conversation_id: conversationId,
            key: '_human_session_summary',
            value: JSON.stringify(summary),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'conversation_id, key' }
        );

      if (error) {
        logger.error({ error }, 'Error upserting handoff summary');
        throw error;
      }
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to store handoff summary');
      throw error;
    }
  }

  /**
   * Retrieves the stored handoff summary
   */
  public async getHandoffSummary(conversationId: string): Promise<string | null> {
    try {
      logger.info({ conversationId }, 'Retrieving handoff summary');

      const { data, error } = await supabase
        .from('conversation_variables')
        .select('value')
        .eq('conversation_id', conversationId)
        .eq('key', '_human_session_summary')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        logger.error({ error }, 'Error fetching handoff summary');
        throw error;
      }

      if (data && data.value) {
        try {
          // If stored as JSON string via JSON.stringify(summary)
          return JSON.parse(data.value);
        } catch (e) {
          return String(data.value);
        }
      }

      return null;
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to retrieve handoff summary');
      throw error;
    }
  }
}

export const contextBuilderService = new ContextBuilderService();
