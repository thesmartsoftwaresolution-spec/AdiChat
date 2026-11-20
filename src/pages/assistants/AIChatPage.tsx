import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatWorkspaceLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

export const AIChatPage: React.FC = () => {
  const { assistantId = '' } = useParams();
  const navigate = useNavigate();
  const { state, currentUser, sendAiMessage } = useAppState();

  const assistant = state.assistants.find((a) => a.id === assistantId);
  const [thinkingMode, setThinkingMode] = useState<boolean>(
    assistant?.thinking_enabled_default ?? true
  );
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conv = useMemo(
    () =>
      state.conversations.find(
        (c) =>
          c.type === 'assistant' &&
          (c.id === `conv-ai-${assistantId}` || (assistant && c.title === assistant.name))
      ),
    [state.conversations, assistantId, assistant]
  );

  const messages = useMemo(() => {
    if (!conv) return [];
    return state.messages
      .filter((m) => m.conversation_id === conv.id && !m.deleted_at)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [state.messages, conv]);

  const submitPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || !assistant || loading) return;

    const autoDeep = thinkingMode;
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setDraft('');
    setLoading(true);

    const res = await sendAiMessage(assistant.id, clean, autoDeep);
    setLoading(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not reach AI service.');
      setLastFailedPrompt(clean);
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  if (!assistant) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <EmptyState
          icon="smart_toy"
          title="AI Assistant not found"
          description="Return to the AI Assistants Hub to pick or create an assistant."
          action={
            <Link
              to="/assistants"
              className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-md inline-flex items-center"
            >
              AI Assistants Hub
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ChatWorkspaceLayout activeConversationId={conv?.id}>
      <div className="min-h-screen bg-surface text-on-surface flex flex-col flex-1">
      {/* Header matching Stitch Screen 19 */}
      <header className="sticky top-0 z-40 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 px-2 md:px-6 max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              aria-label="Back to AI Assistants"
              onClick={() => navigate('/assistants')}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-surface-container shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <Link
              to={`/assistants/${assistant.id}`}
              className="flex items-center gap-2.5 min-w-0 py-1 px-1.5 rounded-xl hover:bg-surface-container-low"
            >
              <AssistantAvatar name={assistant.name} iconName={assistant.icon_name} src={assistant.avatar_url} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-headline-sm text-on-surface truncate leading-tight">
                    {assistant.name}
                  </h1>
                  <AIBadge compact />
                </div>
                <p className="text-caption text-on-surface-variant truncate">
                  {thinkingMode
                    ? 'High Thinking Mode • Cloudflare Workers AI · GPT-OSS 20B'
                    : 'Fast Mode • Cloudflare Workers AI · GPT-OSS 20B (Low Thinking)'}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setThinkingMode((t) => !t)}
              aria-pressed={thinkingMode}
              className={`h-9 px-3 rounded-full text-label-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
                thinkingMode
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              <span className="hidden sm:inline">
                {thinkingMode ? 'Thinking: HIGH' : 'Thinking: OFF'}
              </span>
              <span className="sm:hidden">{thinkingMode ? 'Think' : 'Fast'}</span>
            </button>

            <Link
              to={`/assistants/${assistant.id}`}
              aria-label="Assistant profile and settings"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-margin-mobile md:px-6 pt-4 pb-6 flex flex-col space-y-4 overflow-y-auto">
        <div className="flex justify-center">
          <span className="px-3 py-1 rounded-full bg-surface-container text-timestamp text-on-surface-variant">
            Today
          </span>
        </div>

        {/* Starter Prompt Chips */}
        {assistant.starter_prompts.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {assistant.starter_prompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDraft(promptText)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-low hover:bg-surface-container text-caption font-medium text-on-surface shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-secondary text-[15px]">
                  auto_awesome
                </span>
                <span>{promptText}</span>
              </button>
            ))}
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState
            icon="neurology"
            title={`Ask ${assistant.name} anything`}
            description={
              assistant.description ||
              'Complex architectural, math, and debugging questions automatically engage High Thinking Mode.'
            }
          />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_user_id === (currentUser?.id || 'u-adeel')}
              senderProfile={
                m.sender_user_id
                  ? state.profiles.find((p) => p.id === m.sender_user_id)
                  : undefined
              }
              senderAssistant={m.sender_assistant_id ? assistant : undefined}
              onRegenerate={
                m.sender_assistant_id
                  ? () => {
                      const prevUserMsg = [...messages]
                        .reverse()
                        .find((x) => x.sender_user_id && x.created_at <= m.created_at);
                      if (prevUserMsg?.body) void submitPrompt(prevUserMsg.body);
                    }
                  : undefined
              }
            />
          ))
        )}

        {loading && (
          <div className="inline-flex items-center gap-2.5 self-start px-4 py-2 rounded-full bg-surface-container-low shadow-xs">
            <span className="material-symbols-outlined text-primary text-[16px] animate-spin">
              progress_activity
            </span>
            <span className="text-caption text-on-surface-variant font-medium">
              {thinkingMode
                ? `${assistant.name} is deep reasoning (Cloudflare Workers AI · GPT-OSS 20B • Thinking HIGH)...`
                : `${assistant.name} is generating reply...`}
            </span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-error-container text-on-error-container flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <p className="text-body-sm">{errorMsg}</p>
            </div>
            {lastFailedPrompt && (
              <button
                type="button"
                onClick={() => void submitPrompt(lastFailedPrompt)}
                className="px-3 py-1.5 rounded-xl bg-error text-on-error text-label-sm font-semibold shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Fixed Bottom Composer */}
      <footer className="sticky bottom-0 z-30 bg-surface/90 backdrop-blur-xl pb-safe border-t border-outline-variant/20">
        <div className="max-w-4xl mx-auto p-3 md:px-6 space-y-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitPrompt(draft);
            }}
            className="flex items-center gap-1.5 bg-surface-container-lowest rounded-2xl p-1.5 shadow-md"
          >
            <button
              type="button"
              aria-label="Toggle Thinking Mode"
              onClick={() => setThinkingMode((t) => !t)}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                thinkingMode
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
              title="Toggle High Thinking Mode (@cf/openai/gpt-oss-20b)"
            >
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Ask ${assistant.name} anything...`}
              aria-label="AI prompt input"
              className="flex-1 min-w-0 bg-transparent outline-none px-2 text-body-md text-on-surface placeholder:text-outline"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              aria-label="Send prompt"
              className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
          <div className="flex items-center justify-between px-2 text-timestamp text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-secondary">
                {thinkingMode ? 'neurology' : 'bolt'}
              </span>
              {thinkingMode
                ? 'High Thinking Mode active (@cf/openai/gpt-oss-20b • Reasoning HIGH)'
                : 'Fast Mode active (@cf/openai/gpt-oss-20b • Reasoning LOW)'}
            </span>
            <span>Markdown ready</span>
          </div>
        </div>
      </footer>
      </div>
    </ChatWorkspaceLayout>
  );
};
