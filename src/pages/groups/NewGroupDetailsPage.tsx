import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';
import { ToggleSwitch } from '../../components/ui/Feedback';
import { validateGroupName } from '../../utils/validators';

interface LocationSelectionState {
  memberIds?: string[];
  assistantIds?: string[];
}

export const NewGroupDetailsPage: React.FC = () => {
  const { state, currentUser, createGroup } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const selection = (location.state || {}) as LocationSelectionState;

  const memberIds = selection.memberIds || (import.meta.env.DEV ? ['u-ayesha', 'u-hamza'] : []);
  const assistantIds = selection.assistantIds || (import.meta.env.DEV ? ['ai-study-buddy'] : []);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [onlyAdminsSend, setOnlyAdminsSend] = useState(false);
  const [allowAiAutoRespond, setAllowAiAutoRespond] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    const validationError = validateGroupName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!memberIds.length) {
      setError('Select at least one other active member before creating the group.');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const conv = await createGroup({
        name,
        description,
        memberIds,
        assistantIds,
        onlyAdminsSend,
        allowAiAutoRespond,
      });
      if (conv) navigate(`/groups/${conv.id}`);
      else setError('Group could not be created. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MobileStackLayout title="New Group - Group Details" backTo="/groups/new/members">
      <form
        onSubmit={handleCreate}
        className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-5"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-24 h-24 rounded-full bg-secondary-container/70 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px]">groups</span>
            <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            </span>
          </div>
          <p className="text-label-md text-on-surface">Add group photo</p>
          <p className="text-caption text-on-surface-variant">Recommended size: 500x500px</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="group-subject" className="text-label-md text-on-surface">
              Group Subject
            </label>
            <span className="text-caption text-on-surface-variant">{name.length}/50</span>
          </div>
          <input
            id="group-subject"
            type="text"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Frontend Engineering Guild"
            className="w-full h-12 px-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="group-desc" className="text-label-md text-on-surface">
            Description
          </label>
          <textarea
            id="group-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Weekly design syncs, component libraries, and team discussions."
            className="w-full p-4 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-none"
          />
          <p className="text-caption text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Members can see this description when they join.
          </p>
        </div>

        {/* Participants Preview */}
        <div className="p-4 rounded-2xl bg-surface-container-low space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface">
              Participants ({memberIds.length + assistantIds.length + 1} total)
            </span>
            <Link
              to="/groups/new/members"
              className="text-label-sm text-primary font-semibold hover:underline"
            >
              + Edit Roster
            </Link>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {currentUser && (
              <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                <UserAvatar name={currentUser.full_name} size="md" />
                <span className="text-caption text-on-surface truncate w-full text-center">
                  {currentUser.full_name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-semibold text-primary">Admin</span>
              </div>
            )}
            {assistantIds.map((aid) => {
              const a = state.assistants.find((x) => x.id === aid);
              if (!a) return null;
              return (
                <div key={aid} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <AssistantAvatar name={a.name} iconName={a.icon_name} size="md" />
                  <span className="text-caption text-on-surface truncate w-full text-center">
                    {a.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-semibold text-secondary">Assistant</span>
                </div>
              );
            })}
            {memberIds.map((uid) => {
              const u = state.profiles.find((x) => x.id === uid);
              if (!u) return null;
              return (
                <div key={uid} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <UserAvatar name={u.full_name} size="md" />
                  <span className="text-caption text-on-surface truncate w-full text-center">
                    {u.full_name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">Member</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group Settings */}
        <div className="p-4 rounded-2xl bg-surface-container-low space-y-4">
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
            Group Settings
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body-md-medium text-on-surface">Send messages</p>
              <p className="text-caption text-on-surface-variant">
                {onlyAdminsSend ? 'Only Group Admins can post' : 'All participants can post'}
              </p>
            </div>
            <div className="flex p-0.5 rounded-full bg-surface-container">
              <button
                type="button"
                onClick={() => setOnlyAdminsSend(false)}
                className={`px-3 py-1 rounded-full text-label-sm ${
                  !onlyAdminsSend ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOnlyAdminsSend(true)}
                className={`px-3 py-1 rounded-full text-label-sm ${
                  onlyAdminsSend ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant'
                }`}
              >
                Admins
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body-md-medium text-on-surface">Allow AI auto-respond</p>
              <p className="text-caption text-on-surface-variant">
                Assistants reply when @mentioned or queried
              </p>
            </div>
            <ToggleSwitch
              checked={allowAiAutoRespond}
              onChange={setAllowAiAutoRespond}
              label="Allow AI auto-respond"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px]">{creating ? 'hourglass_top' : 'group_add'}</span>
          <span>{creating ? 'Creating...' : 'Create Group'}</span>
        </button>
      </form>
    </MobileStackLayout>
  );
};
