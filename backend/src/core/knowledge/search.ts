import { supabase } from '../../config/supabase.js';
import { logger } from '../../app.js';
import { generateEmbedding } from '../ai/llm_service.js';

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  chunk_text: string;
  similarity: number;
  source_name: string;
  source_type: string;
}

export async function searchKnowledge(
  query: string,
  agentId?: string,
  matchThreshold: number = 0.5,
  matchCount: number = 5
): Promise<SearchResult[]> {
  logger.info({ event: 'knowledge_search_started', query, agent_id: agentId });
  
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      logger.error({ event: 'knowledge_search_failed', reason: 'embedding_failed' }, 'Failed to generate embedding for query');
      return [];
    }

    // Format embedding array to string for pgvector '[0.1, 0.2, ...]'
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: embeddingStr,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_agent_id: agentId || null
    });

    if (error) {
      logger.error({ event: 'knowledge_search_failed', err: error }, 'Vector search RPC failed');
      return [];
    }
    
    logger.info({ 
        event: 'knowledge_search_completed', 
        query, 
        agent_id: agentId, 
        result_count: data?.length || 0 
    });

    return data as SearchResult[];
  } catch (err) {
    logger.error({ event: 'knowledge_search_failed', err }, 'Exception during knowledge search');
    return [];
  }
}
