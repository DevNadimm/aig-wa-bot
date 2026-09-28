// ============================================================
// Phase 6: Conversation Ownership Engine
// Atomic ownership operations with CAS guards
// ============================================================

import { supabase } from '../../config/supabase.js';
import pino from 'pino';
import {
  type ConversationState,
  type ActorType,
  type HandoffReason,
  type OwnershipTransition,
  type HandoffAuditEvent,
  ConversationState as CS,
  HandoffEventType,
  ConcurrentStateConflict,
  OwnershipViolation,
  AuthorizationError,
} from '../../types/handoff.types.js';
import { auditService } from './audit.service.js';
import { authorizeOwnershipAction } from './authorization.guard.js';

const logger = pino({ name: 'ownership-service' });

// ── Assign Conversation to Agent ────────────────────────────

/**
 * Assigns a conversation to a human agent.
 * Atomically transitions state to HUMAN_ACTIVE.
 * Only succeeds if conversation is in WAITING_HUMAN or AI_ACTIVE state.
 */
export async function assignConversation(
  conversationId: string,
  agentId: string,
  teamId: string | null,
  assignedBy: string,
  assignerType: ActorType,
  reason: HandoffReason,
): Promise<OwnershipTransition> {
  // Authorize: only ADMIN or SYSTEM can assign
  if (assignerType === 'AGENT') {
    throw new AuthorizationError('Agents cannot assign conversations. Only ADMIN or SYSTEM can assign.');
  }

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id, assigned_team_id')
    .eq('id', conversationId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const previousState = current.state as ConversationState;
  const previousOwnerId = current.assigned_agent_id;
  const previousTeamId = current.assigned_team_id;

  // Atomic CAS: only assign if in valid source state
  const validSourceStates = [CS.AI_ACTIVE, CS.WAITING_INPUT, CS.WAITING_HUMAN];
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({
      state: CS.HUMAN_ACTIVE,
      assigned_agent_id: agentId,
      assigned_team_id: teamId,
      assigned_at: new Date().toISOString(),
      assigned_by: assignedBy,
      handoff_reason: reason,
      timeout_at: null,
      timeout_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .in('state', validSourceStates)
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error({ event: 'assignment_db_error', conversationId, error: updateError.message });
    throw new Error(`Database error during assignment: ${updateError.message}`);
  }

  if (!updated) {
    logger.warn({
      event: 'assignment_conflict',
      conversationId,
      currentState: previousState,
    });
    throw new ConcurrentStateConflict(
      `Cannot assign: conversation ${conversationId} is in state ${previousState} (expected one of ${validSourceStates.join(', ')})`
    );
  }

  const transition: OwnershipTransition = {
    success: true,
    conversationId,
    previousState,
    newState: CS.HUMAN_ACTIVE,
    previousOwnerId,
    newOwnerId: agentId,
    previousTeamId,
    newTeamId: teamId,
  };

  // Record audit event
  await auditService.recordHandoffEvent({
    conversationId,
    eventType: assignerType === 'ADMIN' ? HandoffEventType.ADMIN_ASSIGNED : HandoffEventType.AI_ASSIGNED,
    actorId: assignedBy,
    actorType: assignerType,
    previousOwner: previousOwnerId,
    newOwner: agentId,
    previousState,
    newState: CS.HUMAN_ACTIVE,
    reason,
  });

  logger.info({
    event: 'assignment_success',
    conversationId,
    agentId,
    teamId,
    assignedBy,
    reason,
    previousState,
  });

  return transition;
}


// ── Admin Takeover ──────────────────────────────────────────

/**
 * Admin forcibly takes over a conversation.
 * Works from ANY state. Replaces current owner atomically.
 */
export async function adminTakeover(
  conversationId: string,
  adminAgentId: string,
): Promise<OwnershipTransition> {
  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id, assigned_team_id')
    .eq('id', conversationId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const previousState = current.state as ConversationState;
  const previousOwnerId = current.assigned_agent_id;
  const previousTeamId = current.assigned_team_id;

  // Admin takeover is unconditional — no state check
  // But use CAS on current state to detect concurrent changes
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({
      state: CS.HUMAN_ACTIVE,
      assigned_agent_id: adminAgentId,
      assigned_at: new Date().toISOString(),
      assigned_by: adminAgentId,
      handoff_reason: 'ADMIN_REQUESTED',
      timeout_at: null,
      timeout_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('state', previousState) // CAS: ensure state hasn't changed concurrently
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error({ event: 'admin_takeover_db_error', conversationId, error: updateError.message });
    throw new Error(`Database error during admin takeover: ${updateError.message}`);
  }

  if (!updated) {
    // Retry with fresh state (state changed concurrently, re-attempt)
    const { data: retryUpdated } = await supabase
      .from('conversations')
      .update({
        state: CS.HUMAN_ACTIVE,
        assigned_agent_id: adminAgentId,
        assigned_at: new Date().toISOString(),
        assigned_by: adminAgentId,
        handoff_reason: 'ADMIN_REQUESTED',
        timeout_at: null,
        timeout_action: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .neq('state', CS.CLOSED) // Don't take over closed conversations
      .select('id')
      .maybeSingle();

    if (!retryUpdated) {
      throw new ConcurrentStateConflict('Admin takeover failed: conversation may be closed or deleted');
    }
  }

  const transition: OwnershipTransition = {
    success: true,
    conversationId,
    previousState,
    newState: CS.HUMAN_ACTIVE,
    previousOwnerId,
    newOwnerId: adminAgentId,
    previousTeamId,
    newTeamId: previousTeamId,
  };

  await auditService.recordHandoffEvent({
    conversationId,
    eventType: HandoffEventType.ADMIN_TAKEOVER,
    actorId: adminAgentId,
    actorType: 'ADMIN',
    previousOwner: previousOwnerId,
    newOwner: adminAgentId,
    previousState,
    newState: CS.HUMAN_ACTIVE,
    reason: 'ADMIN_REQUESTED',
  });

  logger.info({
    event: 'admin_takeover_success',
    conversationId,
    adminAgentId,
    previousOwner: previousOwnerId,
    previousState,
  });

  return transition;
}


// ── Transfer Conversation ───────────────────────────────────

/**
 * Transfers conversation from one agent to another.
 * Atomic: current owner loses access, new owner gains it.
 */
export async function transferConversation(
  conversationId: string,
  actorId: string,
  actorType: ActorType,
  newAgentId: string,
  newTeamId?: string | null,
): Promise<OwnershipTransition> {
  // Authorize
  await authorizeOwnershipAction('transfer', conversationId, actorId, actorType);

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id, assigned_team_id')
    .eq('id', conversationId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  if (current.state !== CS.HUMAN_ACTIVE) {
    throw new ConcurrentStateConflict(
      `Cannot transfer: conversation is in state ${current.state}, expected HUMAN_ACTIVE`
    );
  }

  const previousOwnerId = current.assigned_agent_id;
  const previousTeamId = current.assigned_team_id;

  // Cannot transfer to same agent
  if (previousOwnerId === newAgentId) {
    logger.warn({ event: 'transfer_same_agent', conversationId, agentId: newAgentId });
    return {
      success: true, // Idempotent: already assigned to this agent
      conversationId,
      previousState: CS.HUMAN_ACTIVE,
      newState: CS.HUMAN_ACTIVE,
      previousOwnerId,
      newOwnerId: newAgentId,
      previousTeamId,
      newTeamId: newTeamId ?? previousTeamId,
    };
  }

  // Atomic CAS: ensure current owner hasn't changed
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({
      assigned_agent_id: newAgentId,
      assigned_team_id: newTeamId ?? previousTeamId,
      assigned_at: new Date().toISOString(),
      assigned_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('state', CS.HUMAN_ACTIVE)
    .eq('assigned_agent_id', previousOwnerId) // CAS: ensure owner hasn't changed
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error({ event: 'transfer_db_error', conversationId, error: updateError.message });
    throw new Error(`Database error during transfer: ${updateError.message}`);
  }

  if (!updated) {
    throw new ConcurrentStateConflict(
      'Transfer failed: conversation ownership changed during operation'
    );
  }

  const transition: OwnershipTransition = {
    success: true,
    conversationId,
    previousState: CS.HUMAN_ACTIVE,
    newState: CS.HUMAN_ACTIVE,
    previousOwnerId,
    newOwnerId: newAgentId,
    previousTeamId,
    newTeamId: newTeamId ?? previousTeamId,
  };

  await auditService.recordHandoffEvent({
    conversationId,
    eventType: HandoffEventType.AGENT_TRANSFERRED,
    actorId,
    actorType,
    previousOwner: previousOwnerId,
    newOwner: newAgentId,
    previousState: CS.HUMAN_ACTIVE,
    newState: CS.HUMAN_ACTIVE,
    reason: `Transfer by ${actorType}`,
  });

  logger.info({
    event: 'transfer_success',
    conversationId,
    from: previousOwnerId,
    to: newAgentId,
    actor: actorId,
  });

  return transition;
}


// ── Release to AI ───────────────────────────────────────────

/**
 * Releases conversation from human control back to AI.
 * Clears assignment, transitions to AI_ACTIVE.
 */
export async function releaseToAI(
  conversationId: string,
  actorId: string,
  actorType: ActorType,
): Promise<OwnershipTransition> {
  // Authorize
  await authorizeOwnershipAction('release', conversationId, actorId, actorType);

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id, assigned_team_id, assigned_at')
    .eq('id', conversationId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const previousState = current.state as ConversationState;
  const previousOwnerId = current.assigned_agent_id;
  const previousTeamId = current.assigned_team_id;

  if (previousState !== CS.HUMAN_ACTIVE && previousState !== CS.WAITING_HUMAN) {
    // Idempotent: already in AI mode
    if (previousState === CS.AI_ACTIVE || previousState === CS.WAITING_INPUT) {
      logger.info({ event: 'release_already_ai', conversationId });
      return {
        success: true,
        conversationId,
        previousState,
        newState: previousState,
        previousOwnerId,
        newOwnerId: null,
        previousTeamId,
        newTeamId: null,
      };
    }
    throw new ConcurrentStateConflict(
      `Cannot release: conversation is in state ${previousState}`
    );
  }

  // Atomic CAS: release only if state and owner match
  const casConditions = actorType === 'ADMIN'
    ? { state: previousState }
    : { state: previousState, assigned_agent_id: actorId };

  let query = supabase
    .from('conversations')
    .update({
      state: CS.AI_ACTIVE,
      assigned_agent_id: null,
      assigned_team_id: null,
      assigned_at: null,
      assigned_by: null,
      handoff_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('state', previousState);

  // Agent must also match ownership
  if (actorType !== 'ADMIN' && previousOwnerId) {
    query = query.eq('assigned_agent_id', actorId);
  }

  const { data: updated, error: updateError } = await query
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error({ event: 'release_db_error', conversationId, error: updateError.message });
    throw new Error(`Database error during release: ${updateError.message}`);
  }

  if (!updated) {
    throw new ConcurrentStateConflict(
      'Release failed: conversation state or ownership changed during operation'
    );
  }

  const transition: OwnershipTransition = {
    success: true,
    conversationId,
    previousState,
    newState: CS.AI_ACTIVE,
    previousOwnerId,
    newOwnerId: null,
    previousTeamId,
    newTeamId: null,
  };

  const eventType = actorType === 'ADMIN'
    ? HandoffEventType.ADMIN_RELEASED_TO_AI
    : HandoffEventType.AGENT_RELEASED_TO_AI;

  await auditService.recordHandoffEvent({
    conversationId,
    eventType,
    actorId,
    actorType,
    previousOwner: previousOwnerId,
    newOwner: null,
    previousState,
    newState: CS.AI_ACTIVE,
    reason: `Released by ${actorType}`,
  });

  logger.info({
    event: 'release_to_ai_success',
    conversationId,
    actor: actorId,
    actorType,
    previousOwner: previousOwnerId,
  });

  return transition;
}


// ── Resolve / Close Conversation ────────────────────────────

/**
 * Closes/resolves a conversation.
 */
export async function resolveConversation(
  conversationId: string,
  actorId: string,
  actorType: ActorType,
): Promise<OwnershipTransition> {
  await authorizeOwnershipAction('resolve', conversationId, actorId, actorType);

  const { data: current } = await supabase
    .from('conversations')
    .select('state, assigned_agent_id, assigned_team_id')
    .eq('id', conversationId)
    .single();

  if (!current) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const previousState = current.state as ConversationState;

  if (previousState === CS.CLOSED) {
    return {
      success: true,
      conversationId,
      previousState,
      newState: CS.CLOSED,
      previousOwnerId: current.assigned_agent_id,
      newOwnerId: null,
      previousTeamId: current.assigned_team_id,
      newTeamId: null,
    };
  }

  const { data: updated } = await supabase
    .from('conversations')
    .update({
      state: CS.CLOSED,
      assigned_agent_id: null,
      assigned_team_id: null,
      assigned_at: null,
      assigned_by: null,
      timeout_at: null,
      timeout_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('state', previousState)
    .select('id')
    .maybeSingle();

  if (!updated) {
    throw new ConcurrentStateConflict('Resolve failed: state changed concurrently');
  }

  await auditService.recordHandoffEvent({
    conversationId,
    eventType: HandoffEventType.CONVERSATION_RESOLVED,
    actorId,
    actorType,
    previousState,
    newState: CS.CLOSED,
    previousOwner: current.assigned_agent_id,
    newOwner: null,
  });

  logger.info({ event: 'conversation_resolved', conversationId, actor: actorId });

  return {
    success: true,
    conversationId,
    previousState,
    newState: CS.CLOSED,
    previousOwnerId: current.assigned_agent_id,
    newOwnerId: null,
    previousTeamId: current.assigned_team_id,
    newTeamId: null,
  };
}


// ── Reopen Conversation ─────────────────────────────────────

/**
 * Reopens a closed conversation back to AI_ACTIVE.
 */
export async function reopenConversation(
  conversationId: string,
  actorId: string,
  actorType: ActorType,
): Promise<OwnershipTransition> {
  const { data: updated } = await supabase
    .from('conversations')
    .update({
      state: CS.AI_ACTIVE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('state', CS.CLOSED)
    .select('id')
    .maybeSingle();

  if (!updated) {
    throw new ConcurrentStateConflict('Reopen failed: conversation is not in CLOSED state');
  }

  await auditService.recordHandoffEvent({
    conversationId,
    eventType: HandoffEventType.CONVERSATION_REOPENED,
    actorId,
    actorType,
    previousState: CS.CLOSED,
    newState: CS.AI_ACTIVE,
  });

  logger.info({ event: 'conversation_reopened', conversationId, actor: actorId });

  return {
    success: true,
    conversationId,
    previousState: CS.CLOSED,
    newState: CS.AI_ACTIVE,
    previousOwnerId: null,
    newOwnerId: null,
    previousTeamId: null,
    newTeamId: null,
  };
}
