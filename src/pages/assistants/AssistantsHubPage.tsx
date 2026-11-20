import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AppTabLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

export const AssistantsHubPage: React.FC = () => {
  const { state, currentUser, openAssistantConversation } = useAppState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'thinking'>('all');

  const assistants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.assistants.filter((a) => {
      if (filter === 'mine' && a.owner_user_id !== currentUser?.id) return false;
      if (filter === 'thinking' && !a.thinking_enabled_default) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.personality || '').toLowerCase().includes(q)
      );
    });
  }, [state.assistants, currentUser, filter, query]);

  return (
    <AppTabLayout
      title="AI Assistants"
      fab={
        <Link
          to="/assistants/new"
          aria-label="Create AI Assistant"
          className="h-14 px-5 rounded-full bg-primary text-on-primary flex items-center gap-2 shadow-[0_8px_24px_rgba(15,92,58,0.25)] hover:opacity-95"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
          <span className="text-label-md hidden sm:inline">New Assistant</span>
        </Link>
      }
    >
      <div className="px-margin-mobile md:px-6 pt-space-sm space-y-4">
        {/* Hero Header */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container-low to-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold mb-1.5">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span>Thinking Mode Ready</span>
            </div>
            <h1 className="text-headline-md text-on-surface">Personal AI Assistants Hub</h1>
            <p className="text-body-sm text-on-surface-variant">
              Chat 1-on-1 or invite custom personas into group discussions.
            </p>
          </div>
          <Link
            to="/assistants/new"
            className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Create Assistant</span>
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-surface-container-low flex-1">
            <span className="material-symbols-outlined text-[19px] text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AI assistants..."
              aria-label="Search AI assistants"
              className="w-full bg-transparent outline-none text-body-md text-on-surface"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'mine', label: 'Created by me' },
              { id: 'thinking', label: 'Deep Thinking' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`px-3 py-1.5 rounded-full text-label-sm ${
                  filter === tab.id
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {assistants.length === 0 ? (
          <EmptyState
            icon="smart_toy"
            title="No AI assistants found"
            description="Create your first custom AI assistant with bespoke instructions and tone."
            action={
              <Link
                to="/assistants/new"
                className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold inline-flex items-center gap-1.5"
              >
                <span>Create AI Assistant</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col justify-between gap-4 border border-outline-variant/15"
              >
                <div className="flex items-start gap-3.5">
                  <AssistantAvatar
                    name={assistant.name}
                    iconName={assistant.icon_name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h2 className="text-headline-sm text-on-surface truncate">
                          {assistant.name}
                        </h2>
                        <AIBadge compact />
                      </div>
                      {!assistant.is_enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-semibold">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-primary font-medium mt-0.5">
                      @{assistant.handle} • {assistant.tone || 'Helpful'}
                    </p>
                    <p className="text-body-sm text-on-surface-variant mt-1.5 line-clamp-2">
                      {assistant.description || assistant.instructions}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/15">
                  <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      {assistant.thinking_enabled_default ? 'psychology' : 'bolt'}
                    </span>
                    <span>
                      {assistant.thinking_enabled_default ? 'High Thinking' : 'Fast Mode'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/assistants/${assistant.id}`}
                      className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface text-label-sm font-medium inline-flex items-center hover:bg-surface-container"
                    >
                      Profile
                    </Link>
                    <Link
                      to={`/assistants/${assistant.id}/chat`}
                      onClick={() => openAssistantConversation(assistant.id)}
                      className="h-9 px-3.5 rounded-xl bg-primary text-on-primary text-label-sm font-semibold inline-flex items-center gap-1"
                    >
                      <span>Open Chat</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppTabLayout>
  );
};
