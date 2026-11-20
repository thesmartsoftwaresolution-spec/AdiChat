import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, EmptyState } from '../../components/ui/Feedback';
import type { AppRole, UserStatus } from '../../types/database';

export const AdminUserDetailPage: React.FC = () => {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const {
    state,
    isSuperAdminUser,
    adminUpdateUserStatus,
    adminSetUserRole,
    adminDeleteUser,
    pushToast,
  } = useAppState();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const user = state.profiles.find((p) => p.id === userId);
  if (!user) {
    return (
      <AdminLayout title="Admin - User Detail">
        <EmptyState
          icon="person_off"
          title="User not found"
          description="Return to the Users directory."
          action={
            <Link to="/admin/users" className="h-10 px-4 rounded-xl bg-primary text-on-primary inline-flex items-center text-label-sm">
              Back to Users
            </Link>
          }
        />
      </AdminLayout>
    );
  }

  const userRole =
    state.userRoles.find((r) => r.user_id === user.id)?.role || 'user';
  const userMemberships = state.conversationMembers.filter((m) => m.user_id === user.id);
  const userAssistants = state.assistants.filter((a) => a.owner_user_id === user.id);

  return (
    <AdminLayout title={`User Detail • ${user.full_name}`}>
      <div className="max-w-3xl space-y-5">
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={user.full_name}
              src={user.avatar_path}
              size="lg"
              isOnline={user.is_online}
              showPresence
            />
            <div>
              <h2 className="text-headline-md text-on-surface">{user.full_name}</h2>
              <p className="text-body-sm text-on-surface-variant">{user.email}</p>
              <p className="text-caption text-primary mt-0.5">
                Role: <strong className="uppercase">{userRole.replace('_', ' ')}</strong> • Status:{' '}
                <strong className="capitalize">{user.status}</strong>
              </p>
            </div>
          </div>
          <Link
            to="/admin/users"
            className="h-9 px-3.5 rounded-xl bg-surface-container-low text-on-surface text-label-sm inline-flex items-center self-start"
          >
            ← All Users
          </Link>
        </div>

        {/* Account Controls */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs space-y-4">
          <h3 className="text-headline-sm text-on-surface">Account Status &amp; Moderation</h3>
          <div className="flex flex-wrap gap-2">
            {(['active', 'suspended', 'banned'] as UserStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                disabled={userRole === 'super_admin' && st !== 'active'}
                onClick={() => adminUpdateUserStatus(user.id, st, 'Updated from User Detail')}
                className={`h-10 px-4 rounded-xl text-label-sm font-semibold capitalize ${
                  user.status === st
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-40'
                }`}
              >
                Set {st}
              </button>
            ))}

            {userRole !== 'super_admin' && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="h-10 px-4 rounded-xl bg-error-container text-on-error-container text-label-sm font-semibold ml-auto"
              >
                Delete User
              </button>
            )}
          </div>

          {isSuperAdminUser && userRole !== 'super_admin' && (
            <div className="pt-3 border-t border-outline-variant/20 space-y-2">
              <p className="text-label-md text-on-surface">Role Assignment (Super Admin only)</p>
              <div className="flex flex-wrap gap-2">
                {(['user', 'admin'] as AppRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      const res = adminSetUserRole(user.id, r);
                      if (!res.ok) pushToast(res.error || 'Role update failed', 'error');
                    }}
                    className={`h-9 px-4 rounded-xl text-label-sm font-semibold uppercase ${
                      userRole === r
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-surface-container-low space-y-2">
            <h3 className="text-label-md text-on-surface">
              Memberships ({userMemberships.length})
            </h3>
            {userMemberships.length === 0 ? (
              <p className="text-caption text-on-surface-variant">No active memberships.</p>
            ) : (
              userMemberships.slice(0, 6).map((m) => {
                const conv = state.conversations.find((c) => c.id === m.conversation_id);
                return (
                  <p key={m.id} className="text-body-sm text-on-surface-variant truncate">
                    • {conv?.title || m.conversation_id} ({m.member_role})
                  </p>
                );
              })
            )}
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-low space-y-2">
            <h3 className="text-label-md text-on-surface">
              Owned AI Assistants ({userAssistants.length})
            </h3>
            {userAssistants.length === 0 ? (
              <p className="text-caption text-on-surface-variant">No custom assistants created.</p>
            ) : (
              userAssistants.map((a) => (
                <p key={a.id} className="text-body-sm text-primary font-medium">
                  • {a.name}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${user.full_name}?`}
        description="This removes the user account, role assignments, and group memberships, and records an audit log entry."
        confirmLabel="Delete User"
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          const res = adminDeleteUser(user.id);
          setConfirmDeleteOpen(false);
          if (res.ok) {
            navigate('/admin/users');
          } else {
            pushToast(res.error || 'Unable to delete user', 'error');
          }
        }}
      />
    </AdminLayout>
  );
};
