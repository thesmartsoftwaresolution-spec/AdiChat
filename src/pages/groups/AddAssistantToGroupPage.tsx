import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar } from '../../components/ui/Avatar';
import type { AssistantResponseMode } from '../../types/database';

export const AddAssistantToGroupPage: React.FC = () => {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { state, currentUser, syncGroupAssistants } = useAppState();

  const existingMap = new Map(
    state.groupAssistants
      .filter((ga) => ga.group_conversation_id === groupId)
      .map((ga) => [ga.assistant_id, ga])
  );

  const [selections, setSelections] = useState<
    Record<string, { enabled: boolean; responseMode: AssistantResponseMode }>
  >(() => {
    const init: Record<string, { enabled: boolean; responseMode: AssistantResponseMode }> = {};
    for (const a of state.assistants.filter((assistant) => assistant.owner_user_id === currentUser?.id)) {
      const existing = existingMap.get(a.id);
      init[a.id] = {
        enabled: Boolean(existing?.is_enabled),
        responseMode: existing?.response_mode || 'mentioned_only',
      };
    }
    return init;
  });

  const handleSave = async () => {
    const payload = Object.entries(selections).map(([assistantId, cfg]) => ({
      assistantId,
      enabled: cfg.enabled,
      responseMode: cfg.responseMode,
    }));
    const saved = await syncGroupAssistants(groupId, payload);
    if (saved) navigate(`/groups/${groupId}/info`);
  };

  return (
    <MobileStackLayout title="Add Assistant to Group" backTo={`/groups/${groupId}/info`}>
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-5 space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Choose which AI Assistants can participate in this group and how they respond.
        </p>

        <div className="space-y-3">
          {state.assistants
            .filter((a) => a.is_enabled && a.owner_user_id === currentUser?.id)
            .map((a) => {
              const cfg = selections[a.id] || {
                enabled: false,
                responseMode: 'mentioned_only' as AssistantResponseMode,
              };
              return (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-surface-container-lowest shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AssistantAvatar name={a.name} iconName={a.icon_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-headline-sm text-on-surface truncate">{a.name}</p>
                          <AIBadge compact />
                        </div>
                        <p className="text-caption text-on-surface-variant truncate">
                          @{a.handle} • {a.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelections((prev) => ({
                          ...prev,
                          [a.id]: { ...cfg, enabled: !cfg.enabled },
                        }))
                      }
                      className={`px-3.5 py-1.5 rounded-xl text-label-sm font-semibold ${
                        cfg.enabled
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      {cfg.enabled ? 'Added' : 'Add'}
                    </button>
                  </div>

                  {cfg.enabled && (
                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                      <span className="text-caption text-on-surface-variant">Response mode</span>
                      <div className="flex p-0.5 rounded-full bg-surface-container-low">
                        <button
                          type="button"
                          onClick={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [a.id]: { ...cfg, responseMode: 'mentioned_only' },
                            }))
                          }
                          className={`px-3 py-1 rounded-full text-timestamp font-semibold ${
                            cfg.responseMode === 'mentioned_only'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          @Mention only
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [a.id]: { ...cfg, responseMode: 'every_message' },
                            }))
                          }
                          className={`px-3 py-1 rounded-full text-timestamp font-semibold ${
                            cfg.responseMode === 'every_message'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          Every message
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md shadow-md"
        >
          Save Group Assistants
        </button>
      </div>
    </MobileStackLayout>
  );
};
