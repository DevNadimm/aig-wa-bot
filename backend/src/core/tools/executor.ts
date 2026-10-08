import { logger } from "../../app.js";
import * as net from "net";
import { supabase } from "../../config/supabase.js";
import * as crypto from "crypto";

export class ToolError extends Error {
  constructor(public type: string, message: string) {
    super(message);
    this.name = "ToolError";
  }
}

interface ToolExecutorResult {
  data?: any;
  error?: string;
  errorType?: string;
}

export function extractResponse(responseData: any, mapping: any): any {
  if (!mapping || !responseData) return responseData;
  if (typeof mapping === "string") {
    const keys = mapping.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "").split(".");
    let value = responseData;
    for (const key of keys) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return undefined; // Prevent prototype traversal
      }
      if (value === null || value === undefined) break;
      if (key === "response" || key === "data" && value[key] === undefined && value !== undefined) {
         continue; 
      }
      value = value[key];
    }
    return value;
  }
  return responseData;
}

export async function executeExternalApi(url: string, method: string, headers: any, body?: any, timeoutMs: number = 7000): Promise<ToolExecutorResult> {
  try {
    const parsedUrl = new URL(url);
    
    // 1. SSRF Protection: Reject private/internal IP ranges
    const blockedHostnames = [
      "localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254"
    ];
    
    if (blockedHostnames.includes(parsedUrl.hostname.toLowerCase())) {
      throw new ToolError("SSRF_BLOCKED", "Access to internal hostnames is prohibited.");
    }

    if (parsedUrl.hostname.endsWith(".internal") || parsedUrl.hostname.endsWith(".local")) {
      throw new ToolError("SSRF_BLOCKED", "Access to internal domains is prohibited.");
    }

    if (net.isIPv4(parsedUrl.hostname)) {
      const parts = parsedUrl.hostname.split(".").map(Number);
      if (
        parts[0] === 10 || 
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || 
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 169 && parts[1] === 254) // link-local
      ) {
        throw new ToolError("SSRF_BLOCKED", "Access to private IP ranges is prohibited.");
      }
    }
    
    const hostWithoutBrackets = parsedUrl.hostname.replace(/^\[|\]$/g, "");
    
    if (net.isIPv6(hostWithoutBrackets)) {
      const lower = hostWithoutBrackets.toLowerCase();
      const isPriv = lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
      if (isPriv) throw new ToolError("SSRF_BLOCKED", "Access to private IPv6 ranges is prohibited.");
    }

    // 2. Timeout Protection (Bounded max)
    // Strict timeout: cap at 10s max to prevent long hangs on slow 3rd-party APIs
    const boundedTimeout = Math.min(timeoutMs || 7000, 10000); 
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, boundedTimeout);

    const safeHeaders: Record<string, string> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        const lowerK = k.toLowerCase();
        if (lowerK.includes("auth") || lowerK.includes("key") || lowerK.includes("token") || lowerK.includes("secret") || lowerK.includes("pass")) {
          safeHeaders[k] = "***";
        } else {
          safeHeaders[k] = v as string;
        }
      }
    }

    logger.info({ url, method, headers: safeHeaders }, `Executing safe API request`);
    
    let response;
    try {
      response = await fetch(url, {
        method: method || "GET",
        headers: headers || { "Content-Type": "application/json" },
        body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
        redirect: "error" 
      });
    } catch (e: any) {
      if (e.name === "AbortError") throw new ToolError("TIMEOUT", "External service request timed out.");
      throw new ToolError("NETWORK_ERROR", e.message || "Network error occurred.");
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 500) throw new ToolError("REMOTE_SERVER_ERROR", `Remote server error: ${response.status}`);
    if (response.status === 429) throw new ToolError("RATE_LIMITED", "External service rate limit exceeded.");
    if (response.status === 401 || response.status === 403) throw new ToolError("AUTHORIZATION_ERROR", `Authorization failed: ${response.status}`);
    if (response.status === 404) throw new ToolError("NOT_FOUND", "External resource not found.");
    if (response.status >= 400) throw new ToolError("VALIDATION_ERROR", `Client error: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/octet-stream") || contentType.includes("image/") || contentType.includes("video/")) {
       throw new ToolError("RESPONSE_INVALID", "Binary responses are not supported.");
    }

    const text = await response.text();
    // 17. Response Size Limit
    if (text.length > 100000) {
      throw new ToolError("RESPONSE_TOO_LARGE", "Response exceeded size limit.");
    }

    let data = text;
    if (contentType.includes("application/json")) {
       try { data = JSON.parse(text); } catch (e) { throw new ToolError("RESPONSE_INVALID", "Malformed JSON response."); }
    }

    return { data };

  } catch (error: any) {
    logger.error({ err: error, url }, `API execution failed`);
    if (error instanceof ToolError) {
      return { error: error.message, errorType: error.type };
    }
    return { error: "External service is unavailable.", errorType: "UNKNOWN" };
  }
}

export async function executeIdempotentTool(
  conversationId: string,
  workflowId: string | undefined,
  stepId: string | undefined,
  toolName: string,
  method: string,
  url: string,
  headers: any,
  body: any,
  timeoutMs: number = 7000,
  supportsIdempotency: boolean = false
): Promise<ToolExecutorResult> {
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  const isSideEffect = !isSafeMethod;
  
  if (!isSideEffect || !workflowId || !stepId) {
    return await executeExternalApi(url, method, headers, body, timeoutMs);
  }

  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(body || {})).digest("hex");
  const idempotencyKey = `${conversationId}_${stepId}_${toolName}_${payloadHash}`;

  const { data: existingExecution } = await supabase
    .from("step_executions")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (existingExecution) {
    if (existingExecution.status === "SUCCEEDED") {
      logger.info({ event: "workflow_execution_reused", idempotency_key: idempotencyKey });
      return { data: existingExecution.result };
    }
    if (existingExecution.status === "RUNNING") {
      const startedAt = new Date(existingExecution.created_at).getTime();
      const age = Date.now() - startedAt;
      if (age < 30000) {
        logger.warn({ event: "workflow_state_conflict", idempotency_key: idempotencyKey });
        return { error: "Operation is currently processing. Please try again later.", errorType: "RATE_LIMITED" };
      }
    }
    if (existingExecution.status === "FAILED_UNKNOWN" && !supportsIdempotency) {
      logger.warn({ event: "workflow_unsafe_retry_blocked", idempotency_key: idempotencyKey });
      return { error: "Previous execution state unknown. Automatic retry blocked to prevent duplicate side effects.", errorType: "AUTHORIZATION_ERROR" };
    }
  }

  logger.info({ event: "tool_execution_started", idempotency_key: idempotencyKey, tool_name: toolName });
  await supabase.from("step_executions").upsert({
    conversation_id: conversationId,
    workflow_id: workflowId,
    step_id: stepId,
    idempotency_key: idempotencyKey,
    status: "RUNNING",
    updated_at: new Date().toISOString()
  });

  const finalHeaders: any = { ...headers };
  if (supportsIdempotency) {
    finalHeaders["Idempotency-Key"] = idempotencyKey;
  }

  const result = await executeExternalApi(url, method, finalHeaders, body, timeoutMs);

  if (!result.error) {
    logger.info({ event: "tool_execution_succeeded", idempotency_key: idempotencyKey });
    await supabase.from("step_executions").update({
      status: "SUCCEEDED",
      result: result.data,
      updated_at: new Date().toISOString()
    }).eq("idempotency_key", idempotencyKey);
  } else {
    const newStatus = (!supportsIdempotency && result.errorType === "TIMEOUT") ? "FAILED_UNKNOWN" : "FAILED";
    logger.info({ event: "tool_execution_failed", idempotency_key: idempotencyKey, error: result.error, status: newStatus });
    await supabase.from("step_executions").update({
      status: newStatus,
      result: { error: result.error, type: result.errorType },
      updated_at: new Date().toISOString()
    }).eq("idempotency_key", idempotencyKey);
  }

  return result;
}

