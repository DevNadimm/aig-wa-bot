import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import {
  HumanAgentRecord,
  AgentAvailability,
  AgentStatus,
} from '../../types/handoff.types.js';

const logger = pino({ name: 'agent-management-service' });

export class AgentManagementService {
  async createHumanAgent(data: {
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    authUserId?: string;
    teamIds?: string[];
  }): Promise<HumanAgentRecord> {
    const { organizationId, name, email, phone, role, authUserId, teamIds } = data;

    const { data: agentData, error } = await supabase
      .from('human_agents')
      .insert({
        organization_id: organizationId,
        name,
        email,
        phone,
        role,
        auth_user_id: authUserId,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, data }, 'Failed to create human agent');
      throw error;
    }

    const agent = agentData as HumanAgentRecord;
    logger.info({ agentId: agent.id }, 'Human agent created');

    if (teamIds && teamIds.length > 0) {
      const teamInsertData = teamIds.map((teamId) => ({
        agent_id: agent.id,
        team_id: teamId,
      }));

      const { error: teamError } = await supabase
        .from('human_agent_teams')
        .insert(teamInsertData);

      if (teamError) {
        logger.error(
          { error: teamError, agentId: agent.id, teamIds },
          'Failed to assign teams to newly created human agent'
        );
        throw teamError;
      }
      logger.info({ agentId: agent.id, teamIds }, 'Teams assigned to new agent');
    }

    return agent;
  }

  async updateHumanAgent(
    agentId: string,
    data: Partial<{ name: string; email: string; phone: string; role: string }>
  ): Promise<HumanAgentRecord> {
    const { data: agentData, error } = await supabase
      .from('human_agents')
      .update(data)
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      logger.error({ error, agentId, data }, 'Failed to update human agent');
      throw error;
    }

    logger.info({ agentId }, 'Human agent updated');
    return agentData as HumanAgentRecord;
  }

  async deactivateHumanAgent(agentId: string): Promise<void> {
    const { error } = await supabase
      .from('human_agents')
      .update({
        status: 'INACTIVE',
        accepting_conversations: false,
      })
      .eq('id', agentId);

    if (error) {
      logger.error({ error, agentId }, 'Failed to deactivate human agent');
      throw error;
    }

    logger.info({ agentId }, 'Human agent deactivated');
  }

  async activateHumanAgent(agentId: string): Promise<void> {
    const { error } = await supabase
      .from('human_agents')
      .update({
        status: 'ACTIVE',
      })
      .eq('id', agentId);

    if (error) {
      logger.error({ error, agentId }, 'Failed to activate human agent');
      throw error;
    }

    logger.info({ agentId }, 'Human agent activated');
  }

  async setAgentAvailability(
    agentId: string,
    availability: AgentAvailability
  ): Promise<void> {
    const { error } = await supabase
      .from('human_agents')
      .update({ availability })
      .eq('id', agentId);

    if (error) {
      logger.error(
        { error, agentId, availability },
        'Failed to set agent availability'
      );
      throw error;
    }
  }

  async setAcceptingConversations(
    agentId: string,
    accepting: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('human_agents')
      .update({ accepting_conversations: accepting })
      .eq('id', agentId);

    if (error) {
      logger.error(
        { error, agentId, accepting },
        'Failed to set accepting conversations flag'
      );
      throw error;
    }
  }

  async getAgentByAuthUserId(authUserId: string): Promise<HumanAgentRecord | null> {
    const { data, error } = await supabase
      .from('human_agents')
      .select()
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      logger.error({ error, authUserId }, 'Failed to get agent by auth user id');
      throw error;
    }

    return data as HumanAgentRecord | null;
  }

  async getAgentById(agentId: string): Promise<HumanAgentRecord | null> {
    const { data, error } = await supabase
      .from('human_agents')
      .select()
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      logger.error({ error, agentId }, 'Failed to get agent by id');
      throw error;
    }

    return data as HumanAgentRecord | null;
  }

  async listAgents(
    organizationId: string,
    filters?: { teamId?: string; status?: string; availability?: string }
  ): Promise<HumanAgentRecord[]> {
    let query: any = supabase
      .from('human_agents')
      .select(filters?.teamId ? '*, human_agent_teams!inner(*)' : '*')
      .eq('organization_id', organizationId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.availability) {
      query = query.eq('availability', filters.availability);
    }
    if (filters?.teamId) {
      query = query.eq('human_agent_teams.team_id', filters.teamId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(
        { error, organizationId, filters },
        'Failed to list agents'
      );
      throw error;
    }

    return data as HumanAgentRecord[];
  }

  async getAgentActiveConversationCount(agentId: string): Promise<number> {
    const { count, error } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .eq('state', 'HUMAN_ACTIVE');

    if (error) {
      logger.error(
        { error, agentId },
        'Failed to count agent active conversations'
      );
      throw error;
    }

    return count ?? 0;
  }

  async assignAgentToTeams(agentId: string, teamIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('human_agent_teams')
      .delete()
      .eq('agent_id', agentId);

    if (deleteError) {
      logger.error(
        { error: deleteError, agentId },
        'Failed to clear agent teams before reassignment'
      );
      throw deleteError;
    }

    if (teamIds.length > 0) {
      const insertData = teamIds.map((teamId) => ({
        agent_id: agentId,
        team_id: teamId,
      }));

      const { error: insertError } = await supabase
        .from('human_agent_teams')
        .insert(insertData);

      if (insertError) {
        logger.error(
          { error: insertError, agentId, teamIds },
          'Failed to assign agent to new teams'
        );
        throw insertError;
      }
    }

    logger.info({ agentId, teamIds }, 'Agent teams updated');
  }
}

export const agentManagementService = new AgentManagementService();
