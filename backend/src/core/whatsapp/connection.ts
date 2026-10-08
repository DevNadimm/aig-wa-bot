import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, WASocket } from '@whiskeysockets/baileys';
import { logger } from '../../app.js';
import { globalConfig } from '../../server.js';
import { processIncomingMessage } from '../conversations/pipeline.js';
import { MessageDebouncer, BufferedMessage } from '../conversations/debounce.js';
import { Boom } from '@hapi/boom';
import path from 'path';

import { setWhatsAppSocket } from './sender.js';
import { supabase } from '../../config/supabase.js';

export const connectionState = {
  status: 'DISCONNECTED',
  qr: '',
  phone: ''
};

// Track the current socket to close it before reconnecting
let currentSocket: WASocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// LID to Phone number mapping (Baileys v6+ uses LID format for DMs)
const lidToPhone = new Map<string, string>();

// Debounce service: buffers rapid-fire messages from the same user
// and concatenates them before sending to the AI pipeline.
const DEBOUNCE_MS = parseInt(process.env.WA_DEBOUNCE_MS || '3000', 10);

const debouncer = new MessageDebouncer(async (merged: BufferedMessage) => {
  try {
    await processIncomingMessage(
      merged.remoteJid,
      merged.text,
      merged.botId,
      merged.organizationId,
      merged.realPhone,
      merged.pushName,
      merged.messageId,
      merged.lid,
      merged.isFromMe
    );
  } catch (err) {
    logger.error({ err }, 'Pipeline execution failed (debounced)');
  }
}, DEBOUNCE_MS);

export async function initWhatsApp(sessionName: string = 'default') {
  // Clear any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Close the previous socket cleanly to prevent "conflict" errors
  if (currentSocket) {
    try {
      currentSocket.ev.removeAllListeners('connection.update');
      currentSocket.ev.removeAllListeners('messages.upsert');
      currentSocket.ev.removeAllListeners('creds.update');
      currentSocket.end(undefined);
    } catch (e) {
      // Ignore errors during cleanup
    }
    currentSocket = null;
  }

  logger.info(`Initializing WhatsApp connection for session: ${sessionName}`);
  
  const sessionPath = path.join(process.env.WHATSAPP_SESSION_PATH || './sessions', sessionName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: logger.child({ level: 'silent' }),
  });

  currentSocket = sock;
  setWhatsAppSocket(sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      logger.info('QR Code received. Please scan with WhatsApp.');
      connectionState.status = 'QR';
      connectionState.qr = qr;
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      logger.error({ statusCode }, 'WhatsApp connection closed');
      
      if (shouldReconnect) {
        connectionState.status = 'DISCONNECTED';
        // Delay reconnection to avoid rapid-fire conflict loops
        logger.info('Will reconnect in 5 seconds...');
        reconnectTimer = setTimeout(() => {
          initWhatsApp(sessionName);
        }, 5000);
      } else {
        logger.warn('WhatsApp logged out. Clearing session and regenerating QR...');
        connectionState.status = 'LOGGED_OUT';
        connectionState.qr = '';
        
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "DISCONNECTED", phone_number: null })
          .eq("session_name", sessionName);
          
        // Clean up the session folder to force a fresh QR generation
        try {
          const fs = await import('fs');
          const sessionPath = path.join(process.env.WHATSAPP_SESSION_PATH || './sessions', sessionName);
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            logger.info('Session folder cleared successfully.');
          }
        } catch (err) {
          logger.error({ err }, 'Failed to clear session folder');
        }
        
        // Restart the connection to generate a new QR code immediately
        setTimeout(() => {
          initWhatsApp(sessionName);
        }, 2000);
      }
    } else if (connection === 'open') {
      logger.info('WhatsApp connection opened successfully!');
      connectionState.status = 'CONNECTED';
      connectionState.qr = '';
      
      const userId = sock.user?.id;
      const phone = userId ? userId.split(':')[0] : 'Unknown';
      connectionState.phone = phone;

      await supabase
        .from("whatsapp_sessions")
        .update({ status: "CONNECTED", phone_number: phone })
        .eq("session_name", sessionName);
    }
  });

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts) {
      // Sometimes contact contains both ID and LID, or we can just track them
      const id = contact.id;
      if (id.endsWith('@s.whatsapp.net')) {
        // Just cache it in case we need it
        lidToPhone.set(id, id.split('@')[0]);
      } else if (id.endsWith('@lid')) {
        // If we get an LID, check if the contact object has the real JID anywhere (e.g. attrs)
        // Baileys might store real phone in `contact.notify` or other fields
        // Since it varies, we'll try to rely on messages.upsert for now
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;
    
    for (const msg of m.messages) {
      if (msg.message) {
        const isFromMe = msg.key.fromMe || false;
        let remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        // Ignore status updates
        if (remoteJid === 'status@broadcast') continue;
        
        // Baileys v6+ uses LID format (e.g., 280981240049808@lid)
        // We need the real phone number. Try participant field or pushName.
        let realPhone = '';
        
        if (remoteJid?.endsWith('@lid')) {
          // For LID messages, try to get the real phone from msg.key.participant 
          // or the verifiedBizName / pushName
          // The actual phone can sometimes be resolved via the notify field
          const participant = msg.key.participant;
          if (participant && participant.includes('@s.whatsapp.net')) {
            realPhone = participant.split('@')[0];
            remoteJid = participant; // Use the real JID for replies
          } else {
            logger.info('LID msg details: ' + JSON.stringify(msg, null, 2));
            // Fallback: use the LID as identifier but log a warning
            realPhone = remoteJid?.split('@')[0] || '';
            logger.warn(`Could not resolve LID to phone for ${remoteJid}. Using LID as identifier.`);
          }
        } else if (remoteJid?.endsWith('@s.whatsapp.net')) {
          realPhone = remoteJid.split('@')[0];
        }

        const pushName = msg.pushName || '';
        const messageId = msg.key.id;
        
        logger.info(`Received message from ${remoteJid} (phone: ${realPhone}, name: ${pushName}): ${text}`);
        
        // Pass message to Message Pipeline via debounce buffer.
        // If the user sends multiple messages rapidly, they are concatenated
        // into a single message before the AI processes them.
        if (text && remoteJid && messageId) {
          const lid = remoteJid.endsWith('@lid') ? remoteJid.split('@')[0] : undefined;
          debouncer.push({
            remoteJid,
            text,
            botId: globalConfig.botId,
            organizationId: globalConfig.orgId,
            realPhone,
            pushName,
            messageId,
            lid,
            isFromMe,
            receivedAt: Date.now(),
          });
        }
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      if (update.update.status) {
        const statusVal = update.update.status;
        let newStatus = '';
        if (statusVal === 3) newStatus = 'delivered'; // WAMessageStatus.DELIVERY_ACK
        else if (statusVal === 4 || statusVal === 5) newStatus = 'read'; // READ or PLAYED
        
        if (newStatus && update.key.id) {
          await supabase.from('conversation_messages')
            .update({ status: newStatus })
            .eq('whatsapp_message_id', update.key.id);
        }
      }
    }
  });

  return sock;
}
