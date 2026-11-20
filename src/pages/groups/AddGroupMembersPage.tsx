import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/Feedback';

export const AddGroupMembersPage: React.FC = () => {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { state, addGroupMembers, pushToast } = useAppState();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const existingMemberIds = useMemo(
    () =>
      new Set(
        state.conversationMembers
          .filter((m) => m.conversation_id === groupId)
          .map((m) => m.user_id)
      ),
    [state.conversationMembers, groupId]
  );

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.profiles.filter(
      (p) =>
        p.status === 'active' &&
        !existingMemberIds.has(p.id) &&
        (!q || p.full_name.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
    );
  }, [state.profiles, existingMemberIds, query]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      pushToast('Select at least one person to add.', 'error');
      return;
    }
    const res = await addGroupMembers(groupId, selected);
    if (!res.ok) {
      pushToast(res.error || 'Could not add members', 'error');
      return;
    }
    navigate(`/groups/${groupId}/info`);
  };

  return (
    <MobileStackLayout title="Add Members to Group" backTo={`/groups/${groupId}/info`}>
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-4 space-y-4">
        <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search eligible users..."
            aria-label="Search eligible users"
            className="w-full bg-transparent outline-none text-body-md text-on-surface"
          />
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            icon="group"
            title="All active users are already members"
            description="No additional eligible users match your search."
          />
        ) : (
          <div className="space-y-2">
            {candidates.map((u) => {
              const checked = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low text-left"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.full_name} size="md" isOnline={u.is_online} showPresence />
                    <div>
                      <p className="text-body-md-medium text-on-surface">{u.full_name}</p>
                      <p className="text-caption text-on-surface-variant">{u.title || u.email}</p>
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
        )}

        {candidates.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md shadow-md"
          >
            Add {selected.length || ''} Selected Member{selected.length === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </MobileStackLayout>
  );
};
