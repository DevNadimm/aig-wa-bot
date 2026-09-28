// ============================================================
// Phase 6: Handoff System Type Definitions
// Centralized types for the Human Agent & Ownership Engine
// ============================================================

// ── Conversation States ─────────────────────────────────────

export const ConversationState = {
  AI_ACTIVE: 'AI_ACTIVE',
  WAITING_INPUT: 'WAITING_INPUT',
  WAITING_HUMAN: 'WAITING_HUMAN',
  HUMAN_ACTIVE: 'HUMAN_ACTIVE',
  CLOSED: 'CLOSED',
} as const;

export type ConversationState = (typeof ConversationState)[keyof typeof ConversationState];

/** States where AI is in control */
export const AI_CONTROLLED_STATES: ReadonlyArray<ConversationState> = [
  ConversationState.AI_ACTIVE,
  ConversationState.WAITING_INPUT,
] as const;

/** States where human is in control or pending */
export const HUMAN_CONTROLLED_STATES: ReadonlyArray<ConversationState> = [
  ConversationState.WAITING_HUMAN,
  ConversationState.HUMAN_ACTIVE,
] as const;


// ── Sender Types ────────────────────────────────────────────

export const SenderType = {
  CUSTOMER: 'CUSTOMER',
  AI: 'AI',
  HUMAN_AGENT: 'HUMAN_AGENT',
  /** @deprecated Use HUMAN_AGENT for new messages. Kept for backward compat reading legacy data. */
  HUMAN: 'HUMAN',
  SYSTEM: 'SYSTEM',
} as const;

export type SenderType = (typeof SenderType)[keyof typeof SenderType];


// ── Handoff Reasons ─────────────────────────────────────────

export const HandoffReason = {
  /** Customer explicitly asked to talk to a human */
  CUSTOMER_REQUESTED_HUMAN: 'CUSTOMER_REQUESTED_HUMAN',
  /** AI determined it cannot complete the task */
  AI_CANNOT_COMPLETE: 'AI_CANNOT_COMPLETE',
  /** Required capability/tool is not configured */
  REQUIRED_CAPABILITY_MISSING: 'REQUIRED_CAPABILITY_MISSING',
  /** Required tool exists but is unavailable/disabled */
  REQUIRED_TOOL_UNAVAILABLE: 'REQUIRED_TOOL_UNAVAILABLE',
  /** Workflow explicitly requires human step */
  WORKFLOW_REQUIRES_HUMAN: 'WORKFLOW_REQUIRES_HUMAN',
  /** Safety concern requires human intervention */
  SAFETY_REQUIRES_HUMAN: 'SAFETY_REQUIRES_HUMAN',
  /** Admin explicitly requested handoff */
  ADMIN_REQUESTED: 'ADMIN_REQUESTED',
} as const;

export type HandoffReason = (typeof HandoffReason)[keyof typeof HandoffReason];

/** Valid handoff reason values for validation */
export const VALID_HANDOFF_REASONS = Object.values(HandoffReason);


// ── Agent Availability ──────────────────────────────────────

export const AgentAvailability = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  BUSY: 'BUSY',
  AWAY: 'AWAY',
} as const;

export type AgentAvailability = (typeof AgentAvailability)[keyof typeof AgentAvailability];

/** Availability states where agent can receive new conversations */
export const ASSIGNABLE_AVAILABILITY: ReadonlyArray<AgentAvailability> = [
  AgentAvailability.ONLINE,
] as const;


// ── Agent Status ────────────────────────────────────────────

export const AgentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];


// ── Actor Types (who performs actions) ──────────────────────

export const ActorType = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
  AI: 'AI',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];


// ── Assignment Strategy ─────────────────────────────────────

export const AssignmentStrategy = {
  LEAST_ACTIVE: 'LEAST_ACTIVE',
  ROUND_ROBIN: 'ROUND_ROBIN',
  PRIORITY: 'PRIORITY',
} as const;

export type AssignmentStrategy = (typeof AssignmentStrategy)[keyof typeof AssignmentStrategy];


// ── Handoff Event Types (Audit Trail) ───────────────────────

export const HandoffEventType = {
  AI_HANDOFF_REQUESTED: 'AI_HANDOFF_REQUESTED',
  AI_ASSIGNED: 'AI_ASSIGNED',
  ADMIN_ASSIGNED: 'ADMIN_ASSIGNED',
  ADMIN_TAKEOVER: 'ADMIN_TAKEOVER',
  AGENT_ACCEPTED: 'AGENT_ACCEPTED',
  AGENT_TRANSFERRED: 'AGENT_TRANSFERRED',
  AGENT_RELEASED_TO_AI: 'AGENT_RELEASED_TO_AI',
  ADMIN_RELEASED_TO_AI: 'ADMIN_RELEASED_TO_AI',
  HUMAN_MESSAGE_SENT: 'HUMAN_MESSAGE_SENT',
  CONVERSATION_RESOLVED: 'CONVERSATION_RESOLVED',
  CONVERSATION_REOPENED: 'CONVERSATION_REOPENED',
  CUSTOMER_MESSAGE_IN_HUMAN_MODE: 'CUSTOMER_MESSAGE_IN_HUMAN_MODE',
  NO_AGENT_AVAILABLE: 'NO_AGENT_AVAILABLE',
  HANDOFF_REJECTED: 'HANDOFF_REJECTED',
} as const;

export type HandoffEventType = (typeof HandoffEventType)[keyof typeof HandoffEventType];


// ── Data Interfaces ─────────────────────────────────────────

/** AI's structured handoff request (output from AI, validated by backend) */
export interface HandoffRequest {
  requires_human: boolean;
  reason: HandoffReason;
  required_team?: string;
  summary?: string;
}

/** Result of agent resolution */
export interface AgentResolutionResult {
  resolved: boolean;
  agent?: HumanAgentRecord;
  team?: AgentTeamRecord;
  fallback?: 'QUEUE' | 'FALLBACK_TEAM' | 'NOTIFY_ADMIN';
  fallbackMessage?: string;
}

/** Ownership transition result from atomic operations */
export interface OwnershipTransition {
  success: boolean;
  conversationId: string;
  previousState: ConversationState;
  newState: ConversationState;
  previousOwnerId: string | null;
  newOwnerId: string | null;
  previousTeamId: string | null;
  newTeamId: string | null;
}

/** Handoff decision evaluation result */
export interface HandoffDecision {
  approved: boolean;
  reason: HandoffReason;
  teamId?: string;
  teamName?: string;
  agent?: HumanAgentRecord;
  queuedMessage?: string;
  rejectionReason?: string;
}

/** Actor context attached to authenticated requests */
export interface ActorContext {
  id: string;
  type: ActorType;
  agentId?: string;
  organizationId: string;
  email?: string;
  name?: string;
}

/** Handoff audit event data */
export interface HandoffAuditEvent {
  conversationId: string;
  eventType: HandoffEventType;
  actorId?: string;
  actorType: ActorType;
  previousOwner?: string | null;
  newOwner?: string | null;
  previousState?: ConversationState;
  newState?: ConversationState;
  reason?: string;
  metadata?: Record<string, unknown>;
}


// ── Database Record Types ───────────────────────────────────

export interface HumanAgentRecord {
  id: string;
  organization_id: string;
  team_id: string | null;
  auth_user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  status: AgentStatus;
  availability: AgentAvailability;
  accepting_conversations: boolean;
  max_concurrent_conversations: number;
  created_at: string;
  updated_at: string;
}

export interface AgentTeamRecord {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  customer_id: string | null;
  whatsapp_session_id: string | null;
  state: ConversationState;
  assigned_agent_id: string | null;
  assigned_team_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  handoff_reason: HandoffReason | null;
  current_intent_id: string | null;
  current_workflow_id: string | null;
  current_step_id: string | null;
  priority: string;
  last_message_at: string;
  timeout_at: string | null;
  timeout_action: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HandoffRuleRecord {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  trigger_condition: Record<string, unknown> | null;
  target_team_id: string | null;
  fallback_team_id: string | null;
  fallback_message: string | null;
  assignment_strategy: AssignmentStrategy;
  priority: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationEventRecord {
  id: string;
  conversation_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  actor_id: string | null;
  actor_type: string | null;
  created_at: string;
}


// ── Error Types ─────────────────────────────────────────────

export class ConcurrentStateConflict extends Error {
  constructor(message: string = 'Concurrent state conflict: conversation state changed during operation') {
    super(message);
    this.name = 'ConcurrentStateConflict';
  }
}

export class OwnershipViolation extends Error {
  constructor(message: string = 'Ownership violation: actor does not own this conversation') {
    super(message);
    this.name = 'OwnershipViolation';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  constructor(message: string = 'Forbidden: insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AgentNotFoundError extends Error {
  constructor(message: string = 'Agent not found') {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}
