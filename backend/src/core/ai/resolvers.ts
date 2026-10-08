import { configCache } from '../config/cache.js';
import { logger } from '../../app.js';

import { getBotConfig } from './llm_service.js';

export class ModelResolver {
  async resolve(purpose: 'ROUTER' | 'WORKER' | 'FALLBACK', agentId?: string) {
    const config = await getBotConfig();
    const activeProvider = config.provider;
    const models = configCache.getTable('ai_models');
    
    if (purpose === 'WORKER' && agentId) {
      const agent = configCache.getRecord('ai_agents', agentId);
      if (agent && agent.model_id) {
        const model = configCache.getRecord('ai_models', agent.model_id);
        if (model && model.is_active) {
          if (model.provider !== activeProvider) {
            throw new Error(`Agent model configuration error: Agent uses a model from '${model.provider}' but the global active provider is '${activeProvider}'. Please update the agent's model in the Admin Panel.`);
          }
          return {
            name: model.name,
            temperature: agent.temperature || model.default_temperature || 0.7,
            maxTokens: agent.max_tokens || model.default_max_tokens || 1024,
          };
        }
      }
    }
    
    // Fallback or Router: find the explicitly configured default model
    const defaultModel = models.find(m => m.is_active && m.provider === activeProvider && m.is_default);
    
    if (!defaultModel) {
      throw new Error(`System model configuration error: No explicit default model configured for the global provider '${activeProvider}'. Please configure one in the database.`);
    }

    return {
      name: defaultModel.name,
      temperature: defaultModel.default_temperature || 0.7,
      maxTokens: defaultModel.default_max_tokens || 1024,
    };
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
    let finalPrompt = promptContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined ? variables[trimmedKey] : match;
    });

    if (type === 'AGENT') {
      const waRules = `\n\nCRITICAL FORMATTING RULES FOR WHATSAPP:
- NEVER use markdown tables (|---|). They look terrible on WhatsApp. Always use clean lists.
- For lists, use simple numbers (1., 2.) or bullets (-). Do NOT use excessive emojis.
- Use WhatsApp formatting: *bold* (single asterisk), _italics_ (underscores), ~strikethrough~ (tildes).
- NEVER use standard markdown bold (**text**). NEVER use markdown headings (# Heading).
- Keep text concise and easily readable on mobile screens.

CRITICAL TOOL USAGE RULES:
- If a tool requires parameters (like date, time, name, phone, etc.), you MUST ask the user for them if they haven't provided them yet.
- NEVER invent, guess, or hallucinate missing parameters. 
- NEVER call a tool with dummy data. Ask the user one or two questions at a time until you have all required information before calling the tool.`;
      finalPrompt += waRules;
    }

    return finalPrompt;
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
