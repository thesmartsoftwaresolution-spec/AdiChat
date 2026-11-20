import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AttachmentVoiceSheet } from '../../components/chat/AttachmentVoiceSheet';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatWorkspaceLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

export const DirectChatPage: React.FC = () => {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();
  const {
    state,
    currentUser,
    markConversationRead,
    sendMessage,
    toggleReaction,
    isUserBlocked,
    toggleBlockUser,
    pushToast,
  } = useAppState();

  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'attach' | 'voice'>('attach');
  const bottomRef = useRef<HTMLDivElement>(null);

  const conv = state.conversations.find((c) => c.id === conversationId);
  const otherMember = state.conversationMembers.find(
    (m) => m.conversation_id === conversationId && m.user_id !== currentUser?.id
  );
  const otherUser = state.profiles.find((p) => p.id === otherMember?.user_id);

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.conversation_id === conversationId && !m.deleted_at)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [state.messages, conversationId]
  );

  useEffect(() => {
    if (conversationId && conv) {
      markConversationRead(conversationId);
    }
  }, [conversationId, conv, messages.length, markConversationRead]);

  const blocked = otherUser ? isUserBlocked(otherUser.id) : false;

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || blocked) return;
    const text = draft;
    setDraft('');
    await sendMessage(conversationId, text);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  if (!conv) {
    return (
      <div className="min-h-screen bg-surface p-6 flex items-center justify-center">
        <EmptyState
          icon="chat_error"
          title="Conversation not found"
          description="This thread does not exist or you no longer have access."
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
    <ChatWorkspaceLayout activeConversationId={conversationId}>
      <div className="min-h-screen bg-surface text-on-surface flex flex-col flex-1">
      {/* Header */}
      <header className="sticky top-0 z-40 pt-safe bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-2 md:px-6 max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              aria-label="Back to chats"
              onClick={() => navigate('/chats')}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-surface-container shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>

            <Link
              to={`/chats/${conversationId}/contact`}
              className="flex items-center gap-2.5 min-w-0 py-1 px-1.5 rounded-xl hover:bg-surface-container-low"
            >
              <UserAvatar
                name={otherUser?.full_name || conv.title || 'Chat'}
                src={otherUser?.avatar_path}
                size="sm"
                isOnline={Boolean(otherUser?.is_online)}
                showPresence
              />
              <div className="min-w-0">
                <h1 className="text-headline-sm text-on-surface truncate leading-tight">
                  {otherUser?.full_name || conv.title}
                </h1>
                <p className="text-caption text-secondary truncate">
                  {blocked ? 'Blocked' : otherUser?.is_online ? 'Online' : 'Last seen recently'}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              to={`/chats/${conversationId}/media`}
              aria-label="Shared media and files"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">perm_media</span>
            </Link>
            <Link
              to={`/chats/${conversationId}/contact`}
              aria-label="Contact info"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Message Stream */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-margin-mobile md:px-6 py-4 flex flex-col space-y-3 overflow-y-auto">
        <div className="flex justify-center">
          <span className="px-3 py-1 rounded-full bg-surface-container text-timestamp text-on-surface-variant">
            Today
          </span>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-caption text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
            <span>Messages are private between participants.</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <EmptyState
            icon="waving_hand"
            title={`Say hello to ${otherUser?.full_name || 'your contact'}`}
            description="Send a message, photo, document, or voice note to begin."
          />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_user_id === currentUser?.id}
              senderProfile={state.profiles.find((p) => p.id === m.sender_user_id)}
              onReact={toggleReaction}
            />
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* Composer */}
      <footer className="sticky bottom-0 z-30 bg-surface/90 backdrop-blur-xl pb-safe border-t border-outline-variant/20">
        <div className="max-w-4xl mx-auto p-3 md:px-6">
          {blocked && otherUser ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-error-container/50 text-on-error-container">
              <span className="text-body-sm">
                You blocked {otherUser.full_name}. Unblock to send messages.
              </span>
              <button
                type="button"
                onClick={() => toggleBlockUser(otherUser.id)}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-semibold"
              >
                Unblock
              </button>
            </div>
          ) : (
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
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
              </button>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${otherUser?.full_name || ''}...`}
                aria-label="Message input"
                className="flex-1 min-w-0 bg-transparent outline-none px-2 text-body-md text-on-surface placeholder:text-outline"
              />
              <button
                type="button"
                aria-label="Record voice note"
                onClick={() => {
                  setPickerTab('voice');
                  setPickerOpen(true);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
              <button
                type="submit"
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 hover:opacity-95"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          )}
        </div>
      </footer>

      <AttachmentVoiceSheet
        open={pickerOpen}
        initialTab={pickerTab}
        onClose={() => setPickerOpen(false)}
        onSendAttachment={async (att) => {
          await sendMessage(conversationId, att.fileName, {
            type: att.type,
            attachment: {
              conversation_id: conversationId,
              uploaded_by: currentUser?.id || 'u-adeel',
              bucket_id: 'chat-attachments',
              object_path: `${conversationId}/${Date.now()}/${att.fileName}`,
              file_name: att.fileName,
              mime_type: att.mimeType,
              file_size_bytes: att.sizeBytes,
              width: null,
              height: null,
              duration_ms: null,
              preview_url: att.previewUrl,
            },
          });
          pushToast(`Sent ${att.fileName}`, 'success');
        }}
        onSendVoiceNote={async (durationMs) => {
          await sendMessage(conversationId, 'Voice note', {
            type: 'voice',
            durationMs,
          });
          pushToast('Voice note sent', 'success');
        }}
      />
      </div>
    </ChatWorkspaceLayout>
  );
};
