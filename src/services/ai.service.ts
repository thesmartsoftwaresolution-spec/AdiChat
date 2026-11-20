import type { AIAssistant } from '../types/database';

export interface AiChatRequest {
  prompt: string;
  assistant: AIAssistant;
  thinkingMode: boolean;
  history: Array<{ role: 'user' | 'model'; text: string }>;
}

export interface AiChatResponse {
  text: string;
  model: string;
  thinkingMode: boolean;
  thinkingLevel: 'HIGH' | 'LOW';
  latencyMs: number;
  requestId: string;
}

export async function requestAssistantReply(payload: AiChatRequest): Promise<AiChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      assistantName: payload.assistant.name,
      systemInstruction: payload.assistant.instructions,
      tone: payload.assistant.tone ?? undefined,
      language: payload.assistant.language ?? undefined,
      thinkingMode: payload.thinkingMode,
      history: payload.history,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<AiChatResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI request failed with status ${res.status}`);
  }

  if (!data.text) {
    throw new Error('The assistant returned an empty response. Please try again.');
  }

  return data as AiChatResponse;
}
