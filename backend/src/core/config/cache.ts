import { supabase } from "../../config/supabase.js";
import { logger } from "../../app.js";

class ConfigCache {
  private cache = new Map<string, any[]>();
  private initialized = false;

  private tablesToCache = [
    "ai_agents",
    "ai_models",
    "ai_prompts",
    "intents",
    "workflows",
    "workflow_steps",
    "workflow_transitions",
    "tools",
    "tool_parameters",
    "tool_permissions",
    "api_connections",
    "tool_credentials",
    "business_rules",
    "human_agents",
    "agent_teams",
    "human_agent_teams",
    "handoff_rules",
    "system_messages"
  ];

  async init() {
    if (this.initialized) return;
    
    logger.info("Initializing Configuration Cache...");
    await this.reloadAll();

    const channel = supabase.channel("config_cache");
    
    for (const table of this.tablesToCache) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        async (payload) => {
          logger.info(`Detected change in ${table}, reloading cache...`);
          await this.reloadTable(table);
        }
      );
    }
    
    channel.subscribe();
    this.initialized = true;
    logger.info("Configuration Cache initialized and subscribing to realtime events.");
  }

  private async reloadAll() {
    await Promise.all(this.tablesToCache.map(table => this.reloadTable(table)));
  }

  private async reloadTable(table: string) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        logger.error({ err: error }, `Failed to reload table ${table} into cache`);
        return;
      }
      this.cache.set(table, data || []);
    } catch (err) {
      logger.error({ err }, `Exception reloading table ${table} into cache`);
    }
  }

  getTable<T = any>(table: string): T[] {
    return this.cache.get(table) || [];
  }

  getRecord<T = any>(table: string, id: string): T | undefined {
    const records = this.getTable<T>(table);
    return records.find((r: any) => r.id === id);
  }
}

export const configCache = new ConfigCache();

