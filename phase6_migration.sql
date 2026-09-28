-- ============================================================
-- Phase 6: Human Agent, Assignment & Conversation Ownership
-- Migration Script
-- ============================================================

-- 1. Extend human_agents table
-- ============================================================

-- Link human_agents to Supabase auth.users for admin panel login
ALTER TABLE human_agents
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Whether agent is accepting new conversation assignments
ALTER TABLE human_agents
  ADD COLUMN IF NOT EXISTS accepting_conversations BOOLEAN DEFAULT true;

-- Maximum concurrent conversations this agent can handle
ALTER TABLE human_agents
  ADD COLUMN IF NOT EXISTS max_concurrent_conversations INTEGER DEFAULT 10;

-- Index for fast auth user lookup
CREATE INDEX IF NOT EXISTS idx_human_agents_auth_user
  ON human_agents(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Index for availability-based agent queries
CREATE INDEX IF NOT EXISTS idx_human_agents_availability
  ON human_agents(organization_id, status, availability, accepting_conversations);


-- 2. Multi-team agent membership (many-to-many)
-- ============================================================
-- Existing human_agents.team_id remains as "primary team"
-- This junction table enables agents to belong to multiple teams

CREATE TABLE IF NOT EXISTS human_agent_teams (
  agent_id UUID NOT NULL REFERENCES human_agents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (agent_id, team_id)
);


-- 3. Extend conversations table
-- ============================================================

-- When was the agent assigned
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Who assigned the agent (admin_id, system, etc.)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS assigned_by UUID;

-- Structured reason for handoff
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS handoff_reason VARCHAR(100);

-- Index for finding assigned conversations efficiently
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent
  ON conversations(assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;

-- Index for state + team queries (agent resolver, queue management)
CREATE INDEX IF NOT EXISTS idx_conversations_state_team
  ON conversations(state, assigned_team_id);


-- 4. Extend handoff_rules table
-- ============================================================

-- Fallback team when target team has no available agents
ALTER TABLE handoff_rules
  ADD COLUMN IF NOT EXISTS fallback_team_id UUID REFERENCES agent_teams(id);

-- Message to send when no agent is available
ALTER TABLE handoff_rules
  ADD COLUMN IF NOT EXISTS fallback_message TEXT;

-- Assignment strategy for this rule
ALTER TABLE handoff_rules
  ADD COLUMN IF NOT EXISTS assignment_strategy VARCHAR(50) DEFAULT 'LEAST_ACTIVE';


-- 5. Extend conversation_events for audit trail
-- ============================================================

-- Who performed the action
ALTER TABLE conversation_events
  ADD COLUMN IF NOT EXISTS actor_id UUID;

-- Type of actor (ADMIN, AGENT, SYSTEM, AI)
ALTER TABLE conversation_events
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(50);

-- Index for querying events by conversation
CREATE INDEX IF NOT EXISTS idx_conversation_events_conversation
  ON conversation_events(conversation_id, created_at DESC);

-- Index for querying events by actor
CREATE INDEX IF NOT EXISTS idx_conversation_events_actor
  ON conversation_events(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;


-- 6. Seed default handoff system messages
-- ============================================================

INSERT INTO system_messages (organization_id, message_key, content, language)
SELECT
  o.id,
  msg.key,
  msg.content,
  'Mixed'
FROM organizations o
CROSS JOIN (VALUES
  ('handoff_waiting', 'আপনার অনুরোধ আমাদের সাপোর্ট টিমের কাছে পাঠানো হয়েছে। একজন এজেন্ট শীঘ্রই আপনার সাথে যোগাযোগ করবেন।'),
  ('handoff_assigned', 'আপনাকে আমাদের একজন সাপোর্ট এজেন্টের কাছে সংযুক্ত করা হয়েছে। তিনি এখন আপনাকে সাহায্য করবেন।'),
  ('handoff_no_agent', 'দুঃখিত, এই মুহূর্তে কোনো এজেন্ট উপলব্ধ নেই। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, আমরা যত দ্রুত সম্ভব আপনার সাথে যোগাযোগ করব।'),
  ('handoff_released_to_ai', 'আপনার কথোপকথন আবার আমাদের AI সহকারীর কাছে ফিরিয়ে দেওয়া হয়েছে। আমি আপনাকে সাহায্য করতে প্রস্তুত।'),
  ('handoff_transferred', 'আপনাকে অন্য একজন এজেন্টের কাছে ট্রান্সফার করা হচ্ছে। তিনি শীঘ্রই আপনার সাথে যোগাযোগ করবেন।')
) AS msg(key, content)
WHERE NOT EXISTS (
  SELECT 1 FROM system_messages sm
  WHERE sm.message_key = msg.key
  AND sm.organization_id = o.id
);
