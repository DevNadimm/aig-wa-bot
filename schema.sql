-- Enable UUID and Vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Core Organizations & Bots
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES bot_instances(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DISCONNECTED', -- CONNECTED, CONNECTING, DISCONNECTED, LOGGED_OUT, QR_REQUIRED, ERROR
    auth_state JSONB,
    assigned_agent_id UUID, -- Will reference human_agents later
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RBAC
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- SUPER_ADMIN, ADMIN, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Configuration
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g., 'gemini-1.5-pro'
    provider VARCHAR(100) NOT NULL,
    default_temperature DECIMAL(3,2) DEFAULT 0.7,
    default_max_tokens INTEGER DEFAULT 1024,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_default_per_provider ON ai_models(provider) WHERE is_default = true;

CREATE TABLE ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT,
    model_id UUID REFERENCES ai_models(id),
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    response_style VARCHAR(100),
    language VARCHAR(50) DEFAULT 'Mixed',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- Router Prompt, Agent Prompt, etc.
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    changed_by UUID REFERENCES admins(id),
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows (Define before Intents to allow FK)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100),
    timeout_seconds INTEGER DEFAULT 3600,
    failure_action VARCHAR(100),
    success_action VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- SEND_MESSAGE, ASK_QUESTION, etc.
    configuration JSONB, -- Details of what the step does
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    from_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    to_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    condition JSONB, -- Logic for transition
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intents
CREATE TABLE intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    agent_id UUID REFERENCES ai_agents(id),
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    handoff_policy VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE intent_examples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_id UUID REFERENCES intents(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge
CREATE TABLE knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- TEXT, FAQ, PDF, DOCUMENT, URL
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PUBLISHED',
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    storage_url TEXT, -- for PDFs/Docs
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tools & APIs
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tool_type VARCHAR(100) NOT NULL, -- REST_API, RPC, WEBHOOK
    is_enabled BOOLEAN DEFAULT true,
    requires_confirmation BOOLEAN DEFAULT false,
    requires_admin_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tool_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    param_type VARCHAR(50) NOT NULL, -- string, number, boolean
    is_required BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tool_permissions (
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
    PRIMARY KEY (tool_id, agent_id)
);

CREATE TABLE api_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    method VARCHAR(10) DEFAULT 'GET',
    url TEXT NOT NULL,
    auth_type VARCHAR(50), -- Bearer, API Key, Basic
    headers JSONB,
    query_params JSONB,
    body_mapping JSONB,
    response_mapping JSONB,
    timeout_ms INTEGER DEFAULT 5000,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tool_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    credential_key VARCHAR(100) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Humans & Teams
CREATE TABLE agent_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE human_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES agent_teams(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    availability VARCHAR(50) DEFAULT 'ONLINE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_sessions ADD CONSTRAINT fk_assigned_agent FOREIGN KEY (assigned_agent_id) REFERENCES human_agents(id) ON DELETE SET NULL;

CREATE TABLE handoff_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL, -- Intent, Keyword, Low Confidence
    trigger_condition JSONB,
    target_team_id UUID REFERENCES agent_teams(id),
    priority INTEGER DEFAULT 1,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    phone VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100),
    language VARCHAR(50) DEFAULT 'Mixed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Patient Name', 'Passport Available'
    field_type VARCHAR(50) NOT NULL, -- text, boolean, date
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_field_values (
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    field_id UUID REFERENCES customer_fields(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    PRIMARY KEY (customer_id, field_id)
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    whatsapp_session_id UUID REFERENCES whatsapp_sessions(id),
    state VARCHAR(50) DEFAULT 'AI_ACTIVE', -- AI_ACTIVE, WAITING_HUMAN, HUMAN_ACTIVE, CLOSED
    assigned_agent_id UUID REFERENCES human_agents(id),
    assigned_team_id UUID REFERENCES agent_teams(id),
    current_intent_id UUID REFERENCES intents(id),
    current_workflow_id UUID REFERENCES workflows(id),
    current_step_id UUID REFERENCES workflow_steps(id),
    priority VARCHAR(50) DEFAULT 'NORMAL',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, -- CUSTOMER, AI, HUMAN
    sender_id UUID, -- Null for customer, agent_id or admin_id for others
    message_type VARCHAR(50) DEFAULT 'TEXT', -- TEXT, IMAGE, PDF, AUDIO
    content TEXT,
    media_url TEXT,
    whatsapp_message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'SENT', -- SENT, DELIVERED, READ
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- HANDOFF_REQUESTED, WORKFLOW_STARTED, TOOL_CALLED
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_variables (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB,
    PRIMARY KEY (conversation_id, key)
);

-- Business Rules & System
CREATE TABLE business_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    rule_key VARCHAR(100) UNIQUE NOT NULL,
    rule_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    message_key VARCHAR(100) UNIQUE NOT NULL, -- Greeting, Fallback, etc.
    content TEXT NOT NULL,
    language VARCHAR(50) DEFAULT 'Mixed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads & Tickets
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, CONTACTED, CONVERTED
    source_intent_id UUID REFERENCES intents(id),
    assigned_team_id UUID REFERENCES agent_teams(id),
    assigned_agent_id UUID REFERENCES human_agents(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    issue_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'OPEN',
    assigned_agent_id UUID REFERENCES human_agents(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logging
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES api_connections(id),
    conversation_id UUID REFERENCES conversations(id),
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

 - -   P h a s e   5 :   A P I   K e y s   M a n a g e m e n t 
 A L T E R   T A B L E   b o t _ i n s t a n c e s   A D D   C O L U M N   l l m _ p r o v i d e r   V A R C H A R ( 5 0 )   D E F A U L T   ' g e m i n i ' ; 
 A L T E R   T A B L E   b o t _ i n s t a n c e s   A D D   C O L U M N   l l m _ a p i _ k e y   T E X T ;  
 