import React, { useMemo, useState } from 'react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { ToggleSwitch } from '../../components/ui/Feedback';

export const AdminAnnouncementsLogsPage: React.FC = () => {
  const { state, adminPublishAnnouncement, pushToast } = useAppState();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [logQuery, setLogQuery] = useState('');

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    if (!q) return state.auditLogs;
    return state.auditLogs.filter((log) => {
      const actor = state.profiles.find((p) => p.id === log.actor_user_id);
      return (
        log.action.toLowerCase().includes(q) ||
        (log.target_type || '').toLowerCase().includes(q) ||
        (log.target_id || '').toLowerCase().includes(q) ||
        (actor?.full_name || '').toLowerCase().includes(q)
      );
    });
  }, [state.auditLogs, state.profiles, logQuery]);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      pushToast('Title and announcement message are required.', 'error');
      return;
    }
    adminPublishAnnouncement({ title, body, show_as_banner: showBanner });
    setTitle('');
    setBody('');
  };

  const handleExportLogs = () => {
    const payload = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adichat-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`Exported ${filteredLogs.length} audit event(s)`, 'success');
  };

  return (
    <AdminLayout title="Admin - Announcements & Logs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Publish Announcement */}
        <section className="space-y-4">
          <form
            onSubmit={handlePublish}
            className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
              <h2 className="text-headline-sm text-on-surface">Broadcast Announcement</h2>
            </div>

            <div>
              <label htmlFor="ann-title" className="block text-label-md text-on-surface mb-1">
                Title
              </label>
              <input
                id="ann-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Maintenance Window"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              />
            </div>

            <div>
              <label htmlFor="ann-body" className="block text-label-md text-on-surface mb-1">
                Message
              </label>
              <textarea
                id="ann-body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Communicate platform updates to active users..."
                className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface">Show as top banner in Chats</span>
              <ToggleSwitch
                checked={showBanner}
                onChange={setShowBanner}
                label="Show announcement as banner"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary text-on-primary text-label-md shadow-sm"
            >
              Publish Announcement
            </button>
          </form>

          <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
            <h3 className="text-label-md text-on-surface">
              Recent Broadcasts ({state.announcements.length})
            </h3>
            {state.announcements.map((ann) => (
              <div key={ann.id} className="p-3 rounded-xl bg-surface-container-low space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-md-medium text-on-surface">{ann.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-semibold uppercase">
                    {ann.status}
                  </span>
                </div>
                <p className="text-caption text-on-surface-variant">{ann.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Append-Only Audit Logs */}
        <section className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
              <h2 className="text-headline-sm text-on-surface">Audit Trail</h2>
              <span className="text-caption text-on-surface-variant">
                ({filteredLogs.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportLogs}
              className="h-9 px-3 rounded-xl bg-secondary-container text-on-secondary-container text-label-sm font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export JSON</span>
            </button>
          </div>

          <input
            type="search"
            value={logQuery}
            onChange={(e) => setLogQuery(e.target.value)}
            placeholder="Filter logs by action, actor, or target..."
            aria-label="Filter audit logs"
            className="w-full h-10 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
          />

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const actor = state.profiles.find((p) => p.id === log.actor_user_id);
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-surface-container-low space-y-1 text-body-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-primary">
                      {log.action}
                    </span>
                    <span className="text-timestamp text-on-surface-variant">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-caption text-on-surface-variant">
                    Actor: {actor?.full_name || 'System'} • Target: {log.target_type || 'system'}/
                    {log.target_id || '-'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};
