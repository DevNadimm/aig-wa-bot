/**
 * llm_service.ts
 * Universal LLM Service — supports Google Gemini, Groq, and OpenRouter.
 * The active provider and API keys are loaded dynamically from the database,
 * so switching providers requires zero code changes.
 */

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { logger } from "../../app.js";
import { supabase } from "../../config/supabase.js";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type LLMProvider = "gemini" | "groq" | "openrouter";

interface BotConfig {
  provider: LLMProvider;
  keys: string[];
}

// Provider → base URL for OpenAI-compatible providers
const PROVIDER_BASE_URLS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

// ──────────────────────────────────────────────
// Config Cache (refreshed every 60 s)
// ──────────────────────────────────────────────

let cachedConfig: BotConfig | null = null;
let lastConfigFetch = 0;
const CONFIG_TTL_MS = 60_000;

async function getBotConfig(): Promise<BotConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastConfigFetch < CONFIG_TTL_MS) {
    return cachedConfig;
  }

  try {
    const { data } = await supabase
      .from("bot_instances")
      .select("llm_api_key, llm_provider")
      .limit(1)
      .single();

    if (data) {
      const provider = (data.llm_provider as LLMProvider) || "gemini";
      let keys: string[] = [];

      if (data.llm_api_key) {
        try {
          if (data.llm_api_key.trim().startsWith("[")) {
            keys = JSON.parse(data.llm_api_key);
          } else {
            keys = data.llm_api_key
              .split(",")
              .map((k: string) => k.trim())
              .filter(Boolean);
          }
        } catch {
          keys = [data.llm_api_key];
        }
      }

      cachedConfig = { provider, keys };
      lastConfigFetch = now;
    }
  } catch (e) {
    logger.error({ err: e }, "LLM Service: Failed to fetch bot config from DB");
  }

  return cachedConfig ?? { provider: "gemini", keys: [] };
}

/** Force-expire the config cache (called after admin saves new keys/provider). */
export function invalidateLLMCache() {
  cachedConfig = null;
  lastConfigFetch = 0;
}

// ──────────────────────────────────────────────
// Retry wrapper (cycles through all API keys)
// ──────────────────────────────────────────────

async function withKeyRotation<T>(
  operation: (key: string, provider: LLMProvider) => Promise<T>
): Promise<T> {
  const config = await getBotConfig();

  if (config.keys.length === 0) {
    throw new Error(
      `LLM Service: No API keys configured for provider "${config.provider}". Please add a key in Settings > API Keys.`
    );
  }

  let lastError: unknown;
  for (let i = 0; i < config.keys.length; i++) {
    try {
      logger.debug(`LLM Service: Trying ${config.provider} key #${i + 1}`);
      return await operation(config.keys[i], config.provider);
    } catch (error: any) {
      const status = error?.status ?? error?.statusCode ?? "unknown";
      logger.warn(
        `LLM Service: Key #${i + 1} failed [${config.provider}] — HTTP ${status}. ${
          i < config.keys.length - 1 ? "Trying next key…" : "All keys exhausted."
        }`
      );
      lastError = error;
    }
  }

  throw new Error(
    `LLM Service: All ${config.keys.length} API key(s) for provider "${config.provider}" failed. Last error: ${(lastError as any)?.message ?? lastError}`
  );
}

// ──────────────────────────────────────────────
// Helpers — build provider clients
// ──────────────────────────────────────────────

function makeOpenAICompatibleClient(key: string, provider: LLMProvider): OpenAI {
  const baseURL = PROVIDER_BASE_URLS[provider];
  if (!baseURL) throw new Error(`No base URL configured for provider: ${provider}`);
  return new OpenAI({
    apiKey: key,
    baseURL,
    defaultHeaders:
      provider === "openrouter"
        ? { "HTTP-Referer": "https://aig-wa-bot.vercel.app", "X-Title": "AIG WA Bot" }
        : undefined,
  });
}

// ──────────────────────────────────────────────
// Model name normalisation
//
// The DB stores a single generic model name that we map per provider so
// admins don't have to update the DB when switching providers.
// ──────────────────────────────────────────────

function normaliseModelName(modelName: string, provider: LLMProvider): string {
  if (provider === "gemini") return modelName; // keep as-is (e.g. "gemini-3.8-flash")

  // For OpenAI-compatible providers, map common Gemini names → provider equivalents
  const GROQ_MODELS: Record<string, string> = {
    "gemini-3.8-flash": "llama-3.3-70b-versatile",
    "gemini-3.5-flash": "llama-3.1-70b-versatile",
    "gemini-3.5-flash-lite": "llama-3.1-8b-instant",
    "gemini-3.1-pro-preview": "llama-3.3-70b-versatile",
    "gemini-2.5-flash": "llama-3.3-70b-versatile",
    "gemini-2.5-pro": "llama-3.3-70b-versatile",
  };

  const OPENROUTER_MODELS: Record<string, string> = {
    "gemini-3.8-flash": "meta-llama/llama-3.3-70b-instruct:free",
    "gemini-3.5-flash": "meta-llama/llama-3.1-70b-instruct:free",
    "gemini-3.5-flash-lite": "meta-llama/llama-3-8b-instruct:free",
    "gemini-3.1-pro-preview": "meta-llama/llama-3.3-70b-instruct:free",
    "gemini-2.5-flash": "meta-llama/llama-3.3-70b-instruct:free",
    "gemini-2.5-pro": "meta-llama/llama-3.3-70b-instruct:free",
  };

  if (provider === "groq") return GROQ_MODELS[modelName] ?? "llama-3.3-70b-versatile";
  if (provider === "openrouter")
    return OPENROUTER_MODELS[modelName] ?? "meta-llama/llama-3.3-70b-instruct:free";

  return modelName;
}

// ──────────────────────────────────────────────
// Public API — mirrors the old gemini.ts exports
// ──────────────────────────────────────────────

/**
 * Generate a JSON-structured response.
 * For Gemini: uses native responseSchema.
 * For Groq/OpenRouter: instructs the model to reply with JSON matching the schema.
 */
export async function generateStructuredContent(
  prompt: string,
  modelName: string,
  responseSchema: any,
  temperature: number = 0.1,
  maxOutputTokens?: number
): Promise<any> {
  try {
    return await withKeyRotation(async (key, provider) => {
      const resolvedModel = normaliseModelName(modelName, provider);

      if (provider === "gemini") {
        const client = new GoogleGenAI({ apiKey: key });
        const response = await client.models.generateContent({
          model: resolvedModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema,
            temperature,
            ...(maxOutputTokens && { maxOutputTokens }),
          },
        });
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
      }

      // OpenAI-compatible path (Groq / OpenRouter)
      const client = makeOpenAICompatibleClient(key, provider);
      const schemaDescription = JSON.stringify(responseSchema, null, 2);
      const augmentedPrompt = `${prompt}\n\nYou MUST respond with valid JSON only, matching this schema:\n${schemaDescription}`;

      const chat = await client.chat.completions.create({
        model: resolvedModel,
        messages: [{ role: "user", content: augmentedPrompt }],
        temperature,
        ...(maxOutputTokens && { max_tokens: maxOutputTokens }),
        response_format: { type: "json_object" },
      });

      const text = chat.choices[0]?.message?.content;
      if (!text) return null;
      return JSON.parse(text);
    });
  } catch (error) {
    logger.error({ err: error }, "LLM Service: Failed to generate structured content");
    return null;
  }
}

/**
 * Generate a plain text response (general conversational reply).
 */
export async function generateGeneralResponse(
  prompt: string,
  modelName: string,
  systemInstruction?: string,
  temperature: number = 0.7,
  maxOutputTokens?: number
): Promise<string | null> {
  try {
    return await withKeyRotation(async (key, provider) => {
      const resolvedModel = normaliseModelName(modelName, provider);

      if (provider === "gemini") {
        const client = new GoogleGenAI({ apiKey: key });
        const response = await client.models.generateContent({
          model: resolvedModel,
          contents: prompt,
          config: {
            ...(systemInstruction && { systemInstruction }),
            temperature,
            ...(maxOutputTokens && { maxOutputTokens }),
          },
        });
        return response.text ?? null;
      }

      const client = makeOpenAICompatibleClient(key, provider);
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });

      const chat = await client.chat.completions.create({
        model: resolvedModel,
        messages,
        temperature,
        ...(maxOutputTokens && { max_tokens: maxOutputTokens }),
      });
      return chat.choices[0]?.message?.content ?? null;
    });
  } catch (error) {
    logger.error({ err: error }, "LLM Service: Failed to generate general response");
    return null;
  }
}

/**
 * Generate an agentic multi-turn response with optional tool/function calling.
 */
export async function generateAgenticResponse(
  contents: any[],
  modelName: string,
  tools: any[],
  systemInstruction: string,
  temperature: number = 0.2,
  maxOutputTokens?: number
): Promise<{ text: string | undefined; functionCalls: any[] | undefined } | null> {
  try {
    return await withKeyRotation(async (key, provider) => {
      const resolvedModel = normaliseModelName(modelName, provider);

      if (provider === "gemini") {
        const client = new GoogleGenAI({ apiKey: key });
        const config: any = { temperature, ...(maxOutputTokens && { maxOutputTokens }) };
        if (tools?.length) config.tools = tools;
        if (systemInstruction) config.systemInstruction = systemInstruction;

        const response = await client.models.generateContent({
          model: resolvedModel,
          contents,
          config,
        });
        return { text: response.text, functionCalls: response.functionCalls };
      }

      // OpenAI-compatible path
      const client = makeOpenAICompatibleClient(key, provider);

      // Convert Gemini contents → OpenAI messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      for (const c of contents) {
        const role = c.role === "model" ? "assistant" : "user";
        const text = c.parts?.map((p: any) => p.text ?? "").join(" ") ?? "";
        messages.push({ role, content: text });
      }

      // Convert Gemini tool declarations → OpenAI format
      const openAiTools: OpenAI.Chat.ChatCompletionTool[] =
        tools?.flatMap((t: any) =>
          (t.functionDeclarations ?? []).map((fn: any) => ({
            type: "function" as const,
            function: {
              name: fn.name,
              description: fn.description,
              parameters: fn.parameters ?? { type: "object", properties: {} },
            },
          }))
        ) ?? [];

      const chatParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: resolvedModel,
        messages,
        temperature,
        ...(maxOutputTokens && { max_tokens: maxOutputTokens }),
        ...(openAiTools.length && { tools: openAiTools, tool_choice: "auto" }),
      };

      const chat = await client.chat.completions.create(chatParams);
      const choice = chat.choices[0];

      // Map OpenAI tool_calls → Gemini-style functionCalls
      const functionCalls = choice.message.tool_calls?.map((tc) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments ?? "{}"),
        id: tc.id,
      }));

      return {
        text: choice.message.content ?? undefined,
        functionCalls: functionCalls?.length ? functionCalls : undefined,
      };
    });
  } catch (error) {
    logger.error({ err: error }, "LLM Service: Failed to generate agentic response");
    return null;
  }
}

/**
 * Generate a response using tools (non-agentic, single-turn).
 * Used by workflow steps that need simple function dispatching.
 */
export async function generateWithTools(
  prompt: string,
  modelName: string,
  tools: any[],
  temperature: number = 0.2,
  maxOutputTokens?: number
): Promise<{ text: string | undefined; functionCalls: any[] | undefined } | null> {
  return generateAgenticResponse(
    [{ role: "user", parts: [{ text: prompt }] }],
    modelName,
    tools,
    "",
    temperature,
    maxOutputTokens
  );
}

/**
 * Build Gemini-style tool declarations from DB tool records.
 * Used by both Gemini and non-Gemini paths (we convert at call time for non-Gemini).
 */
export function buildGeminiTools(dbTools: any[]) {
  if (!dbTools || dbTools.length === 0) return [];

  const functionDeclarations = dbTools.map((tool) => {
    let parameters = tool.parameters;
    if (typeof parameters === "string") {
      try {
        parameters = JSON.parse(parameters);
      } catch {
        parameters = {};
      }
    }
    if (parameters && !parameters.type) {
      parameters = {
        type: "object",
        properties: parameters.properties ?? parameters,
        required: parameters.required ?? [],
      };
    }
    return { name: tool.name, description: tool.description, parameters };
  });

  return [{ functionDeclarations }];
}

/**
 * Generate a vector embedding for semantic search.
 * Embeddings are only supported via Gemini.
 * If another provider is active we fall back to Gemini using an env key (if available).
 */
export async function generateEmbedding(
  text: string,
  model: string = "text-embedding-004"
): Promise<number[] | null> {
  const config = await getBotConfig();

  // Always use Gemini for embeddings regardless of active provider
  const keys = config.provider === "gemini" ? config.keys : [];
  const envKey = process.env.GEMINI_API_KEY;
  const allKeys = envKey ? [...keys, envKey] : keys;

  if (allKeys.length === 0) {
    logger.warn("LLM Service: No Gemini key available for embeddings. Skipping.");
    return null;
  }

  for (const key of allKeys) {
    try {
      const client = new GoogleGenAI({ apiKey: key });
      const response = await client.models.embedContent({
        model,
        contents: text,
        config: { outputDimensionality: 768 },
      });
      return response.embeddings?.[0]?.values ?? null;
    } catch (error) {
      logger.warn({ err: error }, "LLM Service: Embedding attempt failed, trying next key");
    }
  }

  logger.error("LLM Service: All embedding attempts failed");
  return null;
}
