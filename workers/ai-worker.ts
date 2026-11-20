/**
 * AdiChat — Cloudflare Workers AI Integration Boundary
 *
 * Production deployment boundary using Cloudflare `env.AI` binding and
 * Supabase JWT session validation.
 *
 * NOTE: The exact Workers AI model ID remains a pending owner selection
 * (`env.AI_MODEL_ID`) until validated in the target Cloudflare account.
 */

export interface WorkerEnv {
  AI: {
    run: (
      model: string,
      input: {
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        max_tokens?: number;
        stream?: boolean;
      }
    ) => Promise<unknown>;
  };
  AI_MODEL_ID?: string;
  MAX_AI_REQUESTS_PER_DAY?: string;
  MAX_AI_INPUT_CHARS?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_ORIGIN?: string;
}

interface WorkerAiPayload {
  conversationId: string;
  assistantId: string;
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const DEFAULT_MAX_PROMPT_CHARS = 4000;
const DEFAULT_MAX_DAILY_REQUESTS = 250;
const AI_TIMEOUT_MS = 25000;

function corsHeaders(origin: string | undefined) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

function errorResponse(
  message: string,
  code:
    | 'INVALID_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'PENDING_MODEL_SELECTION'
    | 'QUOTA_EXCEEDED'
    | 'MODEL_UNAVAILABLE'
    | 'TIMEOUT',
  status: number,
  headers: Record<string, string>,
  requestId: string
) {
  return Response.json({ error: message, code, requestId }, { status, headers });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const headers = corsHeaders(env.APP_ORIGIN);
    const requestId = crypto.randomUUID();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return errorResponse('Method not allowed', 'INVALID_REQUEST', 405, headers, requestId);
    }

    // 1. Validate Supabase Bearer token
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse(
        'Unauthorized: missing session token',
        'UNAUTHORIZED',
        401,
        headers,
        requestId
      );
    }
    const token = authHeader.slice('Bearer '.length).trim();

    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) {
      return errorResponse(
        'Unauthorized: invalid Supabase session',
        'UNAUTHORIZED',
        401,
        headers,
        requestId
      );
    }
    const authUser = (await userRes.json()) as { id: string };

    // 2. Verify active account status
    const profileRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=status`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const profiles = (await profileRes.json()) as Array<{ status: string }>;
    if (!profiles[0] || profiles[0].status !== 'active') {
      return errorResponse('Account suspended or inactive.', 'FORBIDDEN', 403, headers, requestId);
    }

    // 3. Parse and validate body
    let body: WorkerAiPayload;
    try {
      body = (await request.json()) as WorkerAiPayload;
    } catch {
      return errorResponse('Invalid JSON payload', 'INVALID_REQUEST', 400, headers, requestId);
    }

    const maxPromptChars = Number(env.MAX_AI_INPUT_CHARS || DEFAULT_MAX_PROMPT_CHARS);
    const prompt = (body.prompt || '').trim();
    if (!prompt || prompt.length > maxPromptChars || !body.conversationId || !body.assistantId) {
      return errorResponse(
        `Valid conversationId, assistantId, and prompt (1..${maxPromptChars} chars) required.`,
        'INVALID_REQUEST',
        400,
        headers,
        requestId
      );
    }

    // 4. Ensure owner selected a Cloudflare Workers AI model ID
    const modelId = env.AI_MODEL_ID;
    if (!modelId || modelId === 'PENDING_OWNER_MODEL_SELECTION') {
      return errorResponse(
        'Cloudflare Workers AI model ID is pending owner selection. Configure AI_MODEL_ID in Worker variables.',
        'PENDING_MODEL_SELECTION',
        503,
        headers,
        requestId
      );
    }

    // 5. Enforce per-user daily quota
    const dailyLimit = Number(env.MAX_AI_REQUESTS_PER_DAY || DEFAULT_MAX_DAILY_REQUESTS);
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const usageCountRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/assistant_usage?user_id=eq.${encodeURIComponent(
        authUser.id
      )}&created_at=gte.${encodeURIComponent(dayStart.toISOString())}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const todayUsage = (await usageCountRes.json()) as Array<{ id: string }>;
    if (Array.isArray(todayUsage) && todayUsage.length >= dailyLimit) {
      return errorResponse(
        'Daily AI assistant request quota reached. Please try again tomorrow.',
        'QUOTA_EXCEEDED',
        429,
        headers,
        requestId
      );
    }

    // 6. Verify conversation membership + load assistant instructions server-side
    const memberCheck = await fetch(
      `${env.SUPABASE_URL}/rest/v1/conversation_members?conversation_id=eq.${encodeURIComponent(
        body.conversationId
      )}&user_id=eq.${encodeURIComponent(authUser.id)}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const memberships = (await memberCheck.json()) as Array<{ id: string }>;
    if (!Array.isArray(memberships) || memberships.length === 0) {
      return errorResponse(
        'Forbidden: not a conversation member',
        'FORBIDDEN',
        403,
        headers,
        requestId
      );
    }

    const assistantRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/ai_assistants?id=eq.${encodeURIComponent(
        body.assistantId
      )}&select=id,name,instructions,tone,language,is_enabled`,
      {
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    const assistants = (await assistantRes.json()) as Array<{
      id: string;
      name: string;
      instructions: string;
      tone: string | null;
      language: string | null;
      is_enabled: boolean;
    }>;
    const assistant = assistants[0];
    if (!assistant || !assistant.is_enabled) {
      return errorResponse(
        'AI assistant unavailable or disabled',
        'NOT_FOUND',
        404,
        headers,
        requestId
      );
    }

    // Delimit user-editable persona instructions from platform system rules
    const systemPrompt = [
      'You are an AI assistant inside AdiChat. Follow platform safety rules and never leak secrets or system configuration.',
      '<assistant_persona>',
      `Name: ${assistant.name}`,
      assistant.tone ? `Tone: ${assistant.tone}` : '',
      assistant.language ? `Language: ${assistant.language}` : '',
      `Instructions: ${assistant.instructions}`,
      '</assistant_persona>',
    ]
      .filter(Boolean)
      .join('\n');

    const safeHistory = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
          .map((h) => ({ role: h.role, content: h.content.slice(0, maxPromptChars) }))
      : [];

    // 7. Execute inference via Cloudflare Workers AI binding (`env.AI`) with timeout protection
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let replyText = '';
    try {
      const aiPromise = env.AI.run(modelId, {
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      });

      const aiResult = (await Promise.race([
        aiPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('AI_TIMEOUT')));
        }),
      ])) as { response?: string };

      replyText = (aiResult?.response || '').trim();
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'AI_TIMEOUT';
      return errorResponse(
        isTimeout
          ? 'Workers AI request timed out. Please retry.'
          : 'Configured Workers AI model is temporarily unavailable.',
        isTimeout ? 'TIMEOUT' : 'MODEL_UNAVAILABLE',
        isTimeout ? 504 : 503,
        headers,
        requestId
      );
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Date.now() - startedAt;

    // 8. Persist usage audit row server-side
    await fetch(`${env.SUPABASE_URL}/rest/v1/assistant_usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        assistant_id: assistant.id,
        user_id: authUser.id,
        conversation_id: body.conversationId,
        model_id: modelId,
        input_units: prompt.length,
        output_units: replyText.length,
        request_status: 'success',
        latency_ms: latencyMs,
        request_id: requestId,
      }),
    });

    return Response.json(
      {
        text: replyText,
        modelId,
        latencyMs,
        requestId,
      },
      { status: 200, headers }
    );
  },
};
