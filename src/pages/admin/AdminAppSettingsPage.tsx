import React, { useEffect, useState } from 'react';
import { useAppState } from '../../app/providers/AppStateProvider';
import { AdminLayout } from '../../components/layout/AppShells';
import { ToggleSwitch } from '../../components/ui/Feedback';

export const AdminAppSettingsPage: React.FC = () => {
  const { state, adminUpdateAppSetting, pushToast, resetDemoWorkspace } = useAppState();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const booleanKeys = [
    'allow_signups',
    'email_verification_required',
    'feature_groups_enabled',
    'feature_voice_notes_enabled',
    'feature_ai_enabled',
    'feature_reactions_enabled',
    'maintenance_mode',
  ];

  const numericKeys = new Set([
    'ai_daily_message_limit',
    'ai_max_assistants_per_user',
    'max_file_size_bytes',
    'voice_note_max_length_seconds',
    'group_size_limit',
  ]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const s of state.appSettings) {
      if (!booleanKeys.includes(s.key)) {
        initial[s.key] = String(s.value ?? '');
      }
    }
    setDrafts(initial);
  }, [state.appSettings]);

  const getSetting = (key: string) => state.appSettings.find((s) => s.key === key);

  const handleSaveSetting = async (key: string) => {
    const raw = (drafts[key] ?? '').trim();
    if (numericKeys.has(key)) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        pushToast(`Please enter a valid positive number for ${key}`, 'error');
        return;
      }
      await adminUpdateAppSetting(key, Math.floor(parsed));
    } else {
      if (!raw) {
        pushToast(`${key} cannot be empty`, 'error');
        return;
      }
      await adminUpdateAppSetting(key, raw);
    }
  };

  return (
    <AdminLayout title="Admin - App Settings">
      <div className="max-w-3xl space-y-5">
        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs divide-y divide-outline-variant/15">
          {booleanKeys.map((key) => {
            const s = getSetting(key);
            if (!s) return null;
            const checked = Boolean(s.value);
            return (
              <div key={key} className="flex items-center justify-between py-3.5 gap-4">
                <div>
                  <p className="text-body-md-medium text-on-surface capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-caption text-on-surface-variant">{s.description}</p>
                </div>
                <ToggleSwitch
                  checked={checked}
                  onChange={(v) => {
                    adminUpdateAppSetting(key, v);
                    pushToast(`Updated ${key}`, 'success');
                  }}
                  label={key}
                />
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-4">
          <h2 className="text-headline-sm text-on-surface">Limits, Copy &amp; AI Configuration</h2>
          {state.appSettings
            .filter((s) => !booleanKeys.includes(s.key))
            .map((s) => {
              const isModelBinding = s.key === 'ai_model_id';
              const isNumeric = numericKeys.has(s.key);
              const val = drafts[s.key] ?? String(s.value ?? '');

              return (
                <div
                  key={s.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 border-b border-outline-variant/15 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md-medium text-on-surface font-mono text-[13px]">
                      {s.key}
                    </p>
                    <p className="text-caption text-on-surface-variant">{s.description}</p>
                  </div>

                  {isModelBinding ? (
                    <span className="px-3 py-1.5 rounded-xl bg-surface-container-low text-caption font-mono text-primary self-start sm:self-center shrink-0">
                      @cf/openai/gpt-oss-20b · managed by Cloudflare
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type={isNumeric ? 'number' : 'text'}
                        value={val}
                        min={isNumeric ? 1 : undefined}
                        aria-label={`Setting ${s.key}`}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [s.key]: e.target.value }))
                        }
                        className={`${
                          isNumeric ? 'w-32 text-right font-mono' : 'w-48 sm:w-56'
                        } h-9 px-3 rounded-xl bg-surface-container-low text-body-sm text-on-surface outline-none`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSetting(s.key)}
                        className="h-9 px-3 rounded-xl bg-primary text-on-primary text-label-sm font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3">
          <div>
            <p className="text-label-md text-on-surface">Reset Local Demo Seed</p>
            <p className="text-caption text-on-surface-variant">
              Restore default sample chats, users, groups, and audit logs.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemoWorkspace}
            className="h-10 px-4 rounded-xl bg-surface-container-lowest text-primary text-label-sm font-semibold shadow-xs"
          >
            Reset Workspace
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
