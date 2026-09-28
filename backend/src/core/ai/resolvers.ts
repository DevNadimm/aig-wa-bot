import { configCache } from '../config/cache.js';
import { logger } from '../../app.js';

export class ModelResolver {
  async resolve(purpose: 'ROUTER' | 'WORKER' | 'FALLBACK', agentId?: string) {
    if (purpose === 'WORKER' && agentId) {
      const agent = configCache.getRecord('ai_agents', agentId);
      if (agent && agent.model_id) {
        const model = configCache.getRecord('ai_models', agent.model_id);
        if (model && model.is_active) {
          return {
            name: model.name, // e.g. gemini-1.5-flash
            temperature: agent.temperature || model.default_temperature || 0.7,
            maxTokens: agent.max_tokens || model.default_max_tokens || 1024,
          };
        }
      }
    }
    
    // Fallback or Router: prioritize 'flash' for routing to save tokens, otherwise pick first active
    const models = configCache.getTable('ai_models');
    logger.info(`Cached models for router: ${models.map(m => m.name).join(', ')}`);
    
    let fallbackModel;
    if (purpose === 'ROUTER') {
      fallbackModel = models.find(m => m.is_active && m.name.includes('flash'));
    }
    
    if (!fallbackModel) {
      fallbackModel = models.find(m => m.is_active);
    }
    
    if (fallbackModel) {
      return {
        name: fallbackModel.name,
        temperature: fallbackModel.default_temperature || 0.7,
        maxTokens: fallbackModel.default_max_tokens || 1024,
      };
    }
    
    // Ultimate failsafe
    logger.warn(`ModelResolver: No active model found in DB for purpose ${purpose}. Falling back to gemini-3.5-flash-lite.`);
    return { name: 'gemini-3.5-flash-lite', temperature: 0.7, maxTokens: 1024 };
  }
}

export class PromptResolver {
  async resolve(type: 'ROUTER' | 'AGENT' | 'FALLBACK', agentId?: string, variables: Record<string, string> = {}) {
    let promptContent = '';
    
    // First try to fetch from ai_prompts table
    const prompts = configCache.getTable('ai_prompts');
    
    if (type === 'AGENT' && agentId) {
      const agentPrompt = prompts.find(p => p.agent_id === agentId && p.type === 'AGENT');
      if (agentPrompt && agentPrompt.content) {
        promptContent = agentPrompt.content;
      } else {
        // Fallback to agent.system_prompt
        const agent = configCache.getRecord('ai_agents', agentId);
        if (agent && agent.system_prompt) {
          promptContent = agent.system_prompt;
        }
      }
    } else if (type === 'ROUTER') {
      const routerPrompt = prompts.find(p => p.type === 'ROUTER');
      if (routerPrompt && routerPrompt.content) {
        const intents = configCache.getTable('intents').filter(i => i.status === 'ACTIVE');
        const intentDescriptions = intents.map(i => `- ${i.slug}: ${i.description || i.name}`).join('\n');
        promptContent = routerPrompt.content + '\n\nAvailable Intents:\n' + intentDescriptions + '\n- fallback: Use this if the message does not match any of the above intents clearly.';
      } else {
        // Dynamic construction based on active intents from cache
        const intents = configCache.getTable('intents').filter(i => i.status === 'ACTIVE');
        const intentDescriptions = intents.map(i => `- ${i.slug}: ${i.description || i.name}`).join('\n');
        
        promptContent = `You are a routing agent for a WhatsApp Bot.
Your job is to analyze the user's message and determine their intent.

Available Intents:
${intentDescriptions}
- fallback: Use this if the message does not match any of the above intents clearly.

Respond with the identified intent slug and your confidence level (0.0 to 1.0).`;
      }
    } else {
      promptContent = "You are a helpful assistant.";
    }

    // Safe interpolation logic
    return promptContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined ? variables[trimmedKey] : match;
    });
  }
}

export class AgentResolver {
  async resolve(intentSlug: string) {
    const intents = configCache.getTable('intents');
    const intent = intents.find(i => i.slug === intentSlug && i.status === 'ACTIVE');
    
    if (intent && intent.agent_id) {
      const agent = configCache.getRecord('ai_agents', intent.agent_id);
      if (agent && agent.status === 'ACTIVE') {
        return agent;
      }
    }
    
    logger.warn(`AgentResolver: No active agent found for intent slug ${intentSlug}. Returning null.`);
    return null;
  }
}

export class ContextBuilder {
  async build(params: {
    conversationId: string,
    customerId?: string,
    currentMessage?: string,
    historyData: any[]
  }) {
    // 1. History mapping
    const contents: any[] = [];
    
    if (params.historyData && params.historyData.length > 0) {
      // Ensure chronological order. Usually it's passed descending from DB, so reverse it if needed.
      // Assuming params.historyData is already chronologically sorted (oldest first)

      // Phase 6: Inject human session summary if available (for AI resumption after human handoff)
      const summaryEntry = params.historyData.find(
        (msg) => msg.sender_type === 'SYSTEM' && msg.content?.startsWith('=== Human Agent Session Summary ===')
      );

      params.historyData.forEach((msg) => {
        const role = (msg.sender_type === 'CUSTOMER' || msg.sender_type === 'SYSTEM') ? 'user' : 'model'; // AI, HUMAN, HUMAN_AGENT → model
        
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push({ text: msg.content });
        } else {
          contents.push({ role: role, parts: [{ text: msg.content }] });
        }
      });
    }

    // 2. Add current message if not already in history
    if (params.currentMessage) {
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
         contents[contents.length - 1].parts.push({ text: params.currentMessage });
      } else {
         contents.push({ role: 'user', parts: [{ text: params.currentMessage }] });
      }
    }

    // 3. Ensure last role is 'user' for Gemini compatibility if the history ended on 'model'
    if (contents.length > 0 && contents[contents.length - 1].role === 'model') {
       contents.push({ role: 'user', parts: [{ text: 'Please continue.' }] });
    }
    
    return contents;
  }
}

export const modelResolver = new ModelResolver();
export const promptResolver = new PromptResolver();
export const agentResolver = new AgentResolver();
export const contextBuilder = new ContextBuilder();
