import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

type SearchScope = 'all' | 'people' | 'groups' | 'assistants' | 'messages';

export const GlobalSearchPage: React.FC = () => {
  const { state, currentUser } = useAppState();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const people = state.profiles.filter(
      (p) =>
        p.id !== currentUser?.id &&
        p.status === 'active' &&
        (!q ||
          p.full_name.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q))
    );
    const groups = state.groups.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
    );
    const assistants = state.assistants.filter(
      (a) =>
        a.is_enabled &&
        (!q ||
          a.name.toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q))
    );
    const messages = q
      ? state.messages.filter(
          (m) => !m.deleted_at && (m.body || '').toLowerCase().includes(q)
        )
      : [];

    return { people, groups, assistants, messages };
  }, [state, currentUser, q]);

  const totalCount =
    results.people.length +
    results.groups.length +
    results.assistants.length +
    results.messages.length;

  return (
    <MobileStackLayout title="Global Search" backTo="/chats">
      <div className="max-w-3xl mx-auto w-full px-margin-mobile py-4 space-y-4">
        <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, people, groups, AI assistants..."
            aria-label="Global search query"
            className="w-full bg-transparent outline-none text-body-md text-on-surface"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'people', label: 'People' },
            { id: 'groups', label: 'Groups' },
            { id: 'assistants', label: 'AI Assistants' },
            { id: 'messages', label: 'Messages' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id as SearchScope)}
              className={`px-3.5 py-1.5 rounded-full text-label-sm shrink-0 ${
                scope === tab.id
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {totalCount === 0 ? (
          <EmptyState
            icon="search_off"
            title="No results found"
            description="Try searching a different person, group name, assistant, or message phrase."
          />
        ) : (
          <div className="space-y-5">
            {(scope === 'all' || scope === 'assistants') && results.assistants.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
                  AI Assistants
                </h2>
                {results.assistants.map((a) => (
                  <Link
                    key={a.id}
                    to={`/assistants/${a.id}/chat`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
                  >
                    <AssistantAvatar name={a.name} iconName={a.icon_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-body-md-medium text-on-surface truncate">{a.name}</p>
                      <p className="text-caption text-on-surface-variant truncate">{a.description}</p>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {(scope === 'all' || scope === 'groups') && results.groups.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
                  Groups
                </h2>
                {results.groups.map((g) => (
                  <Link
                    key={g.conversation_id}
                    to={`/groups/${g.conversation_id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">diversity_3</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-md-medium text-on-surface truncate">{g.name}</p>
                      <p className="text-caption text-on-surface-variant truncate">
                        {g.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {(scope === 'all' || scope === 'people') && results.people.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
                  People
                </h2>
                {results.people.map((p) => (
                  <Link
                    key={p.id}
                    to="/new-chat"
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
                  >
                    <UserAvatar
                      name={p.full_name}
                      src={p.avatar_path}
                      size="sm"
                      isOnline={p.is_online}
                      showPresence
                    />
                    <div className="min-w-0">
                      <p className="text-body-md-medium text-on-surface truncate">{p.full_name}</p>
                      <p className="text-caption text-on-surface-variant truncate">
                        {p.title || p.email}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {(scope === 'all' || scope === 'messages') && results.messages.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant px-1">
                  Messages ({results.messages.length})
                </h2>
                {results.messages.map((m) => {
                  const conv = state.conversations.find((c) => c.id === m.conversation_id);
                  const dest =
                    conv?.type === 'group' ? `/groups/${m.conversation_id}` : `/chats/${m.conversation_id}`;
                  return (
                    <Link
                      key={m.id}
                      to={dest}
                      className="block p-3 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low"
                    >
                      <p className="text-label-sm text-primary font-semibold">
                        {conv?.title || 'Conversation'}
                      </p>
                      <p className="text-body-sm text-on-surface line-clamp-2 mt-0.5">{m.body}</p>
                    </Link>
                  );
                })}
              </section>
            )}
          </div>
        )}
      </div>
    </MobileStackLayout>
  );
};
