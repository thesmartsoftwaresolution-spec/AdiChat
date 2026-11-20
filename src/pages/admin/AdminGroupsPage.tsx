import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, EmptyState } from '../../components/ui/Feedback';

export const AdminGroupsPage: React.FC = () => {
  const { state, updateGroupMeta, removeGroupMember, adminDeleteGroup, pushToast } = useAppState();
  const [confirmGroupId, setConfirmGroupId] = useState<string | null>(null);
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const managedGroup = state.groups.find((g) => g.conversation_id === manageGroupId);
  const managedMembers = manageGroupId
    ? state.conversationMembers.filter((m) => m.conversation_id === manageGroupId)
    : [];

  return (
    <AdminLayout title="Admin - Groups">
      <div className="space-y-4">
        {state.groups.length === 0 ? (
          <EmptyState
            icon="diversity_3"
            title="No groups found"
            description="No group conversations currently exist."
          />
        ) : (
          <div className="space-y-3">
            {state.groups.map((grp) => {
              const memberCount = state.conversationMembers.filter(
                (m) => m.conversation_id === grp.conversation_id
              ).length;
              const aiCount = state.groupAssistants.filter(
                (ga) => ga.group_conversation_id === grp.conversation_id
              ).length;
              const creator = state.profiles.find((p) => p.id === grp.created_by);

              return (
                <div
                  key={grp.conversation_id}
                  className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        diversity_3
                      </span>
                      <h2 className="text-headline-sm text-on-surface truncate">{grp.name}</h2>
                    </div>
                    <p className="text-body-sm text-on-surface-variant line-clamp-1">
                      {grp.description || 'No description'}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {memberCount} members • {aiCount} AI assistant(s) • Created by{' '}
                      {creator?.full_name || 'Member'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setManageGroupId(grp.conversation_id);
                        setRenameDraft(grp.name);
                      }}
                      className="h-9 px-3 rounded-xl bg-secondary-container text-on-secondary-container text-label-sm font-semibold"
                    >
                      Manage
                    </button>
                    <Link
                      to={`/groups/${grp.conversation_id}/info`}
                      className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface text-label-sm inline-flex items-center"
                    >
                      Inspect
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmGroupId(grp.conversation_id)}
                      className="h-9 px-3 rounded-xl bg-error-container text-on-error-container text-label-sm font-semibold"
                    >
                      Delete Group
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {managedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${managedGroup.name}`}
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-md text-on-surface">Manage Group</h3>
              <button
                type="button"
                aria-label="Close group manager"
                onClick={() => setManageGroupId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!renameDraft.trim()) {
                  pushToast('Group name cannot be empty', 'error');
                  return;
                }
                const res = await updateGroupMeta(managedGroup.conversation_id, {
                  name: renameDraft.trim(),
                });
                if (!res.ok) pushToast(res.error || 'Rename failed', 'error');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                aria-label="Rename group"
                className="flex-1 h-10 px-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold shrink-0"
              >
                Rename
              </button>
            </form>

            <div className="space-y-2">
              <p className="text-label-sm text-on-surface-variant">
                Participants ({managedMembers.length})
              </p>
              {managedMembers.map((m) => {
                const prof = state.profiles.find((p) => p.id === m.user_id);
                if (!prof) return null;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar name={prof.full_name} src={prof.avatar_path} size="sm" />
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-on-surface truncate">
                          {prof.full_name}
                        </p>
                        <p className="text-caption text-on-surface-variant capitalize">
                          {m.member_role}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await removeGroupMember(managedGroup.conversation_id, prof.id);
                        if (!res.ok) pushToast(res.error || 'Unable to remove member', 'error');
                      }}
                      className="h-8 px-2.5 rounded-lg bg-error-container text-on-error-container text-caption font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmGroupId)}
        title="Delete group?"
        description="This permanently removes the group conversation and logs the moderation action."
        confirmLabel="Delete Group"
        destructive
        onCancel={() => setConfirmGroupId(null)}
        onConfirm={() => {
          if (confirmGroupId) adminDeleteGroup(confirmGroupId);
          setConfirmGroupId(null);
        }}
      />
    </AdminLayout>
  );
};
