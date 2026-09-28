import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import { AgentResolutionResult, AssignmentStrategy, HumanAgentRecord } from '../../types/handoff.types.js';

const logger = pino({ name: 'agent-resolver-service' });

export class AgentResolverService {
  /**
   * Resolves the best available agent for a conversation
   */
  public async resolveAgent(
    teamId?: string,
    organizationId?: string,
    strategy: AssignmentStrategy = 'LEAST_ACTIVE'
  ): Promise<AgentResolutionResult> {
    try {
      logger.info({ teamId, organizationId, strategy }, 'Starting agent resolution');

      let eligibleAgentIds: string[] = [];

      // 1. Get agent IDs from team or org
      if (teamId) {
        const { data: teamData, error: teamError } = await supabase
          .from('human_agent_teams')
          .select('agent_id')
          .eq('team_id', teamId);

        if (teamError) {
          logger.error({ error: teamError }, 'Error fetching agents from team');
          throw teamError;
        }
        eligibleAgentIds = teamData?.map((row) => row.agent_id) || [];
      } else if (organizationId) {
        const { data: orgData, error: orgError } = await supabase
          .from('human_agents')
          .select('id')
          .eq('organization_id', organizationId);
          
        if (orgError) {
          logger.error({ error: orgError }, 'Error fetching agents from org');
          throw orgError;
        }
        eligibleAgentIds = orgData?.map((row) => row.id) || [];
      } else {
        logger.warn('No teamId or organizationId provided for agent resolution');
        return { resolved: false, fallback: 'QUEUE' };
      }

      if (eligibleAgentIds.length === 0) {
        logger.info('No agents found in team/org');
        return { resolved: false, fallback: 'QUEUE' };
      }

      // 2. Filter by status, availability, and accepting_conversations
      const { data: agents, error: agentsError } = await supabase
        .from('human_agents')
        .select('*')
        .in('id', eligibleAgentIds)
        .eq('status', 'ACTIVE')
        .eq('accepting_conversations', true)
        .eq('availability', 'ONLINE');

      if (agentsError) {
        logger.error({ error: agentsError }, 'Error fetching active agents');
        throw agentsError;
      }

      const activeAgents = agents as HumanAgentRecord[] | null;

      if (!activeAgents || activeAgents.length === 0) {
        logger.info('No active/online agents found');
        return { resolved: false, fallback: 'QUEUE' };
      }

      // 3. Check active conversation counts for each agent
      const candidates = [];

      for (const agent of activeAgents) {
        const { count, error: countError } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_agent_id', agent.id)
          .eq('state', 'HUMAN_ACTIVE');

        if (countError) {
          logger.error({ error: countError, agentId: agent.id }, 'Error fetching agent conversation count');
          continue;
        }

        const activeCount = count || 0;
        const maxConcurrent = agent.max_concurrent_conversations || 0;

        if (activeCount < maxConcurrent) {
          candidates.push({ agent, activeCount });
        }
      }

      if (candidates.length === 0) {
        logger.info('All agents are at maximum capacity');
        return { resolved: false, fallback: 'QUEUE' };
      }

      // 4. Apply strategy (LEAST_ACTIVE or ROUND_ROBIN)
      candidates.sort((a, b) => a.activeCount - b.activeCount);
      const selectedCandidate = candidates[0];

      logger.info(
        { agentId: selectedCandidate.agent.id, activeCount: selectedCandidate.activeCount },
        'Agent successfully resolved'
      );

      return { resolved: true, agent: selectedCandidate.agent };
    } catch (error) {
      logger.error({ error }, 'Failed to resolve agent');
      return { resolved: false, fallback: 'QUEUE' };
    }
  }
}

export const agentResolverService = new AgentResolverService();
