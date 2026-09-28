import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import { AgentTeamRecord, HumanAgentRecord } from '../../types/handoff.types.js';

const logger = pino({ name: 'team-service' });

export async function createTeam(data: { organizationId: string; name: string; description?: string }): Promise<AgentTeamRecord> {
  const { data: team, error } = await supabase
    .from('agent_teams')
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      description: data.description,
    })
    .select('*')
    .single();

  if (error) {
    logger.error({ event: 'CREATE_TEAM_ERROR', error, data }, 'Failed to create team');
    throw error;
  }
  
  return team;
}

export async function updateTeam(teamId: string, data: Partial<{ name: string; description: string }>): Promise<AgentTeamRecord> {
  const { data: team, error } = await supabase
    .from('agent_teams')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    })
    .eq('id', teamId)
    .select('*')
    .single();

  if (error) {
    logger.error({ event: 'UPDATE_TEAM_ERROR', error, teamId, data }, 'Failed to update team');
    throw error;
  }
  
  return team;
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  const { error } = await supabase
    .from('agent_teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    logger.error({ event: 'DELETE_TEAM_ERROR', error, teamId }, 'Failed to delete team');
    throw error;
  }
  
  return true;
}

export async function getTeamById(teamId: string): Promise<AgentTeamRecord | null> {
  const { data: team, error } = await supabase
    .from('agent_teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error({ event: 'GET_TEAM_BY_ID_ERROR', error, teamId }, 'Failed to get team by id');
    throw error;
  }
  
  return team || null;
}

export async function getTeamByName(name: string, organizationId: string): Promise<AgentTeamRecord | null> {
  const { data: team, error } = await supabase
    .from('agent_teams')
    .select('*')
    .eq('name', name)
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error({ event: 'GET_TEAM_BY_NAME_ERROR', error, name, organizationId }, 'Failed to get team by name');
    throw error;
  }
  
  return team || null;
}

export async function listTeams(organizationId: string): Promise<AgentTeamRecord[]> {
  const { data: teams, error } = await supabase
    .from('agent_teams')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    logger.error({ event: 'LIST_TEAMS_ERROR', error, organizationId }, 'Failed to list teams');
    throw error;
  }
  
  return teams || [];
}

export async function getTeamAgents(teamId: string, onlineOnly?: boolean): Promise<HumanAgentRecord[]> {
  let query = supabase
    .from('human_agents')
    .select('*, human_agent_teams!inner(team_id)')
    .eq('human_agent_teams.team_id', teamId);
    
  if (onlineOnly) {
    query = query
      .eq('status', 'ACTIVE')
      .eq('availability', 'ONLINE')
      .eq('accepting_conversations', true);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ event: 'GET_TEAM_AGENTS_ERROR', error, teamId, onlineOnly }, 'Failed to get team agents');
    throw error;
  }

  return (data || []).map((agent: any) => {
    const { human_agent_teams, ...agentData } = agent;
    return agentData;
  }) as HumanAgentRecord[];
}

export async function addAgentToTeam(agentId: string, teamId: string): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from('human_agent_teams')
    .select('*')
    .eq('agent_id', agentId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (checkError) {
    logger.error({ event: 'ADD_AGENT_TEAM_CHECK_ERROR', error: checkError, agentId, teamId }, 'Error checking existing agent team mapping');
    throw checkError;
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from('human_agent_teams')
      .insert({
        agent_id: agentId,
        team_id: teamId,
      });

    if (insertError) {
      logger.error({ event: 'ADD_AGENT_TO_TEAM_ERROR', error: insertError, agentId, teamId }, 'Failed to add agent to team');
      throw insertError;
    }
  }
}

export async function removeAgentFromTeam(agentId: string, teamId: string): Promise<void> {
  const { error } = await supabase
    .from('human_agent_teams')
    .delete()
    .eq('agent_id', agentId)
    .eq('team_id', teamId);

  if (error) {
    logger.error({ event: 'REMOVE_AGENT_FROM_TEAM_ERROR', error, agentId, teamId }, 'Failed to remove agent from team');
    throw error;
  }
}
