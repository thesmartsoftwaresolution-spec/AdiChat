import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';

export const NewGroupMembersPage: React.FC = () => {
  const { state, currentUser, pushToast } = useAppState();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(import.meta.env.DEV ? ['u-ayesha', 'u-hamza'] : []);
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>(import.meta.env.DEV ? ['ai-study-buddy'] : []);

  const q = query.trim().toLowerCase();

  const contacts = useMemo(
    () =>
      state.profiles
        .filter(
          (p) =>
            p.id !== currentUser?.id &&
            p.status === 'active' &&
            (!q ||
              p.full_name.toLowerCase().includes(q) ||
              (p.email || '').toLowerCase().includes(q))
        )
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [state.profiles, currentUser, q]
  );

  const assistants = useMemo(
    () =>
      state.assistants.filter(
        (a) => a.is_enabled && (!q || a.name.toLowerCase().includes(q))
      ),
    [state.assistants, q]
  );

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAssistant = (id: string) => {
    setSelectedAssistantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalSelected = selectedUserIds.length + selectedAssistantIds.length;

  const handleNext = () => {
    if (selectedUserIds.length === 0) {
      pushToast('Select at least one person to create a group.', 'error');
      return;
    }
    navigate('/groups/new/details', {
      state: { memberIds: selectedUserIds, assistantIds: selectedAssistantIds },
    });
  };

  return (
    <MobileStackLayout title="New Group - Select Members" backTo="/chats">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-4 space-y-4 pb-24">
        {/* Search */}
        <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email..."
            aria-label="Search members"
            className="w-full bg-transparent outline-none text-body-md text-on-surface"
          />
        </div>

        {/* Selected Roster Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
              Group Roster
            </span>
            <span className="text-caption text-primary font-semibold">
              {totalSelected} of 256 selected
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {selectedAssistantIds.map((id) => {
              const a = state.assistants.find((x) => x.id === id);
              if (!a) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleAssistant(id)}
                  className="shrink-0 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-medium"
                >
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  <span>{a.name}</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              );
            })}
            {selectedUserIds.map((id) => {
              const u = state.profiles.find((x) => x.id === id);
              if (!u) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleUser(id)}
                  className="shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-medium"
                >
                  <UserAvatar name={u.full_name} size="xs" />
                  <span>{u.full_name}</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synthetic Communicators (AI Assistants) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                auto_awesome
              </span>
              <h2 className="text-label-md text-on-surface uppercase tracking-wide">
                AI Co-pilots
              </h2>
            </div>
            <span className="text-caption text-on-surface-variant">Smart Assistants</span>
          </div>

          <div className="space-y-2">
            {assistants.map((a) => {
              const checked = selectedAssistantIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAssistant(a.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AssistantAvatar name={a.name} iconName={a.icon_name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-body-md-medium text-on-surface truncate">
                          {a.name}
                        </span>
                        <AIBadge compact />
                      </div>
                      <p className="text-caption text-on-surface-variant truncate">
                        {a.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      checked
                        ? 'bg-primary border-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    {checked && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Human Contacts */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-label-md text-on-surface uppercase tracking-wide">Contacts</h2>
            <span className="text-caption text-on-surface-variant">Sorted alphabetically</span>
          </div>

          <div className="space-y-1.5">
            {contacts.map((person) => {
              const checked = selectedUserIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => toggleUser(person.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-left shadow-xs"
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
                      <p className="text-body-md-medium text-on-surface truncate">
                        {person.full_name}
                      </p>
                      <p className="text-caption text-on-surface-variant truncate">
                        {person.title || 'Member'} • {person.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${
                      checked
                        ? 'bg-primary border-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    {checked && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 p-3 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="px-4 h-12 rounded-xl bg-surface-container-low flex items-center gap-2 text-label-md text-on-surface shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
            <span>{totalSelected} selected</span>
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md"
          >
            <span>Next Step</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </MobileStackLayout>
  );
};
