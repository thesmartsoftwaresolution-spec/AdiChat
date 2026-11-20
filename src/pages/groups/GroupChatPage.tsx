import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AttachmentVoiceSheet } from '../../components/chat/AttachmentVoiceSheet';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatWorkspaceLayout } from '../../components/layout/AppShells';
import { AIBadge } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';
import { isGroupAdmin } from '../../utils/permissions';

export const GroupChatPage: React.FC = () => {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { state, currentUser, markConversationRead, sendMessage, toggleReaction, pushToast } = useAppState();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'attach' | 'voice'>('attach');
  const bottomRef = useRef<HTMLDivElement>(null);

  const groupMeta = state.groups.find((g) => g.conversation_id === groupId);
  const members = state.conversationMembers.filter((m) => m.conversation_id === groupId);
  const actorIsGroupAdmin = currentUser
    ? isGroupAdmin(state.conversationMembers, groupId, currentUser.id)
    : false;
  const postingRestricted = Boolean(groupMeta?.only_admins_send && !actorIsGroupAdmin);

  const groupAssistants = state.groupAssistants
    .filter((ga) => ga.group_conversation_id === groupId && ga.is_enabled)
    .map((ga) => state.assistants.find((a) => a.id === ga.assistant_id))
    .filter(Boolean);

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.conversation_id === groupId && !m.deleted_at)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [state.messages, groupId]
  );

  useEffect(() => {
    if (groupId && groupMeta) {
      markConversationRead(groupId);
    }
  }, [groupId, groupMeta, messages.length, markConversationRead]);

  const showMentionPopover = draft.endsWith('@') || /@[a-zA-Z0-9_]*$/.test(draft);

  const insertMention = (handle: string) => {
    const replaced = draft.replace(/@[a-zA-Z0-9_]*$/, `@${handle} `);
    setDraft(replaced.includes(`@${handle}`) ? replaced : `${draft}@${handle} `);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending || postingRestricted) return;
    const text = draft;
    setDraft('');
    setSending(true);
    try {
      const res = await sendMessage(groupId, text);
      if (!res.ok) {
        setDraft(text);
        return;
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } finally {
      setSending(false);
    }
  };

  if (!groupMeta) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <EmptyState
          icon="group_off"
          title="Group not found"
          description="This group may have been deleted or you are not a member."
          action={
            <Link
              to="/chats"
              className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-md inline-flex items-center"
            >
              Back to Chats
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ChatWorkspaceLayout activeConversationId={groupId}>
      <div className="min-h-screen bg-surface text-on-surface flex flex-col flex-1">
      <header className="sticky top-0 z-40 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-2 md:px-6 max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              aria-label="Back to chats"
              onClick={() => navigate('/chats')}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-surface-container shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            <Link
              to={`/groups/${groupId}/info`}
              className="flex items-center gap-2.5 min-w-0 py-1 px-1.5 rounded-xl hover:bg-surface-container-low"
            >
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">diversity_3</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-headline-sm text-on-surface truncate leading-tight">
                  {groupMeta.name}
                </h1>
                <p className="text-caption text-secondary truncate">
                  {members.length} members • {groupAssistants.length} AI assistant(s)
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              to={`/chats/${groupId}/media`}
              aria-label="Group shared media"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">perm_media</span>
            </Link>
            <Link
              to={`/groups/${groupId}/info`}
              aria-label="Group info and members"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-margin-mobile md:px-6 py-4 flex flex-col space-y-3 overflow-y-auto">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-caption text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
            <span>
              Type <strong>@</strong> to mention members or AI assistants like @StudyBuddyAI
            </span>
          </div>
        </div>

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.sender_user_id === currentUser?.id}
            senderProfile={
              m.sender_user_id
                ? state.profiles.find((p) => p.id === m.sender_user_id)
                : undefined
            }
            senderAssistant={
              m.sender_assistant_id
                ? state.assistants.find((a) => a.id === m.sender_assistant_id)
                : undefined
            }
            showSenderHeader
            onReact={toggleReaction}
          />
        ))}

        {sending && (
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-full bg-surface-container-low text-caption text-on-surface-variant">
            <span className="material-symbols-outlined text-[15px] text-primary animate-spin">
              progress_activity
            </span>
            <span>AI Assistant is thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="sticky bottom-0 z-30 bg-surface/90 backdrop-blur-xl pb-safe border-t border-outline-variant/20">
        <div className="max-w-4xl mx-auto p-3 md:px-6 relative">
          {postingRestricted ? (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container-low text-caption text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>Only Group Admins can post in this group.</span>
            </div>
          ) : (
            <>
              {showMentionPopover && (
                <div className="mb-2 p-2 rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant/25 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-caption font-semibold text-on-surface-variant">
                      Suggested mentions
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraft((d) => d.replace(/@[a-zA-Z0-9_]*$/, ''))}
                      className="text-timestamp text-outline hover:text-on-surface"
                    >
                      Dismiss
                    </button>
                  </div>
                  {groupAssistants.map(
                    (a) =>
                      a && (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => insertMention(a.handle)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-secondary-container/40 hover:bg-secondary-container text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-label-md text-on-surface">@{a.handle}</span>
                            <AIBadge compact />
                          </div>
                          <span className="text-caption text-on-surface-variant">AI Assistant</span>
                        </button>
                      )
                  )}
                  {members.slice(0, 4).map((m) => {
                    const prof = state.profiles.find((p) => p.id === m.user_id);
                    if (!prof || prof.id === currentUser?.id) return null;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => insertMention(prof.full_name.replace(/\s+/g, ''))}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-container-low text-left"
                      >
                        <span className="text-body-sm font-medium text-on-surface">
                          @{prof.full_name}
                        </span>
                        <span className="text-caption text-on-surface-variant">
                          {prof.title || 'Member'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-center gap-1.5 bg-surface-container-lowest rounded-2xl p-1.5 shadow-md"
              >
                <button
                  type="button"
                  aria-label="Open attachment picker"
                  onClick={() => {
                    setPickerTab('attach');
                    setPickerOpen(true);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
                <button
                  type="button"
                  aria-label="Mention AI or member"
                  onClick={() => setDraft((d) => (d.endsWith('@') ? d : `${d}@`))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-surface-container font-semibold"
                >
                  @
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${groupMeta.name}...`}
                  aria-label="Group message input"
                  className="flex-1 min-w-0 bg-transparent outline-none px-2 text-body-md text-on-surface"
                />
                <button
                  type="button"
                  aria-label="Record voice note"
                  onClick={() => {
                    setPickerTab('voice');
                    setPickerOpen(true);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button
                  type="submit"
                  aria-label="Send group message"
                  className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </footer>

      <AttachmentVoiceSheet
        open={pickerOpen}
        initialTab={pickerTab}
        onClose={() => setPickerOpen(false)}
        onSendAttachment={async (att) => {
          await sendMessage(groupId, att.fileName, {
            type: att.type,
            attachment: {
              conversation_id: groupId,
              uploaded_by: currentUser?.id || 'u-adeel',
              bucket_id: 'chat-attachments',
              object_path: `${groupId}/${Date.now()}/${att.fileName}`,
              file_name: att.fileName,
              mime_type: att.mimeType,
              file_size_bytes: att.sizeBytes,
              width: null,
              height: null,
              duration_ms: null,
              preview_url: att.previewUrl,
            },
          });
          pushToast(`Shared ${att.fileName} to group`, 'success');
        }}
        onSendVoiceNote={async (durationMs) => {
          await sendMessage(groupId, 'Voice note', { type: 'voice', durationMs });
          pushToast('Sent group voice note', 'success');
        }}
      />
      </div>
    </ChatWorkspaceLayout>
  );
};
