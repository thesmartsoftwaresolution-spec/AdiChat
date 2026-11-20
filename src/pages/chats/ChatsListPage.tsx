import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AppTabLayout } from '../../components/layout/AppShells';
import { AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

type ChatFilter = 'all' | 'unread' | 'ai' | 'groups';

function formatShortTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const ChatsListPage: React.FC = () => {
  const { state, currentUser, openAssistantConversation } = useAppState();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [briefingOpen, setBriefingOpen] = useState(false);

  const publishedBanner = useMemo(
    () => state.announcements.find((a) => a.status === 'published' && a.show_as_banner),
    [state.announcements]
  );

  const enrichedChats = useMemo(() => {
    return state.conversations
      .map((conv) => {
        const msgs = state.messages
          .filter((m) => m.conversation_id === conv.id && !m.deleted_at)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        const lastMsg = msgs[msgs.length - 1] || null;

        let displayName = conv.title || 'Conversation';
        let otherUser = undefined;
        let assistant = undefined;
        let unreadCount = 0;
        let isMuted = false;

        const ownMember = state.conversationMembers.find(
          (m) => m.conversation_id === conv.id && m.user_id === currentUser?.id
        );
        isMuted = Boolean(ownMember?.muted_until);

        if (conv.type === 'direct') {
          const member = state.conversationMembers.find(
            (m) => m.conversation_id === conv.id && m.user_id !== currentUser?.id
          );
          otherUser = state.profiles.find((p) => p.id === member?.user_id);
          if (otherUser) displayName = otherUser.full_name;
        } else if (conv.type === 'assistant') {
          assistant = state.assistants.find(
            (a) => a.name === conv.title || `conv-ai-${a.id}` === conv.id
          );
          if (assistant) displayName = assistant.name;
        } else if (conv.type === 'group') {
          const grp = state.groups.find((g) => g.conversation_id === conv.id);
          if (grp) displayName = grp.name;
        }

        if (conv.type === 'direct' || conv.type === 'group') {
          const lastReadAt = ownMember?.last_read_at;
          unreadCount = msgs.filter(
            (m) =>
              m.message_type !== 'system' &&
              m.sender_user_id !== currentUser?.id &&
              (!lastReadAt || m.created_at > lastReadAt)
          ).length;
        }

        const route =
          conv.type === 'group'
            ? `/groups/${conv.id}`
            : conv.type === 'assistant' && assistant
              ? `/assistants/${assistant.id}/chat`
              : `/chats/${conv.id}`;

        return {
          conv,
          displayName,
          otherUser,
          assistant,
          lastMsg,
          unreadCount,
          isMuted,
          route,
        };
      })
      .sort((a, b) =>
        (b.conv.last_message_at || b.conv.updated_at).localeCompare(
          a.conv.last_message_at || a.conv.updated_at
        )
      );
  }, [state, currentUser]);

  const unreadThreadCount = useMemo(
    () => enrichedChats.filter((c) => c.unreadCount > 0).length,
    [enrichedChats]
  );

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedChats.filter((item) => {
      if (filter === 'unread' && item.unreadCount === 0) return false;
      if (filter === 'ai' && item.conv.type !== 'assistant') return false;
      if (filter === 'groups' && item.conv.type !== 'group') return false;
      if (!q) return true;
      return (
        item.displayName.toLowerCase().includes(q) ||
        (item.lastMsg?.body || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedChats, filter, query]);

  return (
    <AppTabLayout
      title="Chats"
      fab={
        <Link
          to="/new-chat"
          aria-label="Start new chat"
          className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_24px_rgba(15,92,58,0.25)] hover:opacity-95 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">edit_square</span>
        </Link>
      }
    >
      <div className="flex flex-col w-full px-margin-mobile md:px-6 pt-space-sm space-y-3">
        {publishedBanner && (
          <div className="rounded-xl bg-secondary-container/45 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px]">campaign</span>
              <p className="text-body-sm text-on-surface truncate">
                <strong>{publishedBanner.title}:</strong> {publishedBanner.body}
              </p>
            </div>
            <Link
              to="/assistants"
              className="text-label-sm text-primary font-semibold shrink-0 hover:underline"
            >
              Try now
            </Link>
          </div>
        )}

        {/* Search Strip */}
        <div className="flex items-center gap-2 w-full h-12 px-4 rounded-xl bg-surface-container-low shadow-[0_1px_2px_rgba(10,10,10,0.02)]">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats, people, AI..."
            aria-label="Search chats, people, or AI"
            className="w-full bg-transparent border-0 outline-none text-on-surface placeholder:text-on-surface-variant text-body-md"
          />
          <button
            type="button"
            aria-label="Open Global Search"
            onClick={() => navigate('/search')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All Chats', icon: null },
            { id: 'unread', label: 'Unread', dot: true },
            { id: 'ai', label: 'AI Agents', icon: 'auto_awesome' },
            { id: 'groups', label: 'Work Guilds', icon: 'groups' },
          ].map((chip) => {
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id as ChatFilter)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-label-sm inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {chip.icon && (
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    {chip.icon}
                  </span>
                )}
                <span>{chip.label}</span>
                {chip.dot && <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />}
              </button>
            );
          })}

          <Link
            to="/groups/new/members"
            className="shrink-0 ml-auto px-3 py-1.5 rounded-full bg-primary/10 text-primary text-label-sm font-semibold inline-flex items-center gap-1 hover:bg-primary/15"
          >
            <span className="material-symbols-outlined text-[15px]">group_add</span>
            <span>New Group</span>
          </Link>
        </div>

        {/* Daily Briefing Card */}
        <div className="rounded-xl bg-surface-container-low p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 text-on-primary">
              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                neurology
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-label-md text-on-surface truncate">Daily Briefing Ready</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-semibold">
                  New
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant truncate">
                {briefingOpen
                  ? 'Ayesha requested 4 PM sprint demo; Frontend PR #412 latency dropped 46%.'
                  : unreadThreadCount > 0
                    ? `${unreadThreadCount} unread thread${unreadThreadCount === 1 ? '' : 's'} summarized across engineering`
                    : 'All conversations caught up across engineering'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Review AI Briefing"
            onClick={() => setBriefingOpen((b) => !b)}
            className="shrink-0 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-[18px]">
              {briefingOpen ? 'expand_less' : 'arrow_forward'}
            </span>
          </button>
        </div>

        {/* Chat Feed */}
        {filteredChats.length === 0 ? (
          <EmptyState
            icon="forum"
            title="No chats match your filter"
            description="Start a new 1-to-1 conversation, create a group guild, or chat with an AI assistant."
            action={
              <Link
                to="/new-chat"
                className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Start New Chat</span>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant/15 pb-6">
            {filteredChats.map((item) => (
              <Link
                key={item.conv.id}
                to={item.route}
                onClick={() => {
                  if (item.conv.type === 'assistant' && item.assistant) {
                    openAssistantConversation(item.assistant.id);
                  }
                }}
                className="group flex items-center gap-space-md py-3 px-2 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                {item.conv.type === 'assistant' && item.assistant ? (
                  <AssistantAvatar
                    name={item.assistant.name}
                    iconName={item.assistant.icon_name}
                    size="md"
                  />
                ) : item.conv.type === 'group' ? (
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">diversity_3</span>
                  </div>
                ) : (
                  <UserAvatar
                    name={item.displayName}
                    src={item.otherUser?.avatar_path}
                    size="md"
                    isOnline={Boolean(item.otherUser?.is_online)}
                    showPresence
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.conv.type === 'group' && (
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">
                          group
                        </span>
                      )}
                      <span className="text-headline-sm text-on-surface truncate">
                        {item.displayName}
                      </span>
                      {item.conv.type === 'assistant' && (
                        <span className="material-symbols-outlined material-symbols-filled text-[15px] text-secondary shrink-0">
                          verified
                        </span>
                      )}
                      {item.isMuted && (
                        <span className="material-symbols-outlined text-[15px] text-outline shrink-0">
                          volume_off
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-timestamp shrink-0 ${
                        item.unreadCount > 0
                          ? 'text-secondary font-semibold'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {formatShortTime(item.conv.last_message_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {item.lastMsg?.sender_user_id === currentUser?.id && (
                        <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">
                          {item.lastMsg?.delivery_status === 'sent' ? 'check' : 'done_all'}
                        </span>
                      )}
                      {item.lastMsg?.message_type === 'voice' && (
                        <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                          mic
                        </span>
                      )}
                      {item.lastMsg?.message_type === 'file' && (
                        <span className="material-symbols-outlined text-[15px] text-tertiary-container shrink-0">
                          picture_as_pdf
                        </span>
                      )}
                      <p
                        className={`text-body-md truncate ${
                          item.unreadCount > 0
                            ? 'text-on-surface font-medium'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {item.lastMsg?.body || 'No messages yet'}
                      </p>
                    </div>
                    {item.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-container text-on-primary text-caption font-semibold flex items-center justify-center">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center py-4 opacity-70">
          <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
            <span>End-to-end encrypted with AdiCrypt</span>
          </div>
        </div>
      </div>
    </AppTabLayout>
  );
};
