import { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../../app.js';

let globalSocket: WASocket | null = null;

export function setWhatsAppSocket(sock: WASocket) {
  globalSocket = sock;
}

export function getWhatsAppSocket() {
  return globalSocket;
}

import { supabase } from '../../config/supabase.js';

function formatForWhatsApp(text: string): string {
  if (!text) return text;
  
  let formatted = text;
  // 1. Remove Markdown headings (# Heading -> *Heading*)
  formatted = formatted.replace(/^#+\s+(.*)$/gm, '*$1*');
  
  // 2. Convert standard markdown bold to WhatsApp bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '*$1*');
  formatted = formatted.replace(/__(.*?)__/g, '*$1*');
  
  // 3. Convert markdown links [text](url) to plain text
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2');

  return formatted;
}

export async function sendWhatsAppMessage(
  remoteJid: string, 
  text: string, 
  conversationId?: string, 
  senderType: string = 'AI',
  senderName?: string
) {
  if (!globalSocket) {
    logger.error('WhatsApp socket is not initialized. Cannot send message.');
    return;
  }
  
  // Prefix text based on sender type
  let prefixedText = text;
  if (senderType === 'AI' || senderType === 'BOT') {
    prefixedText = `*BOT*\n\n${text}`;
  } else if (senderType === 'SYSTEM') {
    prefixedText = `*SYSTEM*\n\n${text}`;
  } else if (senderType === 'ADMIN') {
    prefixedText = `*ADMIN*\n\n${text}`;
  } else if (senderType === 'HUMAN_AGENT' || senderType === 'HUMAN') {
    const nameStr = senderName ? senderName.toUpperCase() : 'AGENT';
    prefixedText = `*${nameStr}*\n\n${text}`;
  }

  // Clean the remoteJid just in case it has a plus sign or spaces
  const cleanJid = remoteJid.replace('+', '').replace(/ /g, '');
  const formattedText = formatForWhatsApp(prefixedText);
  
  try {
    const sentMsg = await globalSocket.sendMessage(cleanJid, { text: formattedText });
    logger.info(`Message sent to ${cleanJid}`);
    
    if (conversationId) {
      let dbSenderType = senderType;
      if (senderType === 'ADMIN') {
         dbSenderType = 'HUMAN_AGENT'; // Fallback to avoid enum constraint errors if 'ADMIN' is not allowed in DB
      } else if (senderType === 'BOT') {
         dbSenderType = 'AI';
      }
      
      await supabase.from('conversation_messages').insert([{
        conversation_id: conversationId,
        sender_type: dbSenderType,
        content: text, // store original un-prefixed text in DB
        status: 'sent',
        whatsapp_message_id: sentMsg?.key?.id || null
      }]);
    }
  } catch (error) {
    logger.error({ err: error }, `Failed to send message to ${remoteJid}`);
  }
}
