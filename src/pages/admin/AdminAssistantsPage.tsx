import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, ToggleSwitch } from '../../components/ui/Feedback';

export const AdminAssistantsPage: React.FC = () => {
  const { state, adminToggleAssistant, adminDeleteAssistant } = useAppState();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <AdminLayout title="Admin - AI Assistants">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-secondary-container/40 flex items-center justify-between gap-3">
          <div>
            <p className="text-label-md text-on-surface">
              Platform AI Runtime Boundary
            </p>
            <p className="text-caption text-on-surface-variant">
              Server Thinking Mode: <strong>gemini-4-hydrogen (HIGH)</strong> • Cloudflare Workers AI
              model: <strong>Pending owner selection</strong>
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="h-9 px-3 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold inline-flex items-center shrink-0"
          >
            Quotas &amp; Config
          </Link>
        </div>

        <div className="space-y-2.5">
          {state.assistants.map((a) => {
            const owner = state.profiles.find((p) => p.id === a.owner_user_id);
            const usageCount = state.assistantUsage.filter((u) => u.assistant_id === a.id).length;

            return (
              <div
                key={a.id}
                className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AssistantAvatar name={a.name} iconName={a.icon_name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-headline-sm text-on-surface truncate">{a.name}</span>
                      <AIBadge compact />
                    </div>
                    <p className="text-caption text-on-surface-variant truncate">
                      Owner: {owner?.full_name || 'System'} • @{a.handle} •{' '}
                      <strong>{usageCount}</strong> prompt{usageCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    to={`/assistants/${a.id}`}
                    className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface text-label-sm inline-flex items-center"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${a.name}`}
                    onClick={() => setConfirmDeleteId(a.id)}
                    className="h-9 px-3 rounded-xl bg-error-container text-on-error-container text-label-sm font-semibold"
                  >
                    Delete
                  </button>
                  <ToggleSwitch
                    checked={a.is_enabled}
                    onChange={(enabled) => adminToggleAssistant(a.id, enabled)}
                    label={`Enable ${a.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete AI Assistant?"
        description="This removes the assistant and unbinds it from any groups. The action is recorded in the audit log."
        confirmLabel="Delete Assistant"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) adminDeleteAssistant(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </AdminLayout>
  );
};
