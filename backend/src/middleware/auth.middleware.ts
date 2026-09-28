import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { supabase } from '../config/supabase.js';
import type { ActorContext } from '../types/handoff.types.js';

const logger = pino({ name: 'auth-middleware' });

declare global {
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT using Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.warn({ event: 'AUTH_FAILED', error: userError }, 'Invalid authentication token');
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    // Check if the user is an admin
    const { data: adminRecord } = await supabase
      .from('admins')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminRecord) {
      req.actor = {
        id: user.id,
        type: 'ADMIN',
        agentId: adminRecord.id,
        organizationId: adminRecord.organization_id,
        email: user.email!,
        name: adminRecord.name
      };
      return next();
    }

    // Check if the user is a human agent
    const { data: humanAgent } = await supabase
      .from('human_agents')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (humanAgent) {
      req.actor = {
        id: user.id,
        type: 'AGENT',
        agentId: humanAgent.id,
        organizationId: humanAgent.organization_id,
        email: user.email!,
        name: humanAgent.name
      };
      return next();
    }

    // Neither admin nor agent
    logger.warn({ event: 'USER_UNAUTHORIZED', userId: user.id }, 'User not registered as admin or agent');
    res.status(403).json({ error: 'User not registered as admin or agent' });
  } catch (error) {
    logger.error({ event: 'AUTH_ERROR', error }, 'Unexpected error in auth middleware');
    res.status(500).json({ error: 'Internal server error' });
  }
};
