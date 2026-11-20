import { getSupabaseClient } from '../lib/supabase/client';
import type { AIAssistant } from '../types/database';

export interface AiChatRequest {
  prompt: string;
  assistant: AIAssistant;
  conversationId: string;
  thinkingMode: boolean;
}

export interface AiChatResponse {
  text: string;
  model: string;
  thinkingMode: boolean;
  thinkingLevel: 'HIGH' | 'LOW';
  latencyMs: number;
  requestId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export async function requestAssistantReply(payload: AiChatRequest): Promise<AiChatResponse> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase authentication is not configured.');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Please sign in again to use AI assistants.');
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      assistantId: payload.assistant.id,
      conversationId: payload.conversationId,
      thinkingMode: payload.thinkingMode,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<AiChatResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI request failed with status ${res.status}`);
  }
  if (!data.text || !data.model || !data.assistantMessageId) {
    throw new Error('The assistant returned an incomplete response. Please retry.');
  }

  return data as AiChatResponse;
}
