import { Router, Request, Response } from 'express';
import pino from 'pino';
import { supabase } from '../../config/supabase.js';

import {
  assignConversation,
  adminTakeover,
  transferConversation,
  releaseToAI,
  resolveConversation,
  reopenConversation
} from './ownership.service.js';
import { contextBuilderService } from './context-builder.service.js';
import { sendHumanMessage } from './human-message.service.js';
import { agentManagementService } from './agent-management.service.js';
import { listTeams } from './team.service.js';

import {
  ConcurrentStateConflict,
  OwnershipViolation,
  AuthorizationError,
  AgentNotFoundError,
  type ActorContext,
  type AgentAvailability
} from '../../types/handoff.types.js';

const logger = pino({ name: 'handoff-routes' });
const router = Router();

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ConcurrentStateConflict) {
    return res.status(409).json({ error: error.message });
  }
  if (error instanceof OwnershipViolation || error instanceof AuthorizationError) {
    return res.status(403).json({ error: error.message });
  }
  if (error instanceof AgentNotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  
  logger.error({ event: 'HANDOFF_ROUTE_ERROR', error }, 'Error processing handoff request');
  return res.status(500).json({ error: 'Internal server error' });
};

router.post('/assign', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId, agentId, teamId, reason } = req.body;
    const result = await assignConversation(conversationId, agentId, teamId, actor.id, actor.type, reason);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/takeover', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId } = req.body;
    const result = await adminTakeover(conversationId, actor.agentId || actor.id);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId, newAgentId, newTeamId } = req.body;
    const result = await transferConversation(conversationId, actor.id, actor.type, newAgentId, newTeamId);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/release', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId } = req.body;
    
    const releaseResult = await releaseToAI(conversationId, actor.id, actor.type);
    const summary = await contextBuilderService.buildHandoffContext(conversationId);
    
    await contextBuilderService.storeHandoffSummary(conversationId, summary);
    
    res.json(releaseResult);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/reply', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId, content } = req.body;
    const result = await sendHumanMessage(conversationId, actor.agentId || actor.id, actor.type, content);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId } = req.body;
    const result = await resolveConversation(conversationId, actor.id, actor.type);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/reopen', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { conversationId } = req.body;
    const result = await reopenConversation(conversationId, actor.id, actor.type);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/agents', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const { teamId, status, availability } = req.query;
    const result = await agentManagementService.listAgents(actor.organizationId, {
      teamId: teamId as string,
      status: status as string,
      availability: availability as string
    });
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/teams', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const result = await listTeams(actor.organizationId);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.put('/agents/:id/availability', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    const agentId = req.params.id;
    const { availability } = req.body;
    
    // Simple permission check: must be admin or the agent themselves
    if (actor.type !== 'ADMIN' && actor.agentId !== agentId) {
       return res.status(403).json({ error: 'Cannot change availability for other agents' });
    }
    
    await agentManagementService.setAgentAvailability(agentId as string, availability as AgentAvailability);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/conversations/assigned', async (req: Request, res: Response) => {
  try {
    const actor = req.actor as ActorContext;
    if (!actor.agentId) {
      res.status(400).json({ error: 'Actor missing agentId' });
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('assigned_agent_id', actor.agentId);

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
