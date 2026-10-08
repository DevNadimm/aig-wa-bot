import { supabase } from '../../config/supabase.js';
import { logger } from '../../app.js';
import { sendWhatsAppMessage } from '../whatsapp/sender.js';
import { generateStructuredContent, generateWithTools, generateAgenticResponse, buildGeminiTools } from '../ai/llm_service.js';
import { executeExternalApi, executeIdempotentTool } from '../tools/executor.js';
import { modelResolver, promptResolver, contextBuilder } from '../ai/resolvers.js';
import { configCache } from '../config/cache.js';
import { searchKnowledge } from '../knowledge/search.js';
import { validateField } from './validation.js';

type WorkflowStepResult =
  | { type: 'CONTINUE'; nextStepId?: string }
  | { type: 'WAIT'; reason: string; timeoutDurationSeconds?: number; timeoutAction?: any }
  | { type: 'HANDOFF'; reason?: string }
  | { type: 'END' }
  | { type: 'FAIL'; error: string };

async function saveVariable(conversationId: string, key: string, value: any) {
  await supabase.from('conversation_variables').upsert({
    conversation_id: conversationId,
    key,
    value: value
  });
}

async function getVariables(conversationId: string): Promise<Record<string, any>> {
  const { data } = await supabase.from('conversation_variables').select('key, value').eq('conversation_id', conversationId);
  const vars: Record<string, any> = {};
  if (data) data.forEach(d => vars[d.key] = d.value);
  return vars;
}

export class ConcurrentStateConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrentStateConflict';
  }
}

async function updateConversationStateAtomic(conversationId: string, updates: any) {
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId)
    .in('state', ['AI_ACTIVE', 'WAITING_INPUT']) // Only allow update if AI is in control
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    logger.warn({ event: 'workflow_state_conflict', conversation_id: conversationId }, 'Atomic state update failed (likely human takeover)');
    throw new ConcurrentStateConflict('State conflict: conversation is no longer controlled by AI');
  }
}

export async function executeWorkflow(
  workflowId: string, 
  conversationId: string, 
  remoteJid: string,
  userMessage: string,
  agentId?: string,
  startStepId?: string,
  isResume: boolean = false
) {
  if (isResume) {
    logger.info({ event: 'workflow_resumed', workflow_id: workflowId, conversation_id: conversationId, step_id: startStepId });
  } else {
    logger.info({ event: 'workflow_started', workflow_id: workflowId, conversation_id: conversationId });
  }

  try {
    const steps = configCache.getTable('workflow_steps')
      .filter(s => s.workflow_id === workflowId)
      .sort((a, b) => a.order_index - b.order_index);

    if (steps.length === 0) {
      logger.warn(`No steps found for workflow: ${workflowId}`);
      await sendWhatsAppMessage(remoteJid, "I'm sorry, I don't know how to handle that request yet.", conversationId);
      return;
    }

    let currentStep = startStepId ? steps.find(s => s.id === startStepId) : steps[0];
    let isFirstIteration = true;
    let workflowLoops = 0;
    const MAX_WORKFLOW_LOOPS = 25;

    while (currentStep) {
      workflowLoops++;
      if (workflowLoops > MAX_WORKFLOW_LOOPS) {
        logger.error({ event: 'workflow_loop_limit_exceeded', workflow_id: workflowId, conversation_id: conversationId });
        await sendWhatsAppMessage(remoteJid, "An internal error occurred (workflow loop limit exceeded).", conversationId);
        break;
      }
      
      logger.info({ event: 'workflow_step_started', workflow_id: workflowId, step_id: currentStep.id, step_type: currentStep.step_type });
      
      const isResumingThisStep = isFirstIteration && isResume;
      if (isResumingThisStep) {
        logger.info({ event: 'workflow_input_received', workflow_id: workflowId, step_id: currentStep.id });
      }
      isFirstIteration = false;

      const result = await executeStep(currentStep, conversationId, remoteJid, userMessage, agentId, isResumingThisStep);
      logger.info({ event: 'workflow_step_completed', workflow_id: workflowId, step_id: currentStep.id, result_type: result.type });

      if (result.type === 'WAIT') {
        logger.info({ event: 'workflow_waiting', workflow_id: workflowId, step_id: currentStep.id, reason: result.reason });
        
        let timeoutAt = null;
        if (result.timeoutDurationSeconds) {
           timeoutAt = new Date(Date.now() + result.timeoutDurationSeconds * 1000).toISOString();
        }

        await updateConversationStateAtomic(conversationId, { 
            state: 'WAITING_INPUT', 
            current_workflow_id: workflowId,
            current_step_id: currentStep.id,
            timeout_at: timeoutAt,
            timeout_action: result.timeoutAction || null
        });
        return;
      } 
      else if (result.type === 'HANDOFF') {
        logger.info({ event: 'workflow_waiting', workflow_id: workflowId, step_id: currentStep.id, reason: 'HANDOFF' });
        
        // Before sending the message, make sure we still own the state
        await updateConversationStateAtomic(conversationId, { 
          state: 'WAITING_HUMAN',
          timeout_at: null,
          timeout_action: null,
          handoff_reason: 'WORKFLOW_REQUIRES_HUMAN',
        });
        // Phase 6: Record handoff event
        try {
          const { auditService } = await import('../handoff/audit.service.js');
          await auditService.recordHandoffEvent({
            conversationId,
            eventType: 'AI_HANDOFF_REQUESTED',
            actorType: 'AI',
            previousState: 'AI_ACTIVE',
            newState: 'WAITING_HUMAN',
            reason: 'WORKFLOW_REQUIRES_HUMAN',
          });
        } catch (eventErr) {
          logger.error({ err: eventErr }, 'Failed to record handoff event');
        }
        // We successfully transitioned state, now send message
        await sendWhatsAppMessage(remoteJid, result.reason || "I am transferring you to a human agent. Please wait.", conversationId, 'SYSTEM');
        
        return;
      } 
      else if (result.type === 'END' || result.type === 'FAIL') {
        logger.info({ event: result.type === 'END' ? 'workflow_completed' : 'workflow_failed', workflow_id: workflowId });
        await updateConversationStateAtomic(conversationId, { 
            state: 'AI_ACTIVE',
            current_workflow_id: null,
            current_step_id: null,
            timeout_at: null,
            timeout_action: null
        });
        return;
      } 
      else if (result.type === 'CONTINUE') {
        // Resolve Next Step
        const nextStep = await resolveNextStep(currentStep, steps, conversationId, result.nextStepId);
        
        if (!nextStep) {
          logger.info({ event: 'workflow_completed', workflow_id: workflowId });
          await updateConversationStateAtomic(conversationId, { 
              state: 'AI_ACTIVE',
              current_workflow_id: null,
              current_step_id: null,
              timeout_at: null,
              timeout_action: null
          });
          return;
        }
        
        logger.info({ event: 'workflow_transition', workflow_id: workflowId, from_step_id: currentStep.id, to_step_id: nextStep.id });
        currentStep = nextStep;
      }
    }
  } catch (err: any) {
    if (err instanceof ConcurrentStateConflict) {
      // Abort silently, another worker or human took over
      return;
    }
    logger.error({ err, event: 'workflow_failed', workflow_id: workflowId }, 'Workflow execution failed');
    await sendWhatsAppMessage(remoteJid, "An error occurred while processing your request.", conversationId);
  }
}

async function executeStep(
  step: any, 
  conversationId: string, 
  remoteJid: string, 
  userMessage: string, 
  agentId?: string,
  isResuming: boolean = false
): Promise<WorkflowStepResult> {
  
  const config = step.configuration || {};

  switch (step.step_type) {
    case 'SEND_MESSAGE':
      if (isResuming) return { type: 'CONTINUE' }; // shouldn't happen, but just in case
      await sendWhatsAppMessage(remoteJid, config.message || "Hello!", conversationId);
      return { type: 'CONTINUE' };

    case 'ASK_QUESTION':
      if (isResuming) {
        // We asked the question, now we received the answer in userMessage.
        // We can just continue.
        return { type: 'CONTINUE' };
      }
      await sendWhatsAppMessage(remoteJid, config.question || "Could you provide more details?", conversationId);
      return { 
        type: 'WAIT', 
        reason: 'USER_INPUT',
        timeoutDurationSeconds: config.timeout_seconds,
        timeoutAction: config.timeout_action
      };

    case 'COLLECT_FIELD':
      if (isResuming) {
        const validation = validateField(userMessage, config.field_type || 'STRING', config);
        
        if (validation.valid) {
          if (config.field) {
            await saveVariable(conversationId, config.field, validation.normalizedValue);
          }
          return { type: 'CONTINUE' };
        } else {
          logger.info({ event: 'workflow_validation_failed', conversation_id: conversationId, step_id: step.id, input: userMessage, error: validation.error });
          await sendWhatsAppMessage(remoteJid, config.retry_message || validation.error || "Please provide a valid input.", conversationId);
          return { 
            type: 'WAIT', 
            reason: 'USER_INPUT',
            timeoutDurationSeconds: config.timeout_seconds,
            timeoutAction: config.timeout_action 
          };
        }
      }
      // Ask
      await sendWhatsAppMessage(remoteJid, config.question || "Please enter the required information.", conversationId);
      return { 
        type: 'WAIT', 
        reason: 'USER_INPUT',
        timeoutDurationSeconds: config.timeout_seconds,
        timeoutAction: config.timeout_action 
      };

    case 'CONDITION':
      if (isResuming) return { type: 'CONTINUE' };
      // Handled by resolveNextStep via transitions. Just return CONTINUE.
      return { type: 'CONTINUE' };

    case 'WAIT':
      if (isResuming) return { type: 'CONTINUE' };
      return { 
        type: 'WAIT', 
        reason: 'GENERIC_WAIT',
        timeoutDurationSeconds: config.duration_seconds,
        timeoutAction: config.timeout_action 
      };

    case 'HANDOFF':
      return { type: 'HANDOFF', reason: config.message };

    case 'SEARCH_KNOWLEDGE':
      if (isResuming) return { type: 'CONTINUE' };
      
      const queryKey = config.query_variable || 'user_message';
      const outputKey = config.output_variable || 'knowledge_results';
      
      let queryStr = '';
      if (queryKey === 'user_message') {
        queryStr = userMessage;
      } else {
        const vars = await getVariables(conversationId);
        queryStr = vars[queryKey] || userMessage;
      }

      if (queryStr) {
         // AgentId might be undefined in a standalone workflow, so we can pass undefined or fetch from config
         const stepAgentId = config.agent_id || agentId;
         const results = await searchKnowledge(queryStr, stepAgentId, config.threshold || 0.5, config.limit || 3);
         
         let resultText = '';
         if (results.length > 0) {
           resultText = results.map(r => `[${r.source_name}]: ${r.chunk_text}`).join('\n\n');
         } else {
           resultText = config.empty_message || 'No relevant knowledge found.';
         }
         
         await saveVariable(conversationId, outputKey, resultText);
      }
      return { type: 'CONTINUE' };

    case 'CALL_AI_AGENT':
      if (isResuming) return { type: 'CONTINUE' }; // Resuming an AI call? Not supported yet.
      return await executeAiAgent(step, conversationId, remoteJid, agentId);

    default:
      logger.warn(`Unknown step type: ${step.step_type}`);
      return { type: 'CONTINUE' };
  }
}

async function resolveNextStep(
  currentStep: any, 
  allSteps: any[], 
  conversationId: string, 
  forcedNextStepId?: string
): Promise<any | null> {
  if (forcedNextStepId) {
    return allSteps.find(s => s.id === forcedNextStepId) || null;
  }

  // Check transitions
  const transitions = configCache.getTable('workflow_transitions').filter(t => t.from_step_id === currentStep.id);
  
  if (transitions.length > 0) {
    const vars = await getVariables(conversationId);
    
    // Evaluate conditions
    for (const t of transitions) {
      if (!t.condition || Object.keys(t.condition).length === 0) {
        // Unconditional transition
        return allSteps.find(s => s.id === t.to_step_id) || null;
      }
      
      // Basic condition evaluator (e.g. { "variable": "passport", "operator": "==", "value": "true" })
      const cond = t.condition as any;
      const actualVal = vars[cond.variable];
      
      let matched = false;
      if (cond.operator === '==') matched = String(actualVal) === String(cond.value);
      if (cond.operator === '!=') matched = String(actualVal) !== String(cond.value);
      // For now, if match, take it.
      if (matched) {
        return allSteps.find(s => s.id === t.to_step_id) || null;
      }
    }
    
    // If no condition matched, and no unconditional fallback transition exists, it might end or we can just fall through
  }

  // Fallback to sequential order_index
  return allSteps.find(s => s.order_index > currentStep.order_index) || null;
}

async function executeAiAgent(step: any, conversationId: string, remoteJid: string, agentId?: string): Promise<WorkflowStepResult> {
  const allTools = configCache.getTable('tools').filter(t => t.is_enabled);
  const toolPermissions = configCache.getTable('tool_permissions');
  const toolParams = configCache.getTable('tool_parameters');
  
  let activeTools = allTools;
  if (agentId) {
    const allowedToolIds = new Set(toolPermissions.filter(tp => tp.agent_id === agentId).map(tp => tp.tool_id));
    if (toolPermissions.length > 0) {
       activeTools = allTools.filter(t => allowedToolIds.has(t.id));
    }
  }
  
  let functionDeclarations: any[] = [];
  
  if (activeTools && activeTools.length > 0) {
    for (const tool of activeTools) {
      const params = toolParams.filter(p => p.tool_id === tool.id);
      
      const properties: any = {};
      const required: string[] = [];
      
      if (params) {
        params.forEach(p => {
          properties[p.name] = { 
            type: p.param_type === 'number' ? 'number' : (p.param_type === 'boolean' ? 'boolean' : 'string'),
            description: p.description 
          };
          if (p.is_required) required.push(p.name);
        });
      }

      functionDeclarations.push({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      });
    }
  }

  // Phase 6: Add request_human_handoff function declaration
  // This allows AI to request handoff when it genuinely cannot complete a task
  functionDeclarations.push({
    name: 'request_human_handoff',
    description: 'Request human agent support ONLY when you genuinely cannot complete the customer task using your available tools, knowledge, and capabilities. Do NOT call this for tasks you can handle.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Structured reason: AI_CANNOT_COMPLETE, REQUIRED_CAPABILITY_MISSING, REQUIRED_TOOL_UNAVAILABLE, SAFETY_REQUIRES_HUMAN',
        },
        required_team: {
          type: 'string',
          description: 'Team capability needed (e.g. Appointment, Visa, Billing). Optional.',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of what the customer needs, for the human agent.',
        },
      },
      required: ['reason', 'summary'],
    },
  });

  const { data: messagesDataRaw } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Phase 6: Also fetch human session summary if available
  const { data: summaryVar } = await supabase
    .from('conversation_variables')
    .select('value')
    .eq('conversation_id', conversationId)
    .eq('key', '_human_session_summary')
    .maybeSingle();

  const { data: resetVar } = await supabase
    .from('conversation_variables')
    .select('value')
    .eq('conversation_id', conversationId)
    .eq('key', '_reset_timestamp')
    .maybeSingle();

  let historyData = messagesDataRaw?.reverse() || [];
  
  if (resetVar?.value) {
    historyData = historyData.filter((msg: any) => new Date(msg.created_at) > new Date(resetVar.value));
  }
  
  // Inject human session summary as a system message if it exists
  if (summaryVar?.value) {
    historyData.unshift({
      sender_type: 'SYSTEM',
      content: typeof summaryVar.value === 'string' ? summaryVar.value : JSON.stringify(summaryVar.value),
      created_at: new Date(0).toISOString(), // Put at beginning
    });
  }

  let contents = await contextBuilder.build({
    conversationId,
    historyData,
  });

  const modelConfig = await modelResolver.resolve('WORKER', agentId);
  
  const { data: convData } = await supabase
    .from('conversations')
    .select('customer_id, state')
    .eq('id', conversationId)
    .single();
    
  let customerName = '';
  let phone = '';
  if (convData?.customer_id) {
     const cust = configCache.getTable('customers').find(c => c.id === convData.customer_id) ||
                  (await supabase.from('customers').select('name, phone').eq('id', convData.customer_id).single()).data;
     if (cust) {
       customerName = cust.name || '';
       phone = cust.phone || '';
     }
  }

  // 2. Perform Knowledge Search (RAG)
  // We need to figure out what the user query is. The latest message in history is the query.
  const latestMessage = messagesDataRaw && messagesDataRaw.length > 0 ? messagesDataRaw[0].content : '';
  let knowledgeContext = '';
  
  if (latestMessage && agentId) {
    // Only search if agentId is bound, because knowledge scope requires an agent
    const searchResults = await searchKnowledge(latestMessage, agentId, 0.5, 3);
    
    if (searchResults && searchResults.length > 0) {
      logger.info({ event: 'knowledge_context_added', agent_id: agentId, result_count: searchResults.length });
      knowledgeContext = '\n\n--- RELEVANT KNOWLEDGE ---\n';
      
      searchResults.forEach(res => {
        knowledgeContext += `[Source: ${res.source_name} (${res.source_type})]\n${res.chunk_text}\n\n`;
      });
      
      knowledgeContext += `--- END KNOWLEDGE ---\n
IMPORTANT INSTRUCTIONS:
- Use the retrieved knowledge above to answer the user if relevant.
- Do not invent facts not supported by the retrieved knowledge.
- Do not claim a source was consulted if no knowledge was retrieved.
`;
    }
  }

  // Inject workflow variables into prompt context
  const vars = await getVariables(conversationId);
  
  let systemInstruction = await promptResolver.resolve('AGENT', agentId, {
    customer_name: customerName,
    phone: phone,
    current_time: new Date().toISOString(),
    conversation_state: convData?.state || 'UNKNOWN',
    ...vars // Allow workflow variables in the prompt
  });
  
  if (!systemInstruction) {
     systemInstruction = step.configuration?.instruction || "Provide a helpful response.";
  }
  
  // Append knowledge context directly into the system instruction
  systemInstruction += knowledgeContext;
  
  let aiReply = "";
  let isDone = false;
  const maxLoops = 3; // Reduced from 5 to prevent excessive token usage
  let loops = 0;

  const geminiTools = functionDeclarations.length > 0 ? [{ functionDeclarations }] : [];

  while (!isDone && loops < maxLoops) {
    loops++;
    
    const response = await generateAgenticResponse(
      contents, 
      modelConfig.name, 
      geminiTools, 
      systemInstruction,
      modelConfig.temperature,
      modelConfig.maxTokens
    );
    
    if (response?.functionCalls && response.functionCalls.length > 0) {
      const toolResults = [];
      
      for (const call of response.functionCalls) {
          // Phase 6: Handle request_human_handoff specially
          if (call.name === 'request_human_handoff') {
            const args = call.args as any;
            logger.info({
              event: 'ai_handoff_requested',
              conversationId,
              reason: args?.reason,
              required_team: args?.required_team,
            });
            try {
              const { evaluateHandoffDecision } = await import('../handoff/handoff-decision.service.js');
              const handoffResult = await evaluateHandoffDecision(
                {
                  requires_human: true,
                  reason: args?.reason || 'AI_CANNOT_COMPLETE',
                  required_team: args?.required_team,
                  summary: args?.summary,
                },
                conversationId,
                convData?.customer_id ? (await supabase.from('customers').select('organization_id').eq('id', convData.customer_id).single()).data?.organization_id || '' : '',
              );
              if (handoffResult.approved) {
                // Transition to handoff
                await updateConversationStateAtomic(conversationId, {
                  state: 'WAITING_HUMAN',
                  handoff_reason: args?.reason || 'AI_CANNOT_COMPLETE',
                  timeout_at: null,
                  timeout_action: null,
                });
                const systemMessages = configCache.getTable('system_messages');
                const msg = systemMessages.find((m: { message_key: string }) => m.message_key === 'handoff_waiting');
                await sendWhatsAppMessage(remoteJid, msg?.content || 'I am connecting you with a human agent. Please wait.', conversationId, 'SYSTEM');
                return { type: 'HANDOFF' as const, reason: args?.summary };
              }
              // If not approved, continue AI processing
              toolResults.push({ functionResponse: { name: call.name, response: { status: 'rejected', message: 'Handoff not required. Please continue helping the customer.' }, id: call.id } });
              continue;
            } catch (handoffErr) {
              logger.error({ err: handoffErr }, 'Handoff decision evaluation failed');
              toolResults.push({ functionResponse: { name: call.name, response: { error: 'Handoff evaluation failed' }, id: call.id } });
              continue;
            }
          }

          const tool = activeTools?.find(t => t.name === call.name);
          let apiData: any = null;
          
          if (tool) {
            if (tool.tool_type === 'REST_API' || tool.tool_type === 'WEBHOOK' || !tool.tool_type) {
                const apiConfig = configCache.getTable('api_connections').find(c => c.tool_id === tool.id) || tool.configuration;
                if (apiConfig) {
                    try {
                        const credentials = configCache.getTable('tool_credentials').filter(c => c.tool_id === tool.id);
                        let authCredential = credentials.find(c => c.credential_key === 'auth')?.encrypted_value;
                        if (authCredential) {
                            const { decrypt } = await import('../security/crypto.js');
                            authCredential = await decrypt(authCredential);
                        }

                        const context = {
                            customer: { name: customerName, phone: phone },
                            args: call.args || {},
                        };

                        const { buildUrl, buildRequestHeaders, buildRequestBody } = await import('../tools/builder.js');
                        const { executeIdempotentTool, extractResponse } = await import('../tools/executor.js');
                        
                        const method = apiConfig.method || 'GET';
                        const rawUrl = apiConfig.url || apiConfig.endpoint; // Handle both schemas
                        const url = buildUrl(rawUrl, apiConfig.query_params || {}, context);
                        const headers = buildRequestHeaders(apiConfig.headers || {}, context, apiConfig.auth_type, authCredential);
                        const body = (method !== 'GET' && method !== 'HEAD') 
                                      ? buildRequestBody(apiConfig.body_mapping || call.args, context) 
                                      : undefined;
                                      
                        const result = await executeIdempotentTool(
                            conversationId,
                            step.workflow_id || 'agent',
                            step.id || 'agent',
                            tool.name,
                            method,
                            url,
                            headers,
                            body,
                            Math.min(apiConfig.timeout_ms || 7000, 10000),
                            method !== 'GET' // supportsIdempotency proxy flag
                        );
                        
                        if (result.error) {
                            apiData = { error: result.error, type: result.errorType };
                        } else {
                            apiData = extractResponse(result.data, apiConfig.response_mapping);
                        }
                    } catch (err: any) {
                        logger.error({ err }, `Failed to execute external tool ${tool.name}`);
                        apiData = { error: err.message || "External service is unavailable." };
                    }
                } else {
                    apiData = { error: "API connection configuration not found for this tool." };
                }
            } else if (tool.tool_type === 'KNOWLEDGE_SEARCH') {
                try {
                    const { searchKnowledge } = await import('../knowledge/search.js');
                    const queryRaw = call.args?.query || call.args?.q || '';
                    const query = typeof queryRaw === 'string' ? queryRaw : JSON.stringify(queryRaw);
                    if (!query || query === '""') {
                        apiData = { error: "Query is required for knowledge search." };
                    } else {
                        const results = await searchKnowledge(query, agentId, 0.5, 3);
                        apiData = { results: results.map(r => ({ source: r.source_name, content: r.chunk_text })) };
                    }
                } catch (err: any) {
                    apiData = { error: err.message || "Failed to search knowledge." };
                }
            } else {
                apiData = { error: `Unsupported tool type: ${tool.tool_type}` };
            }
          } else {
            logger.warn({ event: 'tool_permission_denied', tool_name: call.name });
            apiData = { error: "Tool permission denied or tool not found." };
          }
          toolResults.push({ functionResponse: { name: call.name, response: apiData, id: call.id } });
        }
      
      const parts: any[] = [];
      if (response.text) parts.push({ text: response.text });
      if (response.functionCalls) {
          response.functionCalls.forEach(call => parts.push({ functionCall: call }));
      }
      contents.push({ role: 'model', parts });
      contents.push({ role: 'user', parts: toolResults });
    } else if (response?.text) {
      aiReply = response.text;
      isDone = true;
    } else {
      aiReply = "I'm having trouble generating a response.";
      isDone = true;
    }
  }

  // If the AI exhausted its tool-call loop without producing a final reply,
  // auto-handoff to a human agent instead of sending a generic error.
  if (!isDone && loops >= maxLoops) {
    logger.warn({ event: 'tool_loop_exhausted', conversationId, loops }, 'AI exhausted tool call limit. Auto-handoff triggered.');
    try {
      await updateConversationStateAtomic(conversationId, {
        state: 'WAITING_HUMAN',
        handoff_reason: 'AI_TOOL_LOOP_EXHAUSTED',
        timeout_at: null,
        timeout_action: null,
      });
      const systemMessages = configCache.getTable('system_messages');
      const msg = systemMessages.find((m: { message_key: string }) => m.message_key === 'handoff_waiting');
      await sendWhatsAppMessage(
        remoteJid,
        msg?.content || 'আমি আপনার অনুরোধটি সম্পূর্ণভাবে প্রক্রিয়া করতে পারছি না। আপনাকে একজন সাপোর্ট এজেন্টের সাথে সংযুক্ত করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।',
        conversationId,
        'SYSTEM'
      );
      return { type: 'HANDOFF' as const, reason: 'AI_TOOL_LOOP_EXHAUSTED' };
    } catch (handoffErr) {
      logger.error({ err: handoffErr }, 'Auto-handoff after loop exhaustion failed');
      // Fall through to normal reply handling below
    }
  }

  if (aiReply) {
    // Re-verify state hasn't changed to HUMAN_ACTIVE mid-flight before we send
    const { data: finalCheck } = await supabase.from('conversations').select('state').eq('id', conversationId).single();
    if (finalCheck && !['AI_ACTIVE', 'WAITING_INPUT'].includes(finalCheck.state)) {
      logger.warn({ event: 'human_takeover_prevented_ai_message' });
      throw new ConcurrentStateConflict('State conflict: conversation is no longer controlled by AI');
    }
    await sendWhatsAppMessage(remoteJid, aiReply, conversationId);
  } else {
    // Re-verify state for failure message
    const { data: finalCheck } = await supabase.from('conversations').select('state').eq('id', conversationId).single();
    if (finalCheck && !['AI_ACTIVE', 'WAITING_INPUT'].includes(finalCheck.state)) {
      throw new ConcurrentStateConflict('State conflict');
    }
    await sendWhatsAppMessage(remoteJid, "I'm having trouble processing that right now.", conversationId);
  }
  
  return { type: 'CONTINUE' };
}
