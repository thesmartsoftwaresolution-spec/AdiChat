import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

interface AiChatRequestBody {
  prompt?: string;
  assistantName?: string;
  systemInstruction?: string;
  tone?: string;
  language?: string;
  thinkingMode?: boolean;
  history?: ChatHistoryTurn[];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'adichat-server',
      hasGeminiKey: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      workersAiModelStatus: process.env.AI_MODEL_ID || 'PENDING_OWNER_MODEL_SELECTION',
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const body = (req.body || {}) as AiChatRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    if (prompt.length > 8000) {
      return res.status(400).json({ error: 'Prompt exceeds 8,000 character limit.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'Server Gemini API key is not configured yet. Please select or attach a Gemini API key in AI Studio.',
        code: 'MISSING_API_KEY',
      });
    }

    const useThinking = body.thinkingMode !== false;
    const model = 'gemini-4-hydrogen';

    const systemInstructionParts = [
      `You are ${body.assistantName || 'AdiChat AI Assistant'}, a helpful, accurate assistant inside AdiChat.`,
      body.systemInstruction ? `Persona Instructions: ${body.systemInstruction}` : '',
      body.tone ? `Tone: ${body.tone}.` : '',
      body.language ? `Primary Language: ${body.language}.` : '',
      'Use clean Markdown formatting when explaining concepts or showing code.',
    ].filter(Boolean);

    const contents = [
      ...(Array.isArray(body.history)
        ? body.history
            .slice(-10)
            .filter((h) => h && typeof h.text === 'string' && h.text.trim())
            .map((h) => ({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.text }],
            }))
        : []),
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const startedAt = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstructionParts.join('\n'),
          thinkingConfig: {
            thinkingLevel: useThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
          },
        },
      });

      const latencyMs = Date.now() - startedAt;
      const text = response.text || '';

      return res.json({
        text,
        model,
        thinkingMode: useThinking,
        thinkingLevel: useThinking ? 'HIGH' : 'LOW',
        latencyMs,
        requestId: `req_${Date.now().toString(36)}`,
      });
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : 'Failed to generate AI response from Gemini.';
      let cleanMessage = rawMessage;
      let code: string | undefined;

      if (rawMessage.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(rawMessage) as {
            error?: { message?: string; status?: string; code?: number };
          };
          if (parsed?.error?.status === 'RESOURCE_EXHAUSTED' || parsed?.error?.code === 429) {
            code = 'QUOTA_EXCEEDED';
            cleanMessage =
              'Gemini API rate limit reached for Gemini 4 Hydrogen. Please wait a moment and retry.';
          } else if (parsed?.error?.message) {
            cleanMessage = parsed.error.message.split('\n')[0];
          }
        } catch {
          // keep rawMessage if not JSON
        }
      }

      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : code === 'PAID_KEY_REQUIRED'
            ? 429
            : 500;
      console.error('[api/ai/chat] Gemini call failed:', cleanMessage);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: cleanMessage,
        code,
        model,
      });
    }
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build artifacts not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AdiChat server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
