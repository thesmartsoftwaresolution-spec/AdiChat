import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

export const NewChatPage: React.FC = () => {
  const { state, currentUser, getOrCreateDirectConversation } = useAppState();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const eligibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.profiles.filter((p) => {
      if (p.id === currentUser?.id || p.status !== 'active') return false;
      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q)
      );
    });
  }, [state.profiles, currentUser, query]);

  return (
    <MobileStackLayout title="New Chat" subtitle="Find people or start a group" backTo="/chats">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-4 space-y-4">
        <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, role, or email..."
            aria-label="Search users"
            className="w-full bg-transparent outline-none text-body-md text-on-surface"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Link
            to="/groups/new/members"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">group_add</span>
            </div>
            <div>
              <p className="text-label-md text-on-surface">New Group</p>
              <p className="text-caption text-on-surface-variant">Add members &amp; AI copilots</p>
            </div>
          </Link>

          <Link
            to="/assistants/new"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
            <div>
              <p className="text-label-md text-on-surface">New AI Assistant</p>
              <p className="text-caption text-on-surface-variant">Build custom persona</p>
            </div>
          </Link>
        </div>

        <div className="space-y-1">
          <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1 mb-2">
            Directory ({eligibleUsers.length})
          </h2>

          {eligibleUsers.length === 0 ? (
            <EmptyState
              icon="person_search"
              title="No users found"
              description="Try another name or email keyword."
            />
          ) : (
            eligibleUsers.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={async () => {
                  setOpeningUserId(person.id);
                  try {
                    const conv = await getOrCreateDirectConversation(person.id);
                    if (conv) navigate(`/chats/${conv.id}`);
                  } finally {
                    setOpeningUserId(null);
                  }
                }}
                disabled={openingUserId === person.id}
                aria-busy={openingUserId === person.id}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-container-low text-left transition-colors disabled:opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={person.full_name}
                    src={person.avatar_path}
                    size="md"
                    isOnline={person.is_online}
                    showPresence
                  />
                  <div className="min-w-0">
                    <p className="text-headline-sm text-on-surface truncate">{person.full_name}</p>
                    <p className="text-caption text-on-surface-variant truncate">
                      {person.title || person.about || person.email}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  chat_bubble_outline
                </span>
              </button>
            ))
          )}
        </div>

        <div className="space-y-1 pt-2">
          <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1 mb-2">
            Your AI Assistants
          </h2>
          {state.assistants
            .filter((a) => a.is_enabled)
            .map((a) => (
              <Link
                key={a.id}
                to={`/assistants/${a.id}/chat`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AssistantAvatar name={a.name} iconName={a.icon_name} size="md" />
                  <div className="min-w-0">
                    <p className="text-headline-sm text-on-surface truncate">{a.name}</p>
                    <p className="text-caption text-on-surface-variant truncate">{a.description}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  arrow_forward
                </span>
              </Link>
            ))}
        </div>
      </div>
    </MobileStackLayout>
  );
};
