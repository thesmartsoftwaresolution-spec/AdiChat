import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { AIBadge, AssistantAvatar } from '../../components/ui/Avatar';
import { ConfirmDialog, EmptyState, ToggleSwitch } from '../../components/ui/Feedback';

export const AssistantProfilePage: React.FC = () => {
  const { assistantId = '' } = useParams();
  const navigate = useNavigate();
  const { state, currentUser, isAdmin, updateAssistant, deleteAssistant } = useAppState();

  const assistant = state.assistants.find((a) => a.id === assistantId);
  const [name, setName] = useState(assistant?.name || '');
  const [instructions, setInstructions] = useState(assistant?.instructions || '');
  const [tone, setTone] = useState(assistant?.tone || '');
  const [thinkingDefault, setThinkingDefault] = useState(
    Boolean(assistant?.thinking_enabled_default)
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!assistant) {
    return (
      <MobileStackLayout title="AI Assistant Profile" backTo="/assistants">
        <div className="p-6">
          <EmptyState
            icon="smart_toy"
            title="Assistant not found"
            description="This AI Assistant may have been deleted."
          />
        </div>
      </MobileStackLayout>
    );
  }

  const canEdit = assistant.owner_user_id === currentUser?.id || isAdmin;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAssistant(assistant.id, {
      name: name.trim() || assistant.name,
      instructions: instructions.trim() || assistant.instructions,
      tone: tone.trim() || assistant.tone,
      thinking_enabled_default: thinkingDefault,
    });
  };

  return (
    <MobileStackLayout title="AI Assistant Profile & Settings" backTo="/assistants">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-6 space-y-5">
        <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col items-center text-center space-y-3">
          <AssistantAvatar name={assistant.name} iconName={assistant.icon_name} size="lg" />
          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-headline-lg text-on-surface">{assistant.name}</h2>
              <AIBadge />
            </div>
            <p className="text-body-sm text-primary mt-0.5">
              @{assistant.handle} • {assistant.language || 'English'}
            </p>
            {assistant.description && (
              <p className="text-body-sm text-on-surface-variant mt-2 max-w-md">
                {assistant.description}
              </p>
            )}
          </div>

          <Link
            to={`/assistants/${assistant.id}/chat`}
            className="h-11 px-6 rounded-xl bg-primary text-on-primary text-label-md inline-flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>Open AI Chat</span>
          </Link>
        </div>

        <form onSubmit={handleSave} className="p-5 rounded-2xl bg-surface-container-low space-y-4">
          <h3 className="text-headline-sm text-on-surface">Behavior &amp; Instructions</h3>
          <div>
            <label htmlFor="edit-ai-name" className="block text-label-md text-on-surface mb-1">
              Display Name
            </label>
            <input
              id="edit-ai-name"
              type="text"
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70"
            />
          </div>

          <div>
            <label htmlFor="edit-ai-tone" className="block text-label-md text-on-surface mb-1">
              Tone
            </label>
            <input
              id="edit-ai-tone"
              type="text"
              disabled={!canEdit}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70"
            />
          </div>

          <div>
            <label htmlFor="edit-ai-inst" className="block text-label-md text-on-surface mb-1">
              System Instructions
            </label>
            <textarea
              id="edit-ai-inst"
              rows={4}
              disabled={!canEdit}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-body-md-medium text-on-surface">High Thinking Mode Default</p>
              <p className="text-caption text-on-surface-variant">
                Deep reasoning via Gemini 4 Hydrogen (ThinkingLevel.HIGH)
              </p>
            </div>
            <ToggleSwitch
              checked={thinkingDefault}
              disabled={!canEdit}
              onChange={setThinkingDefault}
              label="Toggle High Thinking Mode default"
            />
          </div>

          {canEdit && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary text-label-md"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="h-11 px-4 rounded-xl bg-error-container text-on-error-container text-label-md"
              >
                Delete
              </button>
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${assistant.name}?`}
        description="This will remove the assistant from your hub and any groups where it is assigned."
        confirmLabel="Delete Assistant"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteAssistant(assistant.id);
          navigate('/assistants');
        }}
      />
    </MobileStackLayout>
  );
};
