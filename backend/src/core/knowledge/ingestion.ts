import { supabase } from '../../config/supabase.js';
import { logger } from '../../app.js';
import { generateEmbedding } from '../ai/llm_service.js';
import * as net from 'net';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const parsePdf = require('pdf-parse');

/**
 * Basic text chunker. 
 * Splits by newlines or paragraphs and groups them up to a rough max character limit.
 */
function chunkText(text: string, maxChars: number = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if (currentChunk.length + p.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n\n' : '') + p;
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function normalizeHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

async function safeFetchUrl(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  const blockedHostnames = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
  
  if (blockedHostnames.includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error('Access to internal hostnames is prohibited.');
  }

  if (net.isIPv4(parsedUrl.hostname)) {
    const parts = parsedUrl.hostname.split('.').map(Number);
    if (
      parts[0] === 10 || 
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || 
      (parts[0] === 192 && parts[1] === 168)
    ) {
      throw new Error('Access to private IP ranges is prohibited.');
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
  clearTimeout(timeout);
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    const buffer = await res.arrayBuffer();
    const parsed = await parsePdf(Buffer.from(buffer));
    return parsed.text;
  }
  
  if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || contentType.includes('application/msword')) {
    throw new Error('DOCX/DOC formats are not yet supported. Please provide PDF or plain text.');
  }

  const text = await res.text();
  if (contentType.includes('text/html')) {
    return normalizeHtml(text);
  }
  
  return text;
}

export async function ingestDocument(
  sourceId: string, 
  title: string, 
  content: string, 
  storageUrl?: string
) {
  logger.info({ event: 'knowledge_ingestion_started', source_id: sourceId, title });

  try {
    let finalContent = content || '';

    // If storageUrl exists, attempt to fetch it safely
    if (storageUrl && (!finalContent || finalContent.trim().length === 0)) {
      try {
        finalContent = await safeFetchUrl(storageUrl);
      } catch (err: any) {
        logger.error({ event: 'knowledge_ingestion_failed', err, url: storageUrl }, 'Failed to fetch external resource');
        // Update source to FAILED status
        await supabase.from('knowledge_sources').update({ status: 'FAILED' }).eq('id', sourceId);
        return;
      }
    }

    if (!finalContent || finalContent.trim().length === 0) {
      logger.warn({ event: 'knowledge_ingestion_failed', reason: 'empty_content' });
      await supabase.from('knowledge_sources').update({ status: 'FAILED' }).eq('id', sourceId);
      return;
    }

    // 1. Create or Update Document Record (Reprocess safety)
    let docId: string;
    const { data: existingDoc } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('source_id', sourceId)
      .maybeSingle();

    if (existingDoc) {
       docId = existingDoc.id;
       await supabase.from('knowledge_documents').update({ content: finalContent, title }).eq('id', docId);
       // Delete existing chunks for safe reprocessing
       await supabase.from('knowledge_chunks').delete().eq('document_id', docId);
    } else {
       const { data: newDoc, error: docError } = await supabase
         .from('knowledge_documents')
         .insert([{ source_id: sourceId, title, content: finalContent, storage_url: storageUrl }])
         .select('id')
         .single();
       if (docError || !newDoc) {
         throw new Error('Document creation failed');
       }
       docId = newDoc.id;
    }

    // 2. Chunking
    const chunks = chunkText(finalContent);
    
    // 3. Embedding and Storage
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await generateEmbedding(chunkText);
      
      if (!embedding) {
        logger.warn(`Failed to generate embedding for chunk ${i} of document ${docId}`);
        continue;
      }

      const embeddingStr = `[${embedding.join(',')}]`;

      const { error: chunkError } = await supabase
        .from('knowledge_chunks')
        .insert([{
          document_id: docId,
          chunk_text: chunkText,
          embedding: embeddingStr
        }]);

      if (chunkError) {
        logger.error({ event: 'knowledge_ingestion_failed', err: chunkError }, `Failed to insert chunk ${i}`);
      } else {
        successCount++;
      }
    }

    await supabase.from('knowledge_sources').update({ status: 'PUBLISHED' }).eq('id', sourceId);

    logger.info({ 
        event: 'knowledge_ingestion_completed', 
        source_id: sourceId, 
        document_id: docId, 
        total_chunks: chunks.length, 
        successful_chunks: successCount 
    });

  } catch (err) {
    logger.error({ event: 'knowledge_ingestion_failed', err }, 'Exception during document ingestion');
    await supabase.from('knowledge_sources').update({ status: 'FAILED' }).eq('id', sourceId);
  }
}
