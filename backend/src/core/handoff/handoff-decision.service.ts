import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import { agentResolverService } from './agent-resolver.service.js';
import {
  HandoffRequest,
  HandoffDecision,
  HandoffReason,
  VALID_HANDOFF_REASONS,
  AgentResolutionResult
} from '../../types/handoff.types.js';

const logger = pino({ name: 'handoff-decision.service' });

/**
 * Checks if customer message explicitly requests human support.
 */
export const detectCustomerHumanRequest = (message: string): boolean => {
  if (!message) return false;

  const englishPatterns = [
    'talk to human',
    'speak to agent',
    'human agent',
    'real person',
    'connect me with',
    'representative',
    'i need a human',
    'speak to someone',
    'talk to someone'
  ];

  const bengaliPatterns = ['মানুষ', 'এজেন্ট', 'হিউম্যান', 'প্রতিনিধি'];

  const lowerMessage = message.toLowerCase();

  const isEnglishMatch = englishPatterns.some(pattern => lowerMessage.includes(pattern));
  const isBengaliMatch = bengaliPatterns.some(pattern => lowerMessage.includes(pattern));

  return isEnglishMatch || isBengaliMatch;
};

/**
 * AI-FIRST handoff gatekeeper. Validates AI's handoff requests and resolves agents.
 */
export const evaluateHandoffDecision = async (
  aiDecision: HandoffRequest,
  conversationId: string,
  organizationId: string
): Promise<HandoffDecision> => {
  logger.info({ event: 'evaluating_handoff_decision', conversationId, aiDecision });

  // 1. Validate structure
  if (!aiDecision.requires_human) {
    return {
      approved: false,
      reason: aiDecision.reason || 'AI_CANNOT_COMPLETE',
      rejectionReason: 'Handoff not requested by AI',
    };
  }

  // 2. Validate reason
  if (!VALID_HANDOFF_REASONS.includes(aiDecision.reason as HandoffReason)) {
    logger.warn({ event: 'invalid_handoff_reason', conversationId, reason: aiDecision.reason });
    return {
      approved: false,
      reason: 'AI_CANNOT_COMPLETE',
      rejectionReason: 'Invalid handoff reason',
    };
  }

  const reason = aiDecision.reason as HandoffReason;

  // 3 & 4. Immediate approval for customer autonomy or admin authority
  // 5. For other reasons, log the reason at info level and approve
  if (reason !== 'CUSTOMER_REQUESTED_HUMAN' && reason !== 'ADMIN_REQUESTED') {
    logger.info({
      event: 'ai_handoff_reason_logged',
      conversationId,
      reason,
      summary: aiDecision.summary
    });
  }

  // 6. Resolve target team
  let targetTeamId: string | undefined = undefined;
  let targetTeamName: string | undefined = undefined;

  if (aiDecision.required_team) {
    const { data: teamData, error: teamError } = await supabase
      .from('agent_teams')
      .select('id, name')
      .eq('organization_id', organizationId)
      .ilike('name', aiDecision.required_team)
      .single();

    if (!teamError && teamData) {
      targetTeamId = teamData.id;
      targetTeamName = teamData.name;
    } else {
      logger.warn({ event: 'team_not_found', conversationId, requiredTeam: aiDecision.required_team, error: teamError });
    }
  }

  if (!targetTeamId) {
    const { data: rulesData, error: rulesError } = await supabase
      .from('handoff_rules')
      .select('target_team_id, fallback_message')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true)
      .eq('trigger_type', 'REASON') // Defaulting trigger lookup by reason
      .eq('trigger_condition', reason)
      .limit(1)
      .maybeSingle();

    if (!rulesError && rulesData && rulesData.target_team_id) {
      targetTeamId = rulesData.target_team_id;

      const { data: teamInfo } = await supabase
        .from('agent_teams')
        .select('name')
        .eq('id', targetTeamId)
        .single();
      
      if (teamInfo) {
        targetTeamName = teamInfo.name;
      }
    }
  }

  // 7. Call resolveAgent
  const agentResolution: AgentResolutionResult = await agentResolverService.resolveAgent(targetTeamId, organizationId);

  // 8. If agent resolved
  if (agentResolution.resolved && agentResolution.agent) {
    return {
      approved: true,
      reason,
      teamId: targetTeamId,
      teamName: targetTeamName,
      agent: agentResolution.agent
    };
  }

  // 9. If no agent
  let fallbackMessage = 'We are currently transferring you to a human agent. Please hold on.';
  
  const { data: fallbackData } = await supabase
    .from('handoff_rules')
    .select('fallback_message')
    .eq('organization_id', organizationId)
    .eq('is_enabled', true)
    .not('fallback_message', 'is', null)
    .limit(1)
    .maybeSingle();

  if (fallbackData && fallbackData.fallback_message) {
    fallbackMessage = fallbackData.fallback_message;
  }

  return {
    approved: true,
    reason,
    teamId: targetTeamId,
    teamName: targetTeamName,
    queuedMessage: fallbackMessage
  };
};
