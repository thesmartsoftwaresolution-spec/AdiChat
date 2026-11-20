import type { AIAssistant, GroupAssistant } from '../types/database';

/**
 * Generates canonical direct-conversation pair key from two participant UUIDs
 * so (A, B) and (B, A) always map to the same direct conversation.
 */
export function buildDirectPairKey(userA: string, userB: string): string {
  if (userA === userB) {
    throw new Error('Cannot create a direct pair key with identical user IDs.');
  }
  return [userA, userB].sort().join(':');
}

/**
 * Extracts @mention handles from a chat message body.
 */
export function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

/**
 * Determines which enabled group AI assistants should reply to a given message.
 */
export function resolveTriggeredGroupAssistants(
  body: string,
  groupAssistants: GroupAssistant[],
  allAssistants: AIAssistant[],
  allowAiAutoRespond = true
): AIAssistant[] {
  if (!allowAiAutoRespond) return [];
  const mentions = extractMentions(body);
  const triggered: AIAssistant[] = [];

  for (const ga of groupAssistants) {
    if (!ga.is_enabled) continue;
    const assistant = allAssistants.find((a) => a.id === ga.assistant_id && a.is_enabled);
    if (!assistant) continue;

    if (ga.response_mode === 'every_message') {
      triggered.push(assistant);
      continue;
    }

    const handleLower = assistant.handle.replace(/^@/, '').toLowerCase();
    const compactName = assistant.name.replace(/\s+/g, '').toLowerCase();
    if (mentions.includes(handleLower) || mentions.includes(compactName)) {
      triggered.push(assistant);
    }
  }

  return triggered;
}

/**
 * Heuristic detector for complex queries that benefit from Thinking Mode (gemini-4-hydrogen, HIGH).
 */
export function shouldRecommendThinkingMode(prompt: string): boolean {
  const normalized = prompt.trim().toLowerCase();
  if (normalized.length >= 120) return true;
  const complexKeywords = [
    'architecture',
    'compare',
    'tradeoff',
    'trade-off',
    'concurrency',
    'algorithm',
    'complexity',
    'prove',
    'proof',
    'debug',
    'root cause',
    'security',
    'audit',
    'database',
    'distributed',
    'explain the difference',
    'step-by-step',
    'design',
    'analyze',
    'synthesize',
  ];
  return complexKeywords.some((kw) => normalized.includes(kw));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDurationMs(ms: number | undefined): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
