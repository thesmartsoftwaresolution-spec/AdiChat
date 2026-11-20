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
  const assistant = state.assistants.find((item) => item.id === assistantId);

  const [name, setName] = useState(assistant?.name || '');
  const [role, setRole] = useState(assistant?.role || '');
  const [scenario, setScenario] = useState(assistant?.scenario || '');
  const [behaviour, setBehaviour] = useState(assistant?.behaviour || assistant?.personality || '');
  const [instructions, setInstructions] = useState(assistant?.instructions || '');
  const [tone, setTone] = useState(assistant?.tone || '');
  const [thinkingDefault, setThinkingDefault] = useState(Boolean(assistant?.thinking_enabled_default));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!assistant) {
    return (
      <MobileStackLayout title="AI Assistant Profile" backTo="/assistants">
        <div className="p-6"><EmptyState icon="smart_toy" title="Assistant not found" description="This AI Assistant may have been deleted." /></div>
      </MobileStackLayout>
    );
  }

  const canEdit = assistant.owner_user_id === currentUser?.id || isAdmin;

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Photo must be JPG, PNG or WebP and under 2 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    setAvatarFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || saving) return;
    if (name.trim().length < 2 || role.trim().length < 2 || !instructions.trim()) {
      setError('Name, Role and Custom Instructions are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const saved = await updateAssistant(assistant.id, {
      name: name.trim(),
      role: role.trim(),
      scenario: scenario.trim() || null,
      behaviour: behaviour.trim() || null,
      personality: behaviour.trim() || null,
      instructions: instructions.trim(),
      tone: tone.trim() || 'Helpful',
      thinking_enabled_default: thinkingDefault,
      ...(removePhoto ? { avatar_path: null } : {}),
    }, avatarFile);
    setSaving(false);
    if (saved) {
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemovePhoto(false);
    } else {
      setError('Assistant changes could not be saved. Please retry.');
    }
  };

  return (
    <MobileStackLayout title="AI Assistant Profile & Settings" backTo="/assistants">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-5 sm:py-6 space-y-4">
        <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-xs flex flex-col items-center text-center space-y-3 border border-outline-variant/20">
          <AssistantAvatar name={assistant.name} iconName={assistant.icon_name} src={avatarPreview || (removePhoto ? null : assistant.avatar_url)} size="lg" />
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-headline-lg text-on-surface">{assistant.name}</h2>
              <AIBadge />
            </div>
            <p className="text-body-sm text-primary mt-0.5">@{assistant.handle} · {assistant.language || 'English'}</p>
            {assistant.description && <p className="text-body-sm text-on-surface-variant mt-2 max-w-md">{assistant.description}</p>}
          </div>
          <Link to={`/assistants/${assistant.id}/chat`} className="h-10 px-5 rounded-xl bg-primary text-on-primary text-label-sm inline-flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">chat</span><span>Open AI Chat</span>
          </Link>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-5 rounded-2xl bg-surface-container-low space-y-4">
          <div>
            <h3 className="text-label-md text-on-surface">Assistant configuration</h3>
            <p className="text-caption text-on-surface-variant mt-0.5">Update the assistant's identity, expertise and behaviour.</p>
          </div>
          {error && <div role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{error}</div>}
          <div className="flex items-center gap-3">
            <AssistantAvatar name={name || assistant.name} iconName={assistant.icon_name} src={avatarPreview || (removePhoto ? null : assistant.avatar_url)} size="md" showBadge={false} />
            <div className="flex-1 min-w-0">
              <label className="inline-flex h-9 px-3 rounded-xl bg-surface-container-high text-label-sm items-center gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>Change photo
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} disabled={!canEdit} className="sr-only" />
              </label>
              {(avatarFile || assistant.avatar_url) && canEdit && (
                <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemovePhoto(true); }} className="ml-2 text-caption text-error">Remove</button>
              )}
              <p className="text-timestamp text-on-surface-variant mt-1">JPG, PNG or WebP · Max 2 MB</p>
            </div>
          </div>
          <div>
            <label htmlFor="edit-ai-name" className="block text-label-sm text-on-surface mb-1.5">Name *</label>
            <input id="edit-ai-name" required maxLength={80} disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70" />
          </div>
          <div>
            <label htmlFor="edit-ai-role" className="block text-label-sm text-on-surface mb-1.5">Role / Expertise *</label>
            <input id="edit-ai-role" required maxLength={120} disabled={!canEdit} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Research analyst" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70" />
          </div>
          <div>
            <label htmlFor="edit-ai-scenario" className="block text-label-sm text-on-surface mb-1.5">Scenario</label>
            <textarea id="edit-ai-scenario" rows={3} maxLength={2000} disabled={!canEdit} value={scenario} onChange={(e) => setScenario(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y disabled:opacity-70" />
          </div>
          <div>
            <label htmlFor="edit-ai-behaviour" className="block text-label-sm text-on-surface mb-1.5">Behaviour</label>
            <textarea id="edit-ai-behaviour" rows={3} maxLength={2000} disabled={!canEdit} value={behaviour} onChange={(e) => setBehaviour(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y disabled:opacity-70" />
          </div>
          <div>
            <label htmlFor="edit-ai-inst" className="block text-label-sm text-on-surface mb-1.5">Custom Instructions *</label>
            <textarea id="edit-ai-inst" rows={5} maxLength={12000} required disabled={!canEdit} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y disabled:opacity-70" />
          </div>
          <div>
            <label htmlFor="edit-ai-tone" className="block text-label-sm text-on-surface mb-1.5">Response Tone</label>
            <input id="edit-ai-tone" type="text" disabled={!canEdit} value={tone} onChange={(e) => setTone(e.target.value)} className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface disabled:opacity-70" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div><p className="text-body-sm font-semibold text-on-surface">High Thinking Mode Default</p><p className="text-caption text-on-surface-variant">Cloudflare Workers AI · GPT-OSS 20B</p></div>
            <ToggleSwitch checked={thinkingDefault} disabled={!canEdit} onChange={setThinkingDefault} label="Toggle High Thinking Mode default" />
          </div>
          {canEdit && (
            <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
              <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-on-primary text-label-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 px-4 rounded-xl bg-error-container text-on-error-container text-label-sm">Delete</button>
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${assistant.name}?`}
        description="This removes the assistant from your hub and any groups where it is assigned."
        confirmLabel="Delete Assistant"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { deleteAssistant(assistant.id); navigate('/assistants'); }}
      />
    </MobileStackLayout>
  );
};
