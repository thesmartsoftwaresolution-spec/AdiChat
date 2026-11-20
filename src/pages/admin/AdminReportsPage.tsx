import React, { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { EmptyState } from '../../components/ui/Feedback';
import type { ReportStatus } from '../../types/database';

type EnforcementAction = 'none' | 'warn' | 'suspend' | 'ban' | 'delete_message';

export const AdminReportsPage: React.FC = () => {
  const { state, adminResolveReport } = useAppState();
  const [filter, setFilter] = useState<'all' | ReportStatus>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Record<string, EnforcementAction>>({});

  const reports = state.reports.filter((r) => filter === 'all' || r.status === filter);

  return (
    <AdminLayout title="Admin - Reports & Moderation">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {(['all', 'open', 'resolved', 'dismissed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-label-sm capitalize ${
                filter === st
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon="verified_user"
            title="No reports in this queue"
            description="All moderation items matching this filter have been processed."
          />
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => {
              const reporter = state.profiles.find((p) => p.id === rep.reporter_user_id);
              const targetUser = rep.target_user_id
                ? state.profiles.find((p) => p.id === rep.target_user_id)
                : null;
              const targetGroup = rep.target_group_conversation_id
                ? state.groups.find((g) => g.conversation_id === rep.target_group_conversation_id)
                : null;
              const selectedAction = actions[rep.id] || 'none';

              return (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-semibold uppercase">
                          {rep.target_type}
                        </span>
                        <h2 className="text-headline-sm text-on-surface">{rep.reason}</h2>
                      </div>
                      <p className="text-caption text-on-surface-variant mt-0.5">
                        Target: {targetUser?.full_name || targetGroup?.name || rep.id} • Reported by{' '}
                        {reporter?.full_name || 'User'}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-label-sm capitalize ${
                        rep.status === 'open'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  {rep.details && (
                    <p className="text-body-sm text-on-surface-variant bg-surface-container-low p-3 rounded-xl">
                      {rep.details}
                    </p>
                  )}

                  {rep.status === 'open' ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={notes[rep.id] || ''}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                          }
                          placeholder="Add moderation resolution note..."
                          aria-label="Resolution note"
                          className="w-full h-10 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
                        />
                        <select
                          aria-label={`Enforcement action for ${rep.id}`}
                          value={selectedAction}
                          onChange={(e) =>
                            setActions((prev) => ({
                              ...prev,
                              [rep.id]: e.target.value as EnforcementAction,
                            }))
                          }
                          className="w-full h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface"
                        >
                          <option value="none">Resolve Only (No penalty)</option>
                          <option value="warn">Issue Official Warning</option>
                          {rep.target_user_id && <option value="suspend">Suspend Target User</option>}
                          {rep.target_user_id && <option value="ban">Ban Target User</option>}
                          {rep.target_message_id && (
                            <option value="delete_message">Delete Reported Message</option>
                          )}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await adminResolveReport(
                              rep.id,
                              'resolved',
                              notes[rep.id] || 'Action taken by moderator',
                              selectedAction
                            );
                          }}
                          className="h-9 px-4 rounded-xl bg-primary text-on-primary text-label-sm font-semibold"
                        >
                          Resolve &amp; Enforce
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            adminResolveReport(
                              rep.id,
                              'dismissed',
                              notes[rep.id] || 'Dismissed after review',
                              'none'
                            )
                          }
                          className="h-9 px-4 rounded-xl bg-surface-container-low text-on-surface text-label-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : (
                    rep.resolution_note && (
                      <p className="text-caption text-primary">
                        Resolution: {rep.resolution_note}
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
