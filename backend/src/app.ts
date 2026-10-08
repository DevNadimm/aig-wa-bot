import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pino from 'pino';

// Initialize logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic health check route
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'AIG WA BOT Engine is running' });
  });

  // WhatsApp connection status endpoint
  app.get('/api/whatsapp/status', async (req: Request, res: Response) => {
    const { connectionState } = await import('./core/whatsapp/connection.js');
    res.json(connectionState);
  });

  app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
    const { initWhatsApp, connectionState } = await import('./core/whatsapp/connection.js');
    connectionState.status = 'GENERATING_QR';
    connectionState.qr = '';
    initWhatsApp('main-bot');
    res.json({ success: true, message: 'Generating QR code...' });
  });

  app.post('/api/whatsapp/logout', async (req: Request, res: Response) => {
    const { getWhatsAppSocket } = await import('./core/whatsapp/sender.js');
    const sock = getWhatsAppSocket();
    if (sock) {
      await sock.logout();
      res.json({ success: true, message: 'Logged out' });
    } else {
      res.status(400).json({ error: 'No active socket' });
    }
  });

  // Phase 6: Handoff routes
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/handoff')) {
      const { default: handoffRoutes } = await import('./core/handoff/handoff.routes.js');
      handoffRoutes(req, res, next);
    } else {
      next();
    }
  });

  app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
    try {
      // Secure the send endpoint
      const { authMiddleware } = await import('./middleware/auth.middleware.js');
      await new Promise<void>((resolve, reject) => {
        authMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { phone, lid, text, conversationId, senderType, senderName } = req.body;
      const { sendWhatsAppMessage } = await import('./core/whatsapp/sender.js');
      
      let remoteJid = '';
      if (lid) {
          remoteJid = `${lid}@lid`;
      } else {
          // Fallback: If the phone number is very long (15+ digits), it's likely a WhatsApp LID that got saved as phone
          const isLid = phone && phone.toString().length >= 15;
          remoteJid = isLid ? `${phone}@lid` : `${phone}@s.whatsapp.net`;
      }
      await sendWhatsAppMessage(remoteJid, text, conversationId, senderType || 'AI', senderName);
      res.json({ success: true });
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Failed to send' });
      }
    }
  });

  // Mock API Endpoint for Doctor Availability
  app.post('/api/mock/availability', (req: Request, res: Response) => {
    const { doctor_name, date } = req.body;
    logger.info(`Mock API called: checking availability for ${doctor_name} on ${date}`);
    
    // Simulate API response
    const slots = ['10:00 AM', '12:30 PM', '04:00 PM'];
    res.json({
      success: true,
      data: {
        doctor: doctor_name,
        date: date || new Date().toISOString().split('T')[0],
        available_slots: slots,
        message: `${doctor_name} is available at ${slots.join(', ')}.`
      }
    });
  });

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  return app;
}

// Trigger restart

// Trigger restart for Fallback update

// Trigger restart for ApiError update
