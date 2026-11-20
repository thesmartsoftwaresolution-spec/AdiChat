import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AssistantAvatar, UserAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, ToggleSwitch } from '../../components/ui/Feedback';
import { isGroupAdmin } from '../../utils/permissions';

export const GroupInfoPage: React.FC = () => {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const {
    state,
    currentUser,
    updateGroupMeta,
    removeGroupMember,
    toggleGroupMute,
    submitReport,
    pushToast,
  } = useAppState();
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editOnlyAdmins, setEditOnlyAdmins] = useState(false);
  const [editAiAuto, setEditAiAuto] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Off-topic automated bot flood');
  const [reportDetails, setReportDetails] = useState('');

  const groupMeta = state.groups.find((g) => g.conversation_id === groupId);
  const members = state.conversationMembers.filter((m) => m.conversation_id === groupId);
  const ownMember = members.find((m) => m.user_id === currentUser?.id);
  const actorIsAdmin = currentUser
    ? isGroupAdmin(state.conversationMembers, groupId, currentUser.id)
    : false;

  const groupAssistants = state.groupAssistants.filter(
    (ga) => ga.group_conversation_id === groupId
  );
  const sharedMedia = state.attachments.filter((a) => a.conversation_id === groupId);

  if (!groupMeta) {
    return (
      <MobileStackLayout title="Group Info & Members" backTo="/chats">
        <div className="p-8 text-center text-body-md text-on-surface-variant">
          Group not found.
        </div>
      </MobileStackLayout>
    );
  }

  return (
    <MobileStackLayout title="Group Info & Members" backTo={`/groups/${groupId}`}>
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-5">
        {/* Header Hero */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[36px]">diversity_3</span>
          </div>
          <div>
            <h2 className="text-headline-lg text-on-surface">{groupMeta.name}</h2>
            <p className="text-caption text-on-surface-variant mt-0.5">
              Group • {members.length} participants
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs pt-2">
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}`)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
              <span className="text-caption text-on-surface">Message</span>
            </button>
            <Link
              to={`/chats/${groupId}/media`}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">perm_media</span>
              <span className="text-caption text-on-surface">Media</span>
            </Link>
            <Link
              to={`/groups/${groupId}/members/add`}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
              <span className="text-caption text-on-surface">Add</span>
            </Link>
          </div>
          {actorIsAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditName(groupMeta.name);
                setEditDesc(groupMeta.description || '');
                setEditOnlyAdmins(Boolean(groupMeta.only_admins_send));
                setEditAiAuto(groupMeta.allow_ai_auto_respond ?? true);
                setEditOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-label-sm text-primary font-semibold inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Group Details &amp; Permissions</span>
            </button>
          )}
        </div>

        {/* Purpose */}
        {(groupMeta.description || groupMeta.only_admins_send) && (
          <div className="p-4 rounded-2xl bg-surface-container-low space-y-2">
            {groupMeta.description && (
              <div>
                <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Group Purpose
                </p>
                <p className="text-body-md text-on-surface mt-0.5">{groupMeta.description}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-caption text-on-surface-variant">
                Posting: {groupMeta.only_admins_send ? 'Group Admins Only' : 'All Members'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container text-caption text-on-surface-variant">
                AI Auto-Respond: {groupMeta.allow_ai_auto_respond ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        )}

        {/* Shared Media */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs flex items-center justify-between">
          <div>
            <p className="text-label-md text-on-surface">Shared Media &amp; Docs</p>
            <p className="text-caption text-on-surface-variant">{sharedMedia.length} assets</p>
          </div>
          <Link
            to={`/chats/${groupId}/media`}
            className="text-label-sm text-primary font-semibold inline-flex items-center gap-1"
          >
            <span>See all</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {/* AI Assistants in Group */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-label-md text-on-surface">
              AI Assistants ({groupAssistants.length})
            </p>
            <Link
              to={`/groups/${groupId}/assistants`}
              className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold"
            >
              + Manage Assistants
            </Link>
          </div>

          {groupAssistants.length === 0 ? (
            <p className="text-caption text-on-surface-variant">
              No AI assistants assigned to this group yet.
            </p>
          ) : (
            <div className="space-y-2">
              {groupAssistants.map((ga) => {
                const assistant = state.assistants.find((a) => a.id === ga.assistant_id);
                if (!assistant) return null;
                return (
                  <Link
                    key={ga.id}
                    to={`/assistants/${assistant.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
                  >
                    <div className="flex items-center gap-3">
                      <AssistantAvatar
                        name={assistant.name}
                        iconName={assistant.icon_name}
                        size="sm"
                      />
                      <div>
                        <p className="text-body-md-medium text-on-surface">{assistant.name}</p>
                        <p className="text-caption text-on-surface-variant">
                          {ga.response_mode === 'every_message'
                            ? 'Responds to every message'
                            : 'Responds when @mentioned'}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline text-[18px]">
                      chevron_right
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-label-md text-on-surface">Participants ({members.length})</p>
            {actorIsAdmin && (
              <Link
                to={`/groups/${groupId}/members/add`}
                className="text-label-sm text-primary font-semibold"
              >
                + Add Members
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {members.map((m) => {
              const user = state.profiles.find((p) => p.id === m.user_id);
              if (!user) return null;
              const isSelf = user.id === currentUser?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={user.full_name}
                      src={user.avatar_path}
                      size="sm"
                      isOnline={user.is_online}
                      showPresence
                    />
                    <div className="min-w-0">
                      <p className="text-body-md-medium text-on-surface truncate">
                        {user.full_name} {isSelf && <span className="text-caption">(You)</span>}
                      </p>
                      <p className="text-caption text-on-surface-variant truncate">
                        {user.title || user.about}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.member_role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                        Group Admin
                      </span>
                    )}
                    {actorIsAdmin && !isSelf && (
                      <button
                        type="button"
                        aria-label={`Remove ${user.full_name}`}
                        onClick={() => setConfirmTarget(user.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container/40"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications & Danger Actions */}
        <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/20">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">
                notifications_off
              </span>
              <span className="text-body-md text-on-surface">Mute notifications</span>
            </div>
            <ToggleSwitch
              checked={Boolean(ownMember?.muted_until)}
              onChange={() => toggleGroupMute(groupId)}
              label="Mute group notifications"
            />
          </div>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined">report</span>
            <span className="text-label-md">Report group</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) return;
              const res = removeGroupMember(groupId, currentUser.id);
              if (!res.ok) {
                pushToast(res.error || 'Could not leave group', 'error');
              } else {
                navigate('/chats');
              }
            }}
            className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-md">Exit group</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Remove member?"
        description="They will lose access to this group conversation."
        confirmLabel="Remove"
        destructive
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) {
            const res = removeGroupMember(groupId, confirmTarget);
            if (!res.ok) pushToast(res.error || 'Unable to remove member', 'error');
          }
          setConfirmTarget(null);
        }}
      />

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Edit group details"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editName.trim()) {
                pushToast('Group name is required', 'error');
                return;
              }
              const res = updateGroupMeta(groupId, {
                name: editName.trim(),
                description: editDesc.trim() || null,
                only_admins_send: editOnlyAdmins,
                allow_ai_auto_respond: editAiAuto,
              });
              if (res.ok) setEditOpen(false);
              else pushToast(res.error || 'Could not update group', 'error');
            }}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-headline-md text-on-surface">Edit Group Details</h3>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Group Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">
                Group Purpose / Description
              </label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              />
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-medium text-on-surface">Only Admins Send</p>
                  <p className="text-caption text-on-surface-variant">Restrict posting to group admins</p>
                </div>
                <ToggleSwitch
                  checked={editOnlyAdmins}
                  onChange={setEditOnlyAdmins}
                  label="Only Admins Send"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-medium text-on-surface">Allow AI Auto-Respond</p>
                  <p className="text-caption text-on-surface-variant">Allow @mentions and bot replies</p>
                </div>
                <ToggleSwitch
                  checked={editAiAuto}
                  onChange={setEditAiAuto}
                  label="Allow AI Auto-Respond"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-md font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report group"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const res = submitReport({
                targetType: 'group',
                targetGroupConversationId: groupId,
                reason: reportReason,
                details: reportDetails,
              });
              if (res.ok) {
                setReportOpen(false);
                setReportDetails('');
              } else {
                pushToast(res.error || 'Could not submit report', 'error');
              }
            }}
            className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-headline-md text-on-surface">Report {groupMeta.name}</h3>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                aria-label="Group report reason"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              >
                <option value="Off-topic automated bot flood">Off-topic automated bot flood</option>
                <option value="Harassment or abusive messages">Harassment or abusive messages</option>
                <option value="Spam or phishing content">Spam or phishing content</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">
                Additional details (optional)
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full p-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-error text-on-error text-label-md font-semibold"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </MobileStackLayout>
  );
};
