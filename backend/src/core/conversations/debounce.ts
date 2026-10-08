import { logger } from '../../app.js';

export interface BufferedMessage {
  remoteJid: string;
  text: string;
  botId: string;
  organizationId: string;
  realPhone?: string;
  pushName?: string;
  messageId?: string;
  lid?: string;
  isFromMe: boolean;
  receivedAt: number;
}

interface PendingEntry {
  messages: BufferedMessage[];
  timer: ReturnType<typeof setTimeout>;
  /** Phone/LID key used for deduplication */
  userKey: string;
}

type FlushCallback = (merged: BufferedMessage) => void;

/**
 * In-memory debounce queue for WhatsApp messages.
 * 
 * When a user sends multiple messages in rapid succession (common on WhatsApp),
 * this service buffers them and concatenates into a single message before
 * forwarding to the pipeline. This prevents:
 * - Multiple parallel workflow triggers for the same user
 * - Race conditions on conversation state
 * - Wasted AI API calls on partial messages
 */
export class MessageDebouncer {
  private pending = new Map<string, PendingEntry>();
  private flushCallback: FlushCallback;
  private debounceMs: number;

  constructor(flushCallback: FlushCallback, debounceMs: number = 3000) {
    this.flushCallback = flushCallback;
    this.debounceMs = debounceMs;
  }

  /**
   * Add a message to the debounce buffer.
   * If a timer is already running for this user, it resets.
   * Once the timer expires (no new messages within debounceMs), all buffered
   * messages are concatenated and flushed to the pipeline.
   */
  push(msg: BufferedMessage): void {
    const userKey = msg.realPhone || msg.remoteJid.split('@')[0];

    const existing = this.pending.get(userKey);

    if (existing) {
      // Reset the timer — user is still typing
      clearTimeout(existing.timer);
      existing.messages.push(msg);
      logger.info({ event: 'debounce_buffered', userKey, count: existing.messages.length }, `Buffered message #${existing.messages.length} for ${userKey}`);
    } else {
      // First message from this user in this window
      const entry: PendingEntry = {
        messages: [msg],
        timer: null as any,
        userKey,
      };
      this.pending.set(userKey, entry);
      logger.info({ event: 'debounce_started', userKey }, `Debounce timer started for ${userKey}`);
    }

    // (Re)start the timer
    const entry = this.pending.get(userKey)!;
    entry.timer = setTimeout(() => this.flush(userKey), this.debounceMs);
  }

  /**
   * Immediately flush all pending messages for a specific user.
   * Called when the debounce timer expires.
   */
  private flush(userKey: string): void {
    const entry = this.pending.get(userKey);
    if (!entry || entry.messages.length === 0) {
      this.pending.delete(userKey);
      return;
    }

    // Take the latest message as the base (it has the most recent metadata)
    const latest = entry.messages[entry.messages.length - 1];

    // Concatenate all message texts in order
    const mergedText = entry.messages
      .map(m => m.text)
      .filter(t => t && t.trim().length > 0)
      .join('\n');

    const merged: BufferedMessage = {
      ...latest,
      text: mergedText,
      // Use the first message's ID for dedup in DB
      messageId: entry.messages[0].messageId,
    };

    logger.info({
      event: 'debounce_flushed',
      userKey,
      messageCount: entry.messages.length,
      mergedLength: mergedText.length,
    }, `Flushed ${entry.messages.length} messages for ${userKey}`);

    // Cleanup
    this.pending.delete(userKey);

    // Forward to pipeline
    this.flushCallback(merged);
  }

  /**
   * Force-flush all pending entries. Useful during graceful shutdown.
   */
  flushAll(): void {
    for (const [userKey, entry] of this.pending.entries()) {
      clearTimeout(entry.timer);
      this.flush(userKey);
    }
  }

  /**
   * Check if a user currently has messages being buffered.
   */
  hasPending(userKey: string): boolean {
    return this.pending.has(userKey);
  }

  /**
   * Get the count of users currently being debounced.
   */
  get pendingCount(): number {
    return this.pending.size;
  }
}
