import { GoogleGenAI } from "@google/genai";
import { logger } from "../../app.js";
import dotenv from "dotenv";
import { supabase } from "../../config/supabase.js";

dotenv.config();

let cachedDbKey: string | null = null;
let lastKeyFetch = 0;

export async function getActiveApiKey(): Promise<string[]> {
  const now = Date.now();
  if (now - lastKeyFetch > 60000) {
    try {
      const { data } = await supabase.from("bot_instances").select("llm_api_key").limit(1);
      if (data && data[0] && data[0].llm_api_key) {
        cachedDbKey = data[0].llm_api_key;
      }
      lastKeyFetch = now;
    } catch (e) {
      logger.error("Failed to fetch API key from DB");
    }
  }

  let dbKeys: string[] = [];
  if (cachedDbKey) {
    try {
      if (cachedDbKey.trim().startsWith("[")) {
        dbKeys = JSON.parse(cachedDbKey);
      } else {
        dbKeys = cachedDbKey.split(",").map(k => k.trim()).filter(Boolean);
      }
    } catch (e) {
      dbKeys = [cachedDbKey];
    }
  }
  return dbKeys;
}

async function withRetry<T>(operation: (client: GoogleGenAI) => Promise<T>): Promise<T> {
  const apiKeys = await getActiveApiKey();
  
  if (apiKeys.length === 0) {
    throw new Error("No GEMINI_API_KEY found in DB or .env. AI routing and generation will fail.");
  }

  let attempt = 0;
  while (attempt < apiKeys.length) {
    try {
      const client = new GoogleGenAI({ apiKey: apiKeys[attempt] });
      return await operation(client);
    } catch (error: any) {
      logger.warn(`API Key ${attempt + 1} failed with error ${error?.status || "unknown"}. Switching key...`);
      attempt++;
      if (attempt === apiKeys.length) {
          throw new Error("All API keys have been exhausted or failed.");
      }
    }
  }
  throw new Error("All API keys have been exhausted/rate limited.");
}

export async function generateStructuredContent(prompt: string, modelName: string, responseSchema: any, temperature: number = 0.1, maxOutputTokens?: number) {
  try {
    const response = await withRetry((client) => client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature,
        ...(maxOutputTokens && { maxOutputTokens })
      }
    }));
    
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    logger.error({ err: error }, "Failed to generate structured content from Gemini");
    return null;
  }
}

export async function generateWithTools(prompt: string, modelName: string, tools: any[], temperature: number = 0.2, maxOutputTokens?: number) {
  try {
    const response = await withRetry((client) => client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: tools,
        temperature,
        ...(maxOutputTokens && { maxOutputTokens })
      }
    }));
    
    return {
      text: response.text,
      functionCalls: response.functionCalls,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to generate content with tools from Gemini");
    return null;
  }
}

export async function generateGeneralResponse(prompt: string, modelName: string, systemInstruction?: string, temperature: number = 0.7, maxOutputTokens?: number) {
  try {
    const response = await withRetry((client) => client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        ...(systemInstruction && { systemInstruction }),
        temperature,
        ...(maxOutputTokens && { maxOutputTokens })
      }
    }));
    
    return response.text;
  } catch (error) {
    logger.error({ err: error }, "Failed to generate general response from Gemini");
    return null;
  }
}

export async function generateAgenticResponse(
  contents: any[], 
  modelName: string, 
  tools: any[], 
  systemInstruction: string,
  temperature: number = 0.2,
  maxOutputTokens?: number
) {
  try {
    const config: any = {
      temperature,
      ...(maxOutputTokens && { maxOutputTokens })
    };
    
    if (tools && tools.length > 0) {
      config.tools = tools;
    }
    
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await withRetry((client) => client.models.generateContent({
      model: modelName,
      contents,
      config
    }));
    
    return {
      text: response.text,
      functionCalls: response.functionCalls,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to generate agentic response from Gemini");
    return null;
  }
}

export function buildGeminiTools(dbTools: any[]) {
  if (!dbTools || dbTools.length === 0) return [];

  const functionDeclarations = dbTools.map(tool => {
    let parameters = tool.parameters;
    if (typeof parameters === 'string') {
        try {
            parameters = JSON.parse(parameters);
        } catch (e) {
            parameters = {};
        }
    }
    if (parameters && !parameters.type) {
        parameters = {
            type: "object",
            properties: parameters.properties || parameters,
            required: parameters.required || []
        };
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: parameters
    };
  });

  return [{
    functionDeclarations
  }];
}

export async function generateEmbedding(text: string, model: string = "text-embedding-004"): Promise<number[] | null> {
  return await withRetry(async (client) => {
    try {
      const response = await client.models.embedContent({
        model,
        contents: text,
        config: { outputDimensionality: 768 }
      });
      return response.embeddings?.[0]?.values || null;
    } catch (error) {
      logger.error({ err: error }, "Failed to generate embedding");
      return null;
    }
  });
}
