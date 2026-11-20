import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, ToggleSwitch } from '../../components/ui/Feedback';

export const ContactInfoPage: React.FC = () => {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();
  const {
    state,
    currentUser,
    toggleGroupMute,
    toggleBlockUser,
    isUserBlocked,
    submitReport,
    pushToast,
  } = useAppState();

  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or unsolicited links');
  const [reportDetails, setReportDetails] = useState('');

  const memberRow = state.conversationMembers.find(
    (m) => m.conversation_id === conversationId && m.user_id === currentUser?.id
  );
  const otherMember = state.conversationMembers.find(
    (m) => m.conversation_id === conversationId && m.user_id !== currentUser?.id
  );
  const contact = state.profiles.find((p) => p.id === otherMember?.user_id);

  const sharedMedia = useMemo(
    () => state.attachments.filter((a) => a.conversation_id === conversationId),
    [state.attachments, conversationId]
  );

  const sharedGroups = useMemo(() => {
    if (!contact) return [];
    const contactConvs = new Set(
      state.conversationMembers
        .filter((m) => m.user_id === contact.id)
        .map((m) => m.conversation_id)
    );
    return state.groups.filter((g) => contactConvs.has(g.conversation_id));
  }, [state.conversationMembers, state.groups, contact]);

  if (!contact) {
    return (
      <MobileStackLayout title="Contact Info" backTo={`/chats/${conversationId}`}>
        <div className="p-8 text-center text-body-md text-on-surface-variant">
          Contact details unavailable.
        </div>
      </MobileStackLayout>
    );
  }

  const blocked = isUserBlocked(contact.id);
  const isMuted = Boolean(memberRow?.muted_until);

  return (
    <MobileStackLayout title="Contact Info" backTo={`/chats/${conversationId}`}>
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-5">
        {/* Hero */}
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col items-center text-center space-y-3">
          <UserAvatar
            name={contact.full_name}
            src={contact.avatar_path}
            size="xl"
            isOnline={contact.is_online}
            showPresence
          />
          <div>
            <h2 className="text-headline-lg text-on-surface">{contact.full_name}</h2>
            <p className="text-body-sm text-on-surface-variant">{contact.email}</p>
            <p className="text-caption text-secondary mt-1">
              {contact.is_online ? 'Online now' : 'Last seen recently'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs pt-2">
            <button
              type="button"
              onClick={() => navigate(`/chats/${conversationId}`)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
              <span className="text-caption text-on-surface">Message</span>
            </button>
            <button
              type="button"
              onClick={() => pushToast('Audio call signaled (demo mode)', 'info')}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">call</span>
              <span className="text-caption text-on-surface">Audio</span>
            </button>
            <Link
              to={`/chats/${conversationId}/media`}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">perm_media</span>
              <span className="text-caption text-on-surface">Media</span>
            </Link>
          </div>
        </div>

        {/* Bio */}
        <div className="p-4 rounded-2xl bg-surface-container-low space-y-1">
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">About</p>
          <p className="text-body-md text-on-surface">
            {contact.about || 'Hey there! Using AdiChat.'}
          </p>
        </div>

        {/* Shared Media */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface">
              Shared Media &amp; Files ({sharedMedia.length})
            </span>
            <Link
              to={`/chats/${conversationId}/media`}
              className="text-label-sm text-primary font-semibold flex items-center gap-0.5"
            >
              <span>See all</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
          {sharedMedia.length === 0 ? (
            <p className="text-caption text-on-surface-variant">No shared assets yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {sharedMedia.slice(0, 4).map((att) => (
                <Link
                  key={att.id}
                  to={`/media/${att.message_id}`}
                  className="aspect-square rounded-xl bg-surface-container-low overflow-hidden flex items-center justify-center"
                >
                  {att.preview_url ? (
                    <img
                      src={att.preview_url}
                      alt={att.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      description
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Groups in Common */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2.5">
          <p className="text-label-md text-on-surface">
            Groups in Common ({sharedGroups.length})
          </p>
          {sharedGroups.length === 0 ? (
            <p className="text-caption text-on-surface-variant">No shared groups yet.</p>
          ) : (
            sharedGroups.map((g) => (
              <Link
                key={g.conversation_id}
                to={`/groups/${g.conversation_id}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low"
              >
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">diversity_3</span>
                </div>
                <span className="text-body-md-medium text-on-surface">{g.name}</span>
              </Link>
            ))
          )}
        </div>

        {/* Controls */}
        <div className="rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/20">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">
                notifications_off
              </span>
              <span className="text-body-md text-on-surface">Mute notifications</span>
            </div>
            <ToggleSwitch
              checked={isMuted}
              onChange={() => {
                toggleGroupMute(conversationId);
                pushToast(isMuted ? 'Notifications unmuted' : 'Notifications muted', 'info');
              }}
              label="Mute notifications"
            />
          </div>

          <button
            type="button"
            onClick={() => setConfirmBlockOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined">block</span>
            <span className="text-label-md">
              {blocked ? `Unblock ${contact.full_name}` : `Block ${contact.full_name}`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-left text-error hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined">report</span>
            <span className="text-label-md">Report {contact.full_name}</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBlockOpen}
        title={blocked ? `Unblock ${contact.full_name}?` : `Block ${contact.full_name}?`}
        description={
          blocked
            ? 'They will be able to send you messages again.'
            : 'Blocked contacts cannot message you until you unblock them.'
        }
        confirmLabel={blocked ? 'Unblock' : 'Block User'}
        destructive={!blocked}
        onCancel={() => setConfirmBlockOpen(false)}
        onConfirm={async () => {
          await toggleBlockUser(contact.id);
          setConfirmBlockOpen(false);
          pushToast(blocked ? 'Contact unblocked' : 'Contact blocked', 'info');
        }}
      />

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Report ${contact.full_name}`}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await submitReport({
                targetType: 'user',
                targetUserId: contact.id,
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
            <h3 className="text-headline-md text-on-surface">Report {contact.full_name}</h3>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                aria-label="Report reason"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-body-md text-on-surface outline-none"
              >
                <option value="Spam or unsolicited links">Spam or unsolicited links</option>
                <option value="Harassment or abusive behavior">Harassment or abusive behavior</option>
                <option value="Impersonation or fake account">Impersonation or fake account</option>
                <option value="Suspicious automated behavior">Suspicious automated behavior</option>
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
                placeholder="Describe what happened..."
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
