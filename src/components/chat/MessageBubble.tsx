import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AIAssistant, Message, Profile } from '../../types/database';
import { formatDurationMs, formatFileSize } from '../../utils/chatLogic';
import { AIBadge, AssistantAvatar, UserAvatar } from '../ui/Avatar';

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const MessageBubble: React.FC<{
  message: Message;
  isOwn: boolean;
  senderProfile?: Profile;
  senderAssistant?: AIAssistant;
  showSenderHeader?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onRegenerate?: () => void;
  displayBody?: string;
  animateIn?: boolean;
  onReply?: (message: Message) => void;
}> = ({
  message,
  isOwn,
  senderProfile,
  senderAssistant,
  showSenderHeader = false,
  onReact,
  onRegenerate,
  displayBody,
  animateIn = false,
  onReply,
}) => {
  const [playingVoice, setPlayingVoice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-caption text-on-surface-variant shadow-xs">
          <span className="material-symbols-outlined text-[14px] text-secondary">auto_awesome</span>
          <span>{message.body}</span>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // AI Assistant message styling matching Stitch AI Chat & Group Chat screenshots
  if (senderAssistant) {
    const codeSnippet = message.metadata.code_snippet;
    return (
      <div className="flex flex-col items-start self-start max-w-[92%] space-y-1">
        {message.metadata.thinking_mode && (
          <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full shadow-xs mb-1">
            <span className="material-symbols-outlined text-primary text-[14px]">psychology</span>
            <span className="text-caption text-on-surface-variant">
              {message.metadata.thinking_summary ||
                `High Thinking Mode (${message.metadata.model_id || '@cf/openai/gpt-oss-20b'})`}
            </span>
            <span className="material-symbols-outlined text-secondary text-[14px]">check_circle</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 w-full">
          {showSenderHeader && (
            <AssistantAvatar
              name={senderAssistant.name}
              iconName={senderAssistant.icon_name}
              size="sm"
              showBadge={false}
            />
          )}
          <div className="flex-1 min-w-0">
            {showSenderHeader && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-label-sm font-semibold text-on-surface">
                  {senderAssistant.name}
                </span>
                <AIBadge compact />
              </div>
            )}

            <div className="relative bg-surface-container-lowest text-on-surface rounded-2xl rounded-tl-sm p-4 pl-[22px] shadow-sm overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary-container rounded-r" />
              <div className={`text-body-md leading-relaxed whitespace-pre-wrap break-words ${animateIn ? 'ai-response-enter' : ''}`}>
                {displayBody ?? message.body}
              </div>

              {codeSnippet && (
                <div className="mt-3 bg-surface-container rounded-xl p-2.5 overflow-hidden">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 bg-surface-container-high px-2.5 py-1 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="text-caption font-medium text-on-surface-variant">
                        {codeSnippet.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(codeSnippet.code)}
                      className="inline-flex items-center gap-1 text-timestamp font-semibold text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[12px] leading-5 overflow-x-auto bg-surface-container-lowest p-2.5 rounded-lg text-on-surface">
                    <code>{codeSnippet.code}</code>
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-outline-variant/20">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Copy assistant response"
                    onClick={() => handleCopy(message.body || '')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  {onReply && (
                    <button
                      type="button"
                      onClick={() => onReply(message)}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-caption text-on-surface-variant hover:text-primary hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[15px]">reply</span>
                      <span>Ask about this</span>
                    </button>
                  )}
                  {onRegenerate && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-caption text-on-surface-variant hover:text-primary hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[15px]">sync</span>
                      <span>Regenerate</span>
                    </button>
                  )}
                  {onReact && (
                    <button
                      type="button"
                      onClick={() => onReact(message.id, '👍')}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-full bg-surface-container-low text-timestamp text-on-surface-variant hover:text-primary"
                    >
                      <span>👍</span>
                      <span>{message.metadata.reactions?.['👍'] || 0}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Mark helpful"
                    onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      feedback === 'up' ? 'text-primary bg-secondary-container/50' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">thumb_up</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Mark unhelpful"
                    onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      feedback === 'down' ? 'text-error bg-error-container/50' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">thumb_down</span>
                  </button>
                  <span className="text-timestamp text-on-surface-variant ml-1">
                    {formatMessageTime(message.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${isOwn ? 'items-end self-end' : 'items-start self-start'} max-w-[85%] space-y-1`}
    >
      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && showSenderHeader && senderProfile && (
          <UserAvatar name={senderProfile.full_name} src={senderProfile.avatar_path} size="xs" />
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
            isOwn
              ? 'bg-msg-sent text-on-surface rounded-tr-sm'
              : 'bg-msg-received text-on-surface rounded-tl-sm'
          }`}
        >
          {!isOwn && showSenderHeader && senderProfile && (
            <p className="text-label-sm font-semibold text-primary mb-0.5">
              {senderProfile.full_name}
            </p>
          )}

          {message.message_type === 'image' && message.metadata.media_url && (
            <Link to={`/media/${message.id}`} className="block mb-2 rounded-xl overflow-hidden">
              <img
                src={message.metadata.media_url}
                alt={message.metadata.file_name || 'Shared image'}
                className="max-h-56 w-full object-cover rounded-xl"
              />
            </Link>
          )}

          {message.message_type === 'file' && (
            <Link
              to={`/media/${message.id}`}
              className="flex items-center gap-2.5 p-2.5 mb-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="min-w-0">
                <p className="text-label-sm font-semibold text-on-surface truncate">
                  {message.metadata.file_name || 'Document'}
                </p>
                <p className="text-timestamp text-on-surface-variant">
                  {message.metadata.file_size_bytes
                    ? formatFileSize(message.metadata.file_size_bytes)
                    : 'Attachment'}
                </p>
              </div>
            </Link>
          )}

          {message.message_type === 'voice' ? (
            <div className="flex items-center gap-3 min-w-[210px] py-0.5">
              <button
                type="button"
                aria-label={playingVoice ? 'Pause voice note' : 'Play voice note'}
                onClick={() => setPlayingVoice((p) => !p)}
                className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {playingVoice ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div className="flex-1 flex items-center gap-0.5 h-6">
                {[40, 75, 55, 90, 65, 85, 45, 70, 95, 60, 50, 75].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-colors ${
                      playingVoice && i % 2 === 0 ? 'bg-primary' : 'bg-primary/40'
                    }`}
                  />
                ))}
              </div>
              <span className="text-timestamp text-on-surface-variant font-medium shrink-0">
                {formatDurationMs(message.metadata.duration_ms)}
              </span>
            </div>
          ) : (
            message.body && (
              <p className="text-body-md leading-relaxed whitespace-pre-wrap break-words">
                {message.body}
              </p>
            )
          )}

          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              className="mt-1 inline-flex items-center gap-1 text-timestamp text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-[14px]">reply</span>
              <span>Ask about this</span>
            </button>
          )}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-timestamp text-on-surface-variant">
              {formatMessageTime(message.created_at)}
            </span>
            {isOwn && (
              <span
                className={`material-symbols-outlined text-[14px] ${
                  message.delivery_status === 'read' ? 'text-secondary' : 'text-outline'
                }`}
              >
                {message.delivery_status === 'sent' ? 'check' : 'done_all'}
              </span>
            )}
          </div>
        </div>
      </div>

      {message.metadata.reactions && Object.keys(message.metadata.reactions).length > 0 && (
        <div className="flex items-center gap-1 px-1">
          {Object.entries(message.metadata.reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact?.(message.id, emoji)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest shadow-xs text-timestamp text-on-surface"
            >
              <span>{emoji}</span>
              <span className="font-semibold">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
