import { generateStructuredContent } from '../ai/llm_service.js';
import { modelResolver } from '../ai/resolvers.js';
import { logger } from '../../app.js';

export type InterruptionType = 'ANSWER' | 'DIGRESSION_QUESTION' | 'CANCEL_OR_SWITCH';

export interface InterruptionResult {
  type: InterruptionType;
  reason?: string;
}

export async function classifyWorkflowInput(
  userMessage: string,
  pendingQuestion: string,
  workflowName: string
): Promise<InterruptionResult> {
  const trimmed = userMessage.trim().toLowerCase();

  // 1. Fast heuristics for explicit cancellations / resets
  const cancelKeywords = [
    'cancel', 'stop', 'reset', '/cancel', '/reset', 'abort',
    'nevermind', 'never mind', 'exit', 'quit',
    'বাতিল', 'বন্ধ কর', 'থামুন', 'ক্যানসেল'
  ];
  if (cancelKeywords.includes(trimmed)) {
    return { type: 'CANCEL_OR_SWITCH', reason: 'User explicitly cancelled or reset' };
  }

  try {
    const modelConfig = await modelResolver.resolve('ROUTER');

    const prompt = `You are a conversation flow supervisor for a hospital WhatsApp assistant.
The user is currently inside the "${workflowName}" workflow.
The bot asked the user:
Pending Question: "${pendingQuestion}"

The user replied with:
User Reply: "${userMessage}"

Determine the user's intent (supports English, Bengali, or Banglish):
1. "ANSWER": The user is directly or indirectly answering the pending question (e.g. names, numbers, dates, departments, "yes", "no", "alone", "none", "dr. reddy", "tomorrow", "গ্যাস্ট্রো", "হ্যাঁ", "না", etc.).
2. "DIGRESSION_QUESTION": The user is asking an unrelated question, inquiry, or requesting information instead of answering (e.g. "What is AIG?", "Who is Dr. Reddy?", "How much does an endoscopy cost?", "Where is your office?", "AIG কি?", "খরচ কত?").
3. "CANCEL_OR_SWITCH": The user wants to cancel the current process or explicitly switch to a completely different service (e.g. "I want doctor appointment instead", "Cancel this", "I don't need visa anymore", "অন্য সার্ভিস চাই").

Respond in valid JSON only.`;

    const schema = {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["ANSWER", "DIGRESSION_QUESTION", "CANCEL_OR_SWITCH"],
          description: "Classification of user input"
        },
        reason: {
          type: "string",
          description: "Brief reason for classification"
        }
      },
      required: ["type"]
    };

    const res = await generateStructuredContent(
      prompt,
      modelConfig.name,
      schema,
      0.1
    );

    if (res && res.type) {
      logger.info({
        event: 'workflow_input_classified',
        type: res.type,
        reason: res.reason,
        userMessage: userMessage.substring(0, 80)
      });
      return {
        type: res.type as InterruptionType,
        reason: res.reason
      };
    }

    // Default to ANSWER if classifier returns empty
    return { type: 'ANSWER', reason: 'Default fallback' };
  } catch (error) {
    logger.error({ err: error }, 'Error in classifyWorkflowInput');
    // If classification fails, assume ANSWER to avoid blocking the workflow
    return { type: 'ANSWER', reason: 'Error fallback' };
  }
}
