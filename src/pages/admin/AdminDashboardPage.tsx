import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { UserAvatar } from '../../components/ui/Avatar';

export const AdminDashboardPage: React.FC = () => {
  const { state, currentUser, isSuperAdminUser } = useAppState();
  const openReports = state.reports.filter((r) => r.status === 'open');
  const onlineUsers = state.profiles.filter((p) => p.is_online).length;

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-5">
        {/* Top Context Ribbon */}
        <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              name={currentUser?.full_name || 'Adeel Bhatti'}
              size="sm"
              isOnline
              showPresence
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body-md-medium text-on-surface truncate">
                  {currentUser?.full_name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {isSuperAdminUser ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <p className="text-caption text-on-surface-variant flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Live platform administration
              </p>
            </div>
          </div>

          <Link
            to="/admin/announcements-logs"
            className="h-9 px-3 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold inline-flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span className="hidden sm:inline">Audit Logs</span>
          </Link>
        </div>

        {/* Welcome Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container-low to-surface-container shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              Admin Control Center
            </span>
          </div>
          <h2 className="text-headline-lg text-on-surface">
            Welcome back, {currentUser?.full_name.split(' ')[0]}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Workspace overview, moderation queue, and platform configuration
          </p>
        </div>

        {/* Open Reports Alert */}
        {openReports.length > 0 && (
          <div className="p-4 rounded-2xl bg-error-container/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body-md-medium text-on-surface">Flagged Content</span>
                  <span className="w-5 h-5 rounded-full bg-error text-on-error text-[11px] font-bold flex items-center justify-center">
                    {openReports.length}
                  </span>
                </div>
                <p className="text-caption text-on-surface-variant truncate">
                  {openReports.length} open report(s) pending moderation review
                </p>
              </div>
            </div>
            <Link
              to="/admin/reports"
              className="h-9 px-3.5 rounded-xl bg-error text-on-error text-label-sm font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <span>Review</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">Total Users</span>
              <span className="material-symbols-outlined text-primary text-[19px]">group</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.profiles.length}</p>
            <p className="text-caption text-secondary">{onlineUsers} online now</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">Total Messages</span>
              <span className="material-symbols-outlined text-primary text-[19px]">forum</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.messages.length}</p>
            <p className="text-caption text-on-surface-variant">Across {state.conversations.length} threads</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">Groups</span>
              <span className="material-symbols-outlined text-primary text-[19px]">diversity_3</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.groups.length}</p>
            <p className="text-caption text-on-surface-variant">Active guilds</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">AI Assistants</span>
              <span className="material-symbols-outlined text-secondary text-[19px]">smart_toy</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.assistants.length}</p>
            <p className="text-caption text-secondary">
              {state.assistants.filter((a) => a.is_enabled).length} enabled
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">Shared Assets</span>
              <span className="material-symbols-outlined text-primary text-[19px]">cloud_queue</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.attachments.length}</p>
            <p className="text-caption text-on-surface-variant">Storage ready</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-on-surface-variant">Audit Entries</span>
              <span className="material-symbols-outlined text-primary text-[19px]">fact_check</span>
            </div>
            <p className="text-headline-lg text-on-surface">{state.auditLogs.length}</p>
            <p className="text-caption text-on-surface-variant">Append-only trail</p>
          </div>
        </div>

        {/* Administrative Quick Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/admin/announcements-logs', label: 'Broadcast', sub: 'Send announcement', icon: 'campaign' },
            { to: '/admin/users', label: 'Manage Users', sub: 'Roles & status', icon: 'manage_accounts' },
            { to: '/admin/developer-profile', label: 'Dev Profile', sub: 'Public bio & links', icon: 'badge' },
            { to: '/admin/settings', label: 'App Settings', sub: 'Platform limits', icon: 'tune' },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs hover:bg-surface-container-low flex flex-col gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
              </div>
              <div>
                <p className="text-body-md-medium text-on-surface">{card.label}</p>
                <p className="text-caption text-on-surface-variant">{card.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Users */}
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm text-on-surface">Directory Snapshot</h3>
            <Link to="/admin/users" className="text-label-sm text-primary font-semibold hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {state.profiles.slice(0, 4).map((u) => (
              <Link
                key={u.id}
                to={`/admin/users/${u.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={u.full_name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-body-md-medium text-on-surface truncate">{u.full_name}</p>
                    <p className="text-caption text-on-surface-variant truncate">{u.email}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                    u.status === 'active'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {u.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
