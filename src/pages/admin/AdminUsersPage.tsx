import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';
import type { UserStatus } from '../../types/database';

export const AdminUsersPage: React.FC = () => {
  const { state, adminUpdateUserStatus, adminBulkUpdateUserStatus } = useAppState();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.profiles.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [state.profiles, query, statusFilter]);

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <AdminLayout title="Admin - Users">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-surface-container-low flex-1">
            <span className="material-symbols-outlined text-[19px] text-on-surface-variant">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users by name or email..."
              aria-label="Search admin users"
              className="w-full bg-transparent outline-none text-body-md text-on-surface"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'active', 'suspended', 'banned'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-label-sm capitalize ${
                  statusFilter === s
                    ? 'bg-secondary-container text-on-secondary-container font-semibold'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-secondary-container/60 flex flex-wrap items-center justify-between gap-3">
            <span className="text-label-md text-on-secondary-container font-semibold">
              {selectedIds.length} user{selectedIds.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await adminBulkUpdateUserStatus(selectedIds, 'suspended', 'Bulk suspend from Admin Users');
                  setSelectedIds([]);
                }}
                className="h-9 px-3 rounded-xl bg-error-container text-on-error-container text-label-sm font-semibold"
              >
                Suspend Selected
              </button>
              <button
                type="button"
                onClick={async () => {
                  await adminBulkUpdateUserStatus(selectedIds, 'active', 'Bulk reactivate from Admin Users');
                  setSelectedIds([]);
                }}
                className="h-9 px-3 rounded-xl bg-primary text-on-primary text-label-sm font-semibold"
              >
                Reactivate Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="h-9 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-label-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {users.map((u) => {
            const role =
              state.userRoles.find((r) => r.user_id === u.id)?.role || 'user';
            const selectable = role !== 'super_admin';
            const checked = selectedIds.includes(u.id);

            return (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectable ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(u.id)}
                      aria-label={`Select ${u.full_name}`}
                      className="w-4 h-4 accent-primary rounded shrink-0 cursor-pointer"
                    />
                  ) : (
                    <span className="w-4 h-4 shrink-0" />
                  )}

                  <Link
                    to={`/admin/users/${u.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <UserAvatar
                      name={u.full_name}
                      src={u.avatar_path}
                      size="md"
                      isOnline={u.is_online}
                      showPresence
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-headline-sm text-on-surface truncate">
                          {u.full_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[10px] font-semibold uppercase">
                          {role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-caption text-on-surface-variant truncate">{u.email}</p>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-label-sm capitalize ${
                      u.status === 'active'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {u.status}
                  </span>

                  {selectable && (
                    <button
                      type="button"
                      onClick={() => void adminUpdateUserStatus(
                        u.id,
                        u.status === 'active' ? 'suspended' : 'active',
                        'Toggled from Admin Users directory'
                      )}
                      className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface text-label-sm hover:bg-surface-container"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}

                  <Link
                    to={`/admin/users/${u.id}`}
                    className="h-9 px-3 rounded-xl bg-primary text-on-primary text-label-sm font-semibold inline-flex items-center"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};
