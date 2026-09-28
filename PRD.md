# AIG WA BOT

## Product Requirements Document — v1.0

**Product Type:** Dynamic WhatsApp AI Agent Platform
**Initial Deployment:** AIG Hospital — PACB / Bangladesh Patient Assistance
**Primary Goal:** Admin Panel-এর মাধ্যমে code পরিবর্তন ছাড়াই WhatsApp AI Bot-এর behavior, knowledge, workflows, tools, APIs, AI agents এবং human handoff পরিচালনা করা।

---

# 1. Product Vision

AIG WA BOT হবে একটি **configuration-driven, multi-agent WhatsApp automation platform**।

Core Bot Engine fixed থাকবে।

কিন্তু নিচের বিষয়গুলো database + Admin Panel driven হবে:

* AI Agents
* Prompts
* Intents
* Knowledge
* FAQs
* Workflows
* Workflow Steps
* Tools
* REST APIs
* API credentials
* Business rules
* Human agents
* Teams
* Handoff rules
* System messages
* AI models
* Conversation settings
* Customer fields
* Bot behavior

### Core Principle

```text
AI = Reasoning
Code = Execution & Security
Database = Source of Truth
Admin Panel = Configuration & Control
WhatsApp = Communication Layer
```

---

# 2. Product Goals

## Primary Goals

1. WhatsApp customer conversation automate করা।
2. Natural-language AI assistance প্রদান করা।
3. Admin Panel থেকে bot behavior পরিবর্তন করা।
4. Code deployment ছাড়া নতুন intent/workflow/tool/configuration যোগ করা।
5. AI থেকে human agent-এ seamless handoff।
6. Admin Panel থেকে customer-এর সাথে directly WhatsApp message পাঠানো।
7. Conversation history সংরক্ষণ করা।
8. Knowledge Base থেকে accurate information প্রদান করা।
9. External APIs এবং database functions ব্যবহার করা।
10. সব গুরুত্বপূর্ণ configuration-এর versioning এবং audit trail রাখা।

---

# 3. Non-Goals

Core platform-এর লক্ষ্য হবে না:

* AI দিয়ে medical diagnosis করা।
* AI-generated medical opinion-কে doctor-এর clinical opinion হিসেবে উপস্থাপন করা।
* Admin-এর approval ছাড়া sensitive business action execute করা।
* Arbitrary code execution-এর সুযোগ দেওয়া।
* AI-কে সরাসরি database write access দেওয়া।

---

# 4. High-Level Architecture

```text
                         ADMIN PANEL
                              |
                              v
                     Admin API / WebSocket
                              |
                              v
                       CONFIGURATION DB
                           Supabase
                              |
                              v
+--------------------------------------------------------------+
|                     BOT ENGINE                               |
|                                                              |
| WhatsApp Gateway                                             |
|       ↓                                                      |
| Message Preprocessor                                          |
|       ↓                                                      |
| Safety / Filter Layer                                         |
|       ↓                                                      |
| Intent Router                                                 |
|       ↓                                                      |
| Agent Resolver                                                |
|       ↓                                                      |
| Context Manager                                               |
|       ↓                                                      |
| Workflow Engine                                               |
|       ↓                                                      |
| Tool Executor                                                 |
|       ↓                                                      |
| Knowledge Retrieval                                           |
|       ↓                                                      |
| Response Generator                                            |
|       ↓                                                      |
| Handoff / Validation                                          |
+--------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
       WhatsApp            Supabase           External APIs
       Baileys              Storage             / Webhooks
```

---

# 5. Technology Stack

## Backend

* Node.js 20+
* TypeScript
* Express.js 5
* Baileys
* Pino
* Zod
* WebSocket / Socket.IO
* REST API

## AI

* Google Gemini API
* Configurable Router Model
* Configurable Worker/Agent Models
* Function Calling / Tool Calling
* Embeddings for Knowledge Retrieval

## Database

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Realtime
* PostgreSQL RPC

## Admin Panel

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query
* WebSocket / Supabase Realtime

## Deployment

Backend:

* VPS / Railway / Render / equivalent

Admin:

* Vercel / equivalent

Database:

* Supabase

---

# 6. Core Design Principle: Configuration Driven

Bot code-এ business behavior hardcode করা যাবে না।

### Bad

```ts
if (intent === "medical_visa") {
   ...
}
```

### Preferred

```text
User Message
     ↓
Intent Resolver
     ↓
Database Intent
     ↓
Configured Workflow
     ↓
Configured Agent
     ↓
Configured Tools
```

---

# 7. WhatsApp Layer

Baileys থাকবে WhatsApp transport layer হিসেবে।

Responsibilities:

* Connect WhatsApp
* Receive messages
* Send messages
* QR generation
* Authentication/session management
* Reconnect
* Disconnect detection
* Message ID tracking
* Duplicate prevention
* Media receiving
* Media sending
* Typing indicator
* Delivery state
* Read state where supported

---

# 8. WhatsApp Session Manager

Admin Panel থেকে:

```text
Start
Stop
Restart
Reconnect
Logout
Clear Session
View QR
View Connection Status
```

Status:

```text
CONNECTED
CONNECTING
DISCONNECTED
LOGGED_OUT
QR_REQUIRED
ERROR
```

---

# 9. Multi-WhatsApp Account Support

Architecture multi-session ready হতে হবে।

```text
whatsapp_sessions

AIG Main
Mrinal
Asif
Ashraf
Palash
```

প্রতিটি session-এর:

* session ID
* display name
* phone number
* status
* auth state
* assigned agent
* enabled/disabled

থাকবে।

প্রথম version-এ একটি WhatsApp session চালু করা গেলেও architecture multi-session compatible হতে হবে।

---

# 10. Message Pipeline

প্রতিটি incoming message:

```text
WhatsApp
 ↓
Normalize Message
 ↓
Duplicate Check
 ↓
Blocked User Check
 ↓
Human Mode Check
 ↓
Rate Limit
 ↓
Conversation Resolve
 ↓
Context Load
 ↓
Intent Routing
 ↓
Agent Resolution
 ↓
Workflow
 ↓
Tool/Knowledge
 ↓
Response Validation
 ↓
Send WhatsApp Reply
 ↓
Persist Message
```

---

# 11. Message Filtering

System-level filters:

### Ignore

* Bot's own message
* Group messages if disabled
* Duplicate message
* Unsupported message
* Blocked user

### Handle

* Text
* Image
* PDF
* Document
* Audio if transcription enabled
* Location if enabled

---

# 12. Conversation Engine

প্রতিটি customer-এর একটি persistent conversation থাকবে।

Conversation states:

```text
AI_ACTIVE
WAITING_HUMAN
HUMAN_ACTIVE
AI_RESUMED
CLOSED
BLOCKED
```

Conversation metadata:

```text
customer
phone
channel
assigned_agent
assigned_team
current_intent
current_workflow
current_step
state
priority
last_message_at
created_at
```

---

# 13. Customer Profile

Admin Panel থেকে configurable customer fields থাকবে।

Default:

```text
Name
Phone
Email
Country
City
Language
```

AIG deployment-এর জন্য:

```text
Patient Name
Age
Gender
Treatment Requirement
Preferred Hospital
Preferred Department
Passport Available
Travel Status
```

Admin নতুন field add/edit/disable করতে পারবে।

---

# 14. Intent Engine

Intent static enum হবে না।

Database-driven intent system:

```text
Intent
├── Name
├── Slug
├── Description
├── Example Queries
├── Priority
├── Status
├── Agent
├── Workflow
├── Knowledge Scope
├── Allowed Tools
└── Handoff Policy
```

Admin:

* Create
* Edit
* Disable
* Delete
* Reorder
* Duplicate

করতে পারবে।

---

# 15. Example AIG Intents

Initial configuration হিসেবে:

```text
Hospital Information
Doctor Information
Doctor Appointment
Department Information
Medical Visa
Visa Invitation Letter
Cost Estimate
Medical Report Assistance
Second Opinion Request
Travel Assistance
Accommodation
Regional Manager Contact
Follow-up
Emergency/Urgent Request
General Support
Human Request
```

এগুলো **hardcoded feature নয়**; initial database configuration।

---

# 16. Router Agent

Router-এর কাজ শুধু intent শনাক্ত করা।

Input:

```text
"লিভারের সমস্যার জন্য ভালো ডাক্তার দেখাতে চাই"
```

Output:

```json
{
  "intent": "doctor_information",
  "confidence": 0.94
}
```

Router-এর জন্য Admin Panel থেকে:

* Model
* System prompt
* Temperature
* Max tokens
* Confidence threshold
* Fallback intent

configure করা যাবে।

---

# 17. Agent System

একটি generic AI Agent Engine থাকবে।

Example agents:

```text
Router Agent
Patient Assistant
Doctor Assistant
Visa Assistant
Appointment Assistant
Travel Assistant
Support Assistant
General Assistant
```

প্রতিটি agent-এর configuration:

```text
Name
System Prompt
Model
Temperature
Max Tokens
Knowledge Sources
Allowed Tools
Allowed Intents
Handoff Policy
Response Style
Language
```

---

# 18. Agent Permissions

AI agent সরাসরি সব tool ব্যবহার করতে পারবে না।

উদাহরণ:

```text
Visa Assistant
✓ visa_knowledge
✓ document_collection
✓ create_lead
✓ handoff

✗ payment_refund
✗ delete_customer
✗ admin_settings
```

---

# 19. Knowledge Base

Knowledge Base হবে Admin-controlled।

Types:

```text
TEXT
FAQ
PDF
DOCUMENT
URL
WEB CONTENT
STRUCTURED DATA
```

Categories:

```text
Hospital
Doctors
Departments
Visa
Appointment
Cost
Travel
Accommodation
Policies
FAQ
Contact
```

---

# 20. Knowledge Retrieval

AI প্রশ্ন করলে relevant knowledge retrieve করবে।

```text
Customer
 ↓
Question
 ↓
Embedding / Search
 ↓
Relevant Knowledge
 ↓
Agent
 ↓
Answer
```

AI-এর factual response-এর source knowledge হবে configured knowledge base।

---

# 21. Knowledge Management

Admin Panel:

```text
Create
Edit
Upload
Delete
Archive
Publish
Unpublish
Search
Version
```

প্রতিটি knowledge item:

```text
title
content
category
source
version
status
created_by
updated_by
created_at
```

---

# 22. Document Upload

Admin:

```text
Upload PDF
Upload DOCX
Upload TXT
Add URL
```

System:

```text
File
 ↓
Text Extraction
 ↓
Chunking
 ↓
Embedding
 ↓
Vector Store
```

---

# 23. Workflow Engine

Workflow হবে database-driven।

Workflow:

```text
Name
Description
Trigger
Steps
Transitions
Timeout
Failure Action
Success Action
```

---

# 24. Workflow Step Types

Supported generic step types:

```text
SEND_MESSAGE
ASK_QUESTION
COLLECT_FIELD
VALIDATE_FIELD
SHOW_OPTIONS
CALL_TOOL
CALL_API
SEARCH_KNOWLEDGE
CONDITION
SET_VARIABLE
UPDATE_CUSTOMER
CREATE_LEAD
CREATE_TICKET
ASSIGN_AGENT
ASSIGN_TEAM
HANDOFF
WAIT
END
```

---

# 25. Workflow Builder

Admin Panel-এর visual builder:

```text
START
  ↓
Ask Patient Name
  ↓
Collect Passport Status
  ↓
Condition
 ┌───────────────┐
 YES             NO
 ↓                ↓
Documents       Explain
 ↓                ↓
Create Lead      END
 ↓
Assign Agent
 ↓
END
```

Admin drag/drop বা step editor দিয়ে workflow পরিবর্তন করতে পারবে।

---

# 26. Workflow Example — Medical Visa

```text
START
 ↓
Ask Patient Name
 ↓
Ask Treatment Purpose
 ↓
Check Passport Availability
 ↓
Explain Required Documents
 ↓
Collect Documents
 ↓
Validate Documents
 ↓
Create Visa Assistance Lead
 ↓
Assign Visa Team
 ↓
Notify Agent
 ↓
Handoff
```

---

# 27. Workflow Example — Doctor Appointment

```text
START
 ↓
Ask Department
 ↓
Ask Doctor
 ↓
Ask Preferred Date
 ↓
Check Availability API
 ↓
Show Available Slots
 ↓
Customer Selects Slot
 ↓
Collect Patient Details
 ↓
Create Appointment
 ↓
Send Confirmation
 ↓
END
```

---

# 28. Tool System

Tools হবে reusable backend capabilities।

Tool types:

```text
REST_API
RPC
DATABASE_QUERY
WEBHOOK
INTERNAL_FUNCTION
KNOWLEDGE_SEARCH
HUMAN_HANDOFF
```

---

# 29. Dynamic REST API Builder

Admin Panel:

```text
Tool Name
HTTP Method
URL
Authentication
Headers
Query Parameters
Path Parameters
Request Body
Response Mapping
Timeout
Retry
```

Example:

```text
GET /doctors

department = Gastroenterology
```

AI tool call করবে:

```text
search_doctors({
  department: "Gastroenterology"
})
```

---

# 30. API Credentials

Credentials কখনো prompt বা frontend-এর কাছে expose করা যাবে না।

Supported:

```text
Bearer Token
API Key
Basic Auth
OAuth2 where applicable
Custom Header
```

Credentials encrypted server-side থাকবে।

---

# 31. Tool Permission

প্রতিটি tool-এর:

```text
Enabled
Allowed Agents
Allowed Workflows
Requires Confirmation
Requires Admin Approval
```

থাকবে।

---

# 32. Business Rules

Admin configurable:

```text
AI confidence threshold
Spam threshold
Conversation timeout
Human handoff threshold
Maximum tool retries
Maximum AI attempts
Document size
Allowed file types
Working hours
```

---

# 33. Human Agent System

Agents database-driven।

```text
Agent
├── Name
├── Phone
├── Email
├── Role
├── Team
├── Status
├── Availability
└── Permissions
```

Example:

```text
Mr. Mrinal
Head of Information Center

Mr. Asif
Regional Manager

Mr. Ashraf
Regional Manager

Mr. Palash
Regional Manager
```

---

# 34. Teams

Agents team-এর অন্তর্ভুক্ত হবে।

Example:

```text
Patient Assistance
Visa Team
Appointment Team
Travel Team
Management
```

---

# 35. Human Handoff Rules

Admin configurable rules:

```text
Customer requests human
AI confidence below threshold
Repeated failed response
Medical report request
Complaint
Sensitive request
Emergency keyword
Specific intent
Agent manually requested
```

---

# 36. Handoff Flow

```text
AI_ACTIVE
 ↓
Handoff Trigger
 ↓
Find Available Agent
 ↓
Assign Conversation
 ↓
WAITING_HUMAN
 ↓
Agent Accepts
 ↓
HUMAN_ACTIVE
```

---

# 37. Human Takeover

Admin Panel-এ:

```text
[Take Over]
```

চাপলে:

```text
AI = OFF
Human = ON
```

Admin সরাসরি conversation থেকে message পাঠাতে পারবে।

---

# 38. Release to AI

Agent:

```text
[Release to AI]
```

চাপলে:

```text
Human = OFF
AI = ON
```

Conversation context AI-কে পুনরায় দেওয়া হবে।

---

# 39. Agent Messaging

Admin Panel message:

```text
Admin Panel
 ↓
Admin API
 ↓
Bot Engine
 ↓
Baileys
 ↓
Customer WhatsApp
```

Message sender metadata:

```text
sender_type = HUMAN
agent_id = ...
```

---

# 40. Conversation Assignment

Conversation manually অথবা automatically assign করা যাবে।

Assignment rules:

```text
Intent
Region
Language
Team
Agent availability
Priority
Workload
```

---

# 41. AI/Human Race Protection

একই conversation-এ একই সময়ে AI ও human message পাঠাতে পারবে না।

Lock:

```text
conversation_lock
```

Human takeover হলে AI response queue cancel হবে।

---

# 42. Medical Safety Layer

Medical-related conversation-এর জন্য dedicated guardrail থাকবে।

AI:

* Diagnosis করবে না।
* Prescription দেবে না।
* Emergency condition independently diagnose করবে না।
* Clinical opinion claim করবেভূ না।
* Unverified medical facts invent করবে না।

Medical report request → configured human/clinical workflow।

Emergency keyword → configured urgent handoff।

---

# 43. System Messages

Admin Panel থেকে editable:

```text
Greeting
Fallback
AI Error
API Error
Human Handoff
Waiting for Agent
Agent Joined
Agent Closed
Maintenance
Spam Warning
Invalid Input
Unsupported File
```

---

# 44. Greeting Engine

Admin configure করতে পারবে:

```text
Morning
Afternoon
Evening
Night
```

Language:

```text
Bangla
English
Mixed
```

---

# 45. Spam Protection

Configuration:

```text
Strike Limit
Cooldown
Blocked Duration
Spam Message
Reset Policy
```

Example:

```text
3 irrelevant messages
→ temporary hold
```

---

# 46. Session Management

Session data:

```text
current_intent
current_agent
current_workflow
current_step
variables
collected_fields
last_action
last_tool
```

Example:

```json
{
  "intent": "medical_visa",
  "workflow": "visa_assistance",
  "step": "document_upload",
  "patient_name": "Rahim",
  "passport_available": true
}
```

---

# 47. Conversation Memory

Memory layers:

### Short-term

Current conversation messages.

### Session

Current workflow state.

### Long-term

Customer profile/history.

AI context automatically optimized হবে।

পুরো conversation প্রতিবার Gemini-তে পাঠানো হবে না।

---

# 48. AI Context Strategy

Priority:

```text
Current User Message
↓
Current Workflow State
↓
Relevant Recent Messages
↓
Relevant Customer Data
↓
Relevant Knowledge
↓
Relevant Tool Results
```

---

# 49. Gemini API Key Rotation

Support:

```text
API Key 1
API Key 2
API Key 3
API Key 4
```

Rate limit:

```text
429
 ↓
Cooldown
 ↓
Next Available Key
```

Admin Panel থেকে:

* Add
* Disable
* Delete
* Reorder
* Test

---

# 50. Model Configuration

Admin:

```text
Router Model
Worker Model
Fallback Model
Embedding Model
```

প্রতিটির:

```text
Model
Temperature
Top P
Max Tokens
```

---

# 51. Prompt Management

Prompt types:

```text
Router Prompt
Agent Prompt
Tool Instruction
Workflow Instruction
Safety Prompt
Fallback Prompt
```

Versioning:

```text
v1
v2
v3
Current
```

Rollback supported।

---

# 52. Prompt Variables

Supported variables:

```text
{{customer_name}}
{{phone}}
{{current_time}}
{{conversation_state}}
{{current_intent}}
{{agent_name}}
{{workflow_name}}
{{hospital_name}}
```

---

# 53. Admin Dashboard

Dashboard cards:

```text
WhatsApp Status
Active Conversations
AI Conversations
Human Conversations
Today's Messages
Today's Leads
Pending Handoffs
API Errors
AI Usage
```

---

# 54. Live Conversation Inbox

Filters:

```text
All
AI Active
Human Active
Waiting Human
Pending
Closed
High Priority
```

Search:

```text
Name
Phone
Intent
Agent
Conversation ID
```

---

# 55. Conversation Detail

Show:

```text
Customer Profile
Conversation
Current Intent
Workflow
Current Step
Assigned Agent
AI/Human Status
Tool Calls
API Calls
Events
```

---

# 56. Patient/Lead Management

Leads:

```text
NEW
CONTACTED
QUALIFIED
FOLLOW_UP
CONVERTED
CLOSED
```

Admin manually update করতে পারবে।

---

# 57. Notifications

Events:

```text
New Lead
Human Handoff
High Priority
Appointment Request
Medical Report
Visa Request
API Failure
Bot Offline
WhatsApp Disconnected
```

Notification channels:

```text
Admin Panel
WhatsApp
Email
Webhook
```

---

# 58. Audit Logs

প্রতিটি sensitive action log হবে:

```text
Admin
Action
Resource
Before
After
Timestamp
IP
```

Example:

```text
Admin: nadim
Action: UPDATE_PROMPT
Prompt: visa_agent
Version: 8
```

---

# 59. RBAC

Roles:

```text
SUPER_ADMIN
ADMIN
SUPPORT_AGENT
VISA_AGENT
APPOINTMENT_AGENT
VIEWER
```

Permissions granular হবে।

---

# 60. Security

Requirements:

* Supabase Auth
* JWT
* RBAC
* Row Level Security
* Server-side authorization
* Encrypted API credentials
* Secure environment variables
* Rate limiting
* Request validation
* Zod schemas
* Audit logs
* CSRF protection where applicable
* Secure WebSocket authentication
* No secrets in frontend
* No service-role key in browser

---

# 61. Database Schema

Core tables:

```text
organizations
bot_instances

whatsapp_sessions

admins
roles
permissions
role_permissions

ai_agents
ai_models
ai_prompts
ai_prompt_versions

intents
intent_examples

knowledge_sources
knowledge_documents
knowledge_chunks

tools
tool_parameters
tool_credentials
tool_permissions

workflows
workflow_steps
workflow_transitions

business_rules
system_messages

human_agents
agent_teams
agent_assignments
handoff_rules

customers
customer_fields
customer_field_values

conversations
conversation_messages
conversation_events
conversation_states
conversation_variables

leads
tickets

api_connections
api_logs

notifications

audit_logs
```

---

# 62. Supabase Storage

Use cases:

```text
Patient Documents
Passport
Medical Reports
PDFs
Knowledge Documents
Images
```

Sensitive files-এর access controlled এবং temporary signed URL based হবে।

---

# 63. API Architecture

Admin API:

```text
/api/admin/auth
/api/admin/dashboard
/api/admin/whatsapp
/api/admin/agents
/api/admin/prompts
/api/admin/intents
/api/admin/knowledge
/api/admin/workflows
/api/admin/tools
/api/admin/apis
/api/admin/handoff
/api/admin/conversations
/api/admin/customers
/api/admin/leads
/api/admin/settings
/api/admin/logs
```

Bot internal API:

```text
/internal/config
/internal/conversations
/internal/tools
/internal/workflows
/internal/agents
```

Public API exposure avoid করতে হবে।

---

# 64. Realtime Architecture

Realtime events:

```text
QR_UPDATED
WHATSAPP_CONNECTED
WHATSAPP_DISCONNECTED

NEW_MESSAGE
MESSAGE_SENT

CONVERSATION_UPDATED
AGENT_ASSIGNED
HANDOFF_CREATED
HUMAN_TAKEOVER
AI_RESUMED

BOT_CONFIG_UPDATED
PROMPT_UPDATED
WORKFLOW_UPDATED
```

---

# 65. Configuration Cache

প্রতিটি incoming message-এ database query করা উচিত নয়।

Architecture:

```text
Supabase
 ↓
Config Loader
 ↓
In-Memory Cache
 ↓
Bot Engine
```

Config পরিবর্তন:

```text
Admin
 ↓
Supabase
 ↓
Realtime Event
 ↓
Cache Invalidation
 ↓
Reload Config
```

---

# 66. Error Handling

Categories:

```text
WhatsApp Error
Gemini Error
API Error
Database Error
Tool Error
Workflow Error
Validation Error
Timeout
Rate Limit
Unknown Error
```

Fallback hierarchy:

```text
Retry
 ↓
Alternative API Key
 ↓
Fallback Model
 ↓
Fallback Response
 ↓
Human Handoff
```

---

# 67. Logging

Pino structured logging।

Log:

```text
message_received
intent_detected
agent_selected
workflow_started
workflow_step
tool_called
api_called
tool_failed
ai_response
human_handoff
message_sent
```

Sensitive data logs-এ redact করতে হবে।

---

# 68. Analytics

Metrics:

```text
Total Messages
Unique Customers
AI Conversations
Human Conversations
Handoffs
Intent Distribution
Workflow Completion
Tool Success Rate
API Error Rate
Average Response Time
Average Conversation Length
Lead Count
Conversion
```

AI:

```text
Token Usage
Model Usage
Estimated Cost
API Key Usage
429 Count
```

---

# 69. Admin Panel Pages

```text
/login

/dashboard

/whatsapp
/whatsapp/connection

/conversations
/conversations/:id

/customers
/customers/:id

/leads

/ai
/ai/agents
/ai/models
/ai/prompts
/ai/api-keys

/knowledge
/knowledge/documents
/knowledge/faq

/intents

/workflows
/workflows/:id

/tools
/tools/:id

/apis
/apis/:id

/handoff
/handoff/rules
/handoff/agents
/handoff/teams

/messages

/analytics

/audit-logs

/settings
```

---

# 70. Admin Dashboard UX

Dark professional SaaS dashboard।

Sidebar:

```text
Dashboard
Conversations
Customers
Leads

AI
  Agents
  Prompts
  Models

Automation
  Intents
  Workflows
  Tools
  APIs

Knowledge

Human Support
  Agents
  Teams
  Handoff

Analytics
Logs
Settings
```

---

# 71. Folder Structure

## Backend

```text
src/
├── server.ts
├── app.ts
│
├── config/
│
├── core/
│   ├── ai/
│   ├── whatsapp/
│   ├── workflow/
│   ├── tools/
│   ├── knowledge/
│   ├── conversations/
│   └── events/
│
├── modules/
│   ├── admin/
│   ├── customers/
│   ├── conversations/
│   ├── agents/
│   ├── intents/
│   ├── workflows/
│   ├── tools/
│   ├── knowledge/
│   └── handoff/
│
├── database/
│   ├── repositories/
│   ├── rpc/
│   └── migrations/
│
├── middleware/
├── utils/
└── types/
```

## Frontend

```text
app/
├── dashboard/
├── conversations/
├── customers/
├── leads/
├── ai/
├── knowledge/
├── intents/
├── workflows/
├── tools/
├── apis/
├── handoff/
├── analytics/
├── logs/
└── settings/
```

---

# 72. Configuration Lifecycle

Admin changes configuration:

```text
Admin UI
 ↓
Validation
 ↓
Admin API
 ↓
Database
 ↓
Audit Log
 ↓
Realtime Event
 ↓
Bot Config Cache
 ↓
New configuration active
```

No restart required for normal configuration changes.

---

# 73. Versioning

Version করতে হবে:

```text
Prompts
Workflows
Knowledge Documents
Intent Configuration
Tool Configuration
Business Rules
```

Admin দেখতে পারবে:

```text
Current Version
Previous Version
Changed By
Changed At
Change Summary
```

Rollback supported।

---

# 74. Emergency Kill Switches

Admin Panel:

```text
Disable AI
Disable Purchasing/Action Tools
Disable External APIs
Disable New Conversations
Maintenance Mode
Force Human Handoff
Stop WhatsApp Bot
```

---

# 75. AI Global Kill Switch

যদি Gemini malfunction করে:

```text
AI ENABLED → OFF
```

তখন bot:

```text
Customer
 ↓
Predefined message
 ↓
Human handoff
```

---

# 76. AIG Initial Configuration

AIG Hospital PACB-এর initial deployment হিসেবে configure করা হবে:

### Knowledge

```text
Hospital
Doctors
Departments
Visa
Invitation Letter
Appointments
Cost
Travel
Accommodation
Contact
FAQ
```

### Initial Intents

```text
Doctor Information
Appointment
Medical Visa
Visa Invitation
Cost Estimate
Medical Report
Second Opinion
Travel
Accommodation
Manager Contact
Follow-up
General
Human Request
```

### Initial Teams

```text
Patient Assistance
Visa
Appointment
Regional Management
```

---

# 77. Example Customer Flow

Customer:

> আমি AIG Hospital-এর একজন Gastro doctor-এর appointment নিতে চাই।

System:

```text
Message
 ↓
Router
 ↓
Intent = APPOINTMENT
 ↓
Appointment Agent
 ↓
Appointment Workflow
 ↓
Department = Gastroenterology
 ↓
Doctor selection
 ↓
Date
 ↓
Patient information
 ↓
Availability Tool
 ↓
Confirmation
 ↓
Appointment Request
```

---

# 78. Human Flow

Customer:

> Mrinal Sir-এর সাথে কথা বলতে চাই।

```text
Router
 ↓
HUMAN_REQUEST
 ↓
Handoff Rule
 ↓
Find Agent
 ↓
Mrinal
 ↓
WAITING_HUMAN
 ↓
Mrinal Accepts
 ↓
HUMAN_ACTIVE
```

Mrinal Admin Panel থেকে message পাঠাবে।

---

# 79. AI Resume

Mrinal:

```text
Release to AI
```

System:

```text
HUMAN_ACTIVE
 ↓
Save Human Summary
 ↓
AI_RESUMED
 ↓
Load Context
 ↓
AI continues
```

Human conversation-এর গুরুত্বপূর্ণ summary context-এ থাকবে।

---

# 80. Development Phases

## Phase 1 — Foundation

* Node.js + TypeScript
* Express
* Supabase
* Baileys
* Logging
* Configuration loader
* Environment setup

## Phase 2 — WhatsApp Engine

* Connection
* QR
* Session
* Send/receive
* Reconnect
* Duplicate prevention

## Phase 3 — AI Engine

* Gemini Gateway
* API key rotation
* Router
* Agent engine
* Context management
* Tool calling

## Phase 4 — Dynamic Configuration

* Intents
* Agents
* Prompts
* Messages
* Business rules
* Models

## Phase 5 — Knowledge

* Documents
* PDFs
* FAQ
* Embeddings
* Retrieval

## Phase 6 — Workflow Engine

* Workflow builder backend
* Steps
* Conditions
* Transitions
* Variables
* Tool execution

## Phase 7 — Tool/API Engine

* REST API builder
* Credentials
* Mapping
* Retry
* Timeout
* Logs

## Phase 8 — Human Support

* Agents
* Teams
* Assignment
* Handoff
* Takeover
* Release to AI
* Admin messaging

## Phase 9 — Admin Panel

* Dashboard
* Configuration UI
* Conversation inbox
* Workflow builder
* Knowledge management
* Agent management

## Phase 10 — Security

* RBAC
* RLS
* Encryption
* Audit
* Rate limiting
* Secret protection

## Phase 11 — Analytics

* Conversations
* Leads
* Handoffs
* AI usage
* Tool usage
* API health

## Phase 12 — AIG Deployment

Initial AIG configuration load করা হবে।

---

# 81. Acceptance Criteria

System considered ready when:

### WhatsApp

* Bot connects successfully.
* QR can be displayed in Admin Panel.
* Reconnect works.
* Messages are received/sent.
* Duplicate messages are prevented.

### AI

* Router identifies configured intents.
* Agents load dynamically.
* Prompts are database-driven.
* Models can be changed from Admin Panel.
* API key fallback works.

### Dynamic Configuration

* Admin can create an intent.
* Admin can disable an intent.
* Admin can create an agent.
* Admin can modify a prompt.
* Admin can create a workflow.
* Admin can modify workflow steps.
* Admin can add a knowledge source.
* Admin can configure a tool.
* Configuration changes apply without restart.

### Human Handoff

* Customer can request human.
* Admin receives handoff.
* Admin can take over.
* Admin can send WhatsApp messages.
* Admin can assign/reassign agent.
* Admin can release conversation to AI.

### Security

* Unauthorized users cannot access Admin Panel.
* API credentials are never exposed to frontend.
* Sensitive actions are audited.
* Customer documents are protected.

---

# 82. Critical Architectural Rule

এই system-এর সবচেয়ে গুরুত্বপূর্ণ rule:

```text
DO NOT BUILD AIG BUSINESS LOGIC DIRECTLY INTO THE BOT ENGINE.
```

Instead:

```text
BOT ENGINE
     +
CONFIGURATION
     +
WORKFLOW
     +
TOOLS
     +
KNOWLEDGE
     +
HUMAN AGENTS
```

এই combination থেকেই AIG-এর behavior তৈরি হবে।

---

# 83. Final Architecture

```text
                         ┌──────────────────────┐
                         │      ADMIN PANEL     │
                         │                      │
                         │ Dashboard            │
                         │ AI                   │
                         │ Prompts              │
                         │ Intents              │
                         │ Knowledge            │
                         │ Workflows            │
                         │ Tools / APIs         │
                         │ Human Agents         │
                         │ Handoff              │
                         │ Conversations        │
                         │ Analytics            │
                         └──────────┬───────────┘
                                    │
                              Admin API / WS
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      SUPABASE        │
                         │                      │
                         │ Configuration        │
                         │ Customers            │
                         │ Conversations        │
                         │ Workflows            │
                         │ Knowledge            │
                         │ Agents               │
                         │ Logs                 │
                         │ Storage              │
                         └──────────┬───────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────┐
│                     AIG BOT ENGINE                        │
│                                                           │
│ WhatsApp Gateway                                          │
│        ↓                                                  │
│ Message Processor                                         │
│        ↓                                                  │
│ Guard / Filter                                            │
│        ↓                                                  │
│ Intent Router                                             │
│        ↓                                                  │
│ Agent Resolver                                            │
│        ↓                                                  │
│ Context Manager                                           │
│        ↓                                                  │
│ Workflow Engine                                           │
│        ↓                                                  │
│ Tool Engine ───────→ REST APIs / RPC / Webhooks           │
│        ↓                                                  │
│ Knowledge Engine ───→ Knowledge Base / Vector Search      │
│        ↓                                                  │
│ Response Generator                                        │
│        ↓                                                  │
│ Handoff Engine                                            │
│        ↓                                                  │
│ WhatsApp                                                  │
└───────────────────────────────────────────────────────────┘
```

---

# 84. Product Definition

**AIG WA BOT is not a hardcoded hospital chatbot.**

It is:

> **A configuration-driven WhatsApp AI Agent Platform where the Admin Panel controls AI behavior, knowledge, intents, workflows, tools, APIs, human agents, handoff rules, messages, models, and business rules without requiring normal code changes.**

AIG Hospital PACB will simply be the **first configured tenant/use case** of this platform.

---

# 85. Cost Optimization & Token Management Strategies

To handle a large scale of users (e.g., 900+ concurrent active users) while maintaining a near-zero or extremely low API cost, the system must implement the following token and resource optimization techniques:

### 1. Chat History Truncation
* **Problem:** Sending the entire conversation history (e.g., 10-20 messages) consumes massive input tokens.
* **Solution:** Only include the last 3-4 message pairs (user + bot) in the LLM context. Older context should be truncated or summarized to keep the payload lightweight.

### 2. Caching (Semantic / Exact Match)
* **Problem:** Repeatedly calling the LLM for frequently asked, static questions (e.g., "What is the address?", "Doctor schedule").
* **Solution:** Implement a caching layer (Redis or DB). If a user asks a highly frequent question, the system should serve the response from the cache without hitting the Gemini API.

### 3. Smart Knowledge Retrieval (Optimized RAG)
* **Problem:** Injecting full documents into the prompt for Knowledge Base queries wastes tokens.
* **Solution:** Utilize `pgvector` in Supabase for semantic search. Only retrieve and inject the **top 1 or 2 most relevant chunks** into the prompt, strictly limiting the context size.

### 4. Rule-Based Logic (Pre-AI Processing)
* **Problem:** Using AI to process simple greetings ("Hi", "Thanks", "Ok").
* **Solution:** Intercept common greetings and short, exact-match phrases at the WhatsApp Gateway layer. Respond using static system messages (e.g., from the `system_messages` table) before routing to the AI agent.

### 5. Strict Model Routing Strategy
* **Problem:** Using a heavy/expensive model for simple routing or conversational tasks.
* **Solution:** Default all Router Agents and general Worker Agents to **Gemini 1.5 Flash** (highly cost-effective). Restrict the use of **Gemini 1.5 Pro** only to highly complex, specialized tasks explicitly configured via the Admin Panel.
