import React, { useMemo, useState } from 'react';
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

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(assistant?.name || '');
  const [role, setRole] = useState(assistant?.role || '');
  const [scenario, setScenario] = useState(assistant?.scenario || '');
  const [behaviour, setBehaviour] = useState(assistant?.behaviour || assistant?.personality || '');
  const [instructions, setInstructions] = useState(assistant?.instructions || '');
  const [customRules, setCustomRules] = useState(assistant?.custom_rules || '');
  const [savingRules, setSavingRules] = useState(false);
  const [tone, setTone] = useState(assistant?.tone || 'Friendly');
  const [language, setLanguage] = useState(assistant?.language || 'English');
  const [thinkingDefault, setThinkingDefault] = useState(Boolean(assistant?.thinking_enabled_default));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const activeGroups = useMemo(() => {
    if (!assistant) return [];
    const assignedIds = new Set(state.groupAssistants
      .filter((item) => item.assistant_id === assistant.id && item.is_enabled)
      .map((item) => item.group_conversation_id));
    return state.groups.filter((group) => assignedIds.has(group.conversation_id));
  }, [assistant, state.groupAssistants, state.groups]);

  const weeklyUsage = useMemo(() => {
    if (!assistant) return [];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return state.assistantUsage.filter((item) =>
      item.assistant_id === assistant.id &&
      item.request_status === 'success' &&
      new Date(item.created_at).getTime() >= since
    );
  }, [assistant, state.assistantUsage]);

  if (!assistant) {
    return (
      <MobileStackLayout title="Assistant Profile" backTo="/assistants">
        <div className="p-6"><EmptyState icon="smart_toy" title="Assistant not found" description="This AI Assistant may have been deleted." /></div>
      </MobileStackLayout>
    );
  }

  const canEdit = assistant.owner_user_id === currentUser?.id || isAdmin;
  const avgLatency = weeklyUsage.length
    ? weeklyUsage.reduce((sum, item) => sum + (item.latency_ms || 0), 0) / weeklyUsage.length / 1000
    : 0;
  const totalTokens = weeklyUsage.reduce((sum, item) => sum + (item.input_units || 0) + (item.output_units || 0), 0);

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

  const handleEdit = () => {
    setName(assistant.name);
    setRole(assistant.role || '');
    setScenario(assistant.scenario || '');
    setBehaviour(assistant.behaviour || assistant.personality || '');
    setInstructions(assistant.instructions || '');
    setCustomRules(assistant.custom_rules || '');
    setTone(assistant.tone || 'Friendly');
    setLanguage(assistant.language || 'English');
    setThinkingDefault(Boolean(assistant.thinking_enabled_default));
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemovePhoto(false);
    setError(null);
    setEditing(true);
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
      custom_rules: customRules.trim() || null,
      tone,
      language,
      thinking_enabled_default: thinkingDefault,
      ...(removePhoto ? { avatar_path: null } : {}),
    }, avatarFile);
    setSaving(false);
    if (saved) {
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemovePhoto(false);
    } else {
      setError('Assistant changes could not be saved. Please try again.');
    }
  };

  const handleSaveRules = async () => {
    if (!canEdit || savingRules || customRules.length > 12000) return;
    setSavingRules(true);
    setError(null);
    const saved = await updateAssistant(assistant.id, { custom_rules: customRules.trim() || null });
    setSavingRules(false);
    if (!saved) setError('Custom Rules could not be saved. Please try again.');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/assistants/${assistant.id}`);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setError('Could not copy the assistant link in this browser.');
    }
  };

  return (
    <MobileStackLayout title="Assistant Profile" backTo="/assistants">
      <div className="max-w-2xl mx-auto w-full px-margin-mobile py-5 sm:py-6 space-y-4">
        <section className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center text-center gap-3">
          <div className="relative w-24 h-24 rounded-full border-2 border-primary p-1 bg-surface-container-low">
            {avatarPreview || (!removePhoto && assistant.avatar_url) ? (
              <img src={avatarPreview || assistant.avatar_url || ''} alt={assistant.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">smart_toy</span>
              </div>
            )}
            <span className="absolute -bottom-1 right-0"><AIBadge compact /></span>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h2 className="text-headline-md text-on-surface">{assistant.name}</h2>
              <AIBadge />
            </div>
            <p className="text-caption text-primary mt-1">@{assistant.handle} · Cloudflare Workers AI</p>
            <p className="text-body-sm text-on-surface-variant mt-1">Created by {currentUser?.full_name || 'you'} · GPT-OSS 20B</p>
            {assistant.description && <p className="text-body-sm text-on-surface-variant mt-2 max-w-md">{assistant.description}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 w-full pt-1">
            <Link to={`/assistants/${assistant.id}/chat`} className="h-11 rounded-xl bg-primary text-on-primary text-label-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">chat</span>Chat
            </Link>
            <button type="button" onClick={() => void handleShare()} className="h-11 rounded-xl bg-surface-container-low text-on-surface text-label-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">{shareCopied ? 'check' : 'share'}</span>{shareCopied ? 'Copied' : 'Share'}
            </button>
            {canEdit ? (
              <button type="button" onClick={handleEdit} className="h-11 rounded-xl bg-surface-container-low text-on-surface text-label-sm flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">edit</span>Edit
              </button>
            ) : <span className="h-11 rounded-xl bg-surface-container-low text-on-surface-variant text-label-sm flex items-center justify-center">View only</span>}
          </div>
        </section>

        {editing && (
          <form onSubmit={handleSave} className="p-4 sm:p-5 rounded-2xl bg-surface-container-low space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-label-md text-on-surface">Edit Assistant</h3>
              <button type="button" onClick={() => { setEditing(false); setError(null); }} className="text-caption text-primary">Cancel edit</button>
            </div>
            {error && <div role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{error}</div>}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary-container flex items-center justify-center shrink-0">
                {avatarPreview || (!removePhoto && assistant.avatar_url) ? <img src={avatarPreview || assistant.avatar_url || ''} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[20px]">smart_toy</span>}
              </div>
              <div className="min-w-0">
                <label className="h-9 px-3 rounded-xl bg-surface-container-high text-label-sm inline-flex items-center gap-1.5 cursor-pointer">
                  <span className="material-symbols-outlined text-[15px]">photo_camera</span>Change Photo
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="sr-only" />
                </label>
                {(avatarFile || assistant.avatar_url) && <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemovePhoto(true); }} className="ml-2 text-caption text-error">Remove</button>}
                <p className="text-timestamp text-on-surface-variant mt-1">JPG, PNG or WebP · Max 2 MB</p>
              </div>
            </div>
            <div><label htmlFor="edit-ai-name" className="block text-label-sm text-on-surface mb-1.5">Name *</label><input id="edit-ai-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface" /></div>
            <div><label htmlFor="edit-ai-role" className="block text-label-sm text-on-surface mb-1.5">Role / Expertise *</label><input id="edit-ai-role" required maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface" /></div>
            <div><label htmlFor="edit-ai-scenario" className="block text-label-sm text-on-surface mb-1.5">Scenario</label><textarea id="edit-ai-scenario" rows={3} maxLength={2000} value={scenario} onChange={(e) => setScenario(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" /></div>
            <div><label htmlFor="edit-ai-behaviour" className="block text-label-sm text-on-surface mb-1.5">Behaviour</label><textarea id="edit-ai-behaviour" rows={3} maxLength={2000} value={behaviour} onChange={(e) => setBehaviour(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" /></div>
            <div><label htmlFor="edit-ai-instructions" className="block text-label-sm text-on-surface mb-1.5">Custom Instructions *</label><textarea id="edit-ai-instructions" required rows={5} maxLength={12000} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" /></div>
            <section className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/15 space-y-2">
              <div className="flex items-center justify-between gap-2"><label htmlFor="edit-ai-custom-rules" className="text-label-sm font-semibold text-on-surface">Custom Rules</label><span className="text-timestamp text-on-surface-variant tabular-nums">{customRules.length} / 12,000</span></div>
              <p className="text-timestamp text-on-surface-variant">Apne assistant ke behavior, response preferences aur content rules yahan likhein. Blank karke Save Rules dabane se rules clear ho jayenge.</p>
              <textarea id="edit-ai-custom-rules" rows={5} maxLength={12000} value={customRules} onChange={(e) => setCustomRules(e.target.value)} placeholder="Misal: Har jawab tafseeli Roman Urdu mein do. Mere diye hue role aur scenario ke mutabiq jawab do..." className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-y" />
              <button type="button" onClick={() => void handleSaveRules()} disabled={savingRules || !canEdit || customRules.length > 12000} className="w-full h-10 rounded-xl bg-secondary-container text-on-secondary-container text-label-sm font-semibold disabled:opacity-60">{savingRules ? 'Saving Rules…' : 'Save Rules'}</button>
            </section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label htmlFor="edit-ai-tone" className="block text-label-sm text-on-surface mb-1.5">Response Tone</label><input id="edit-ai-tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-surface-container-lowest outline-none text-body-sm text-on-surface" /></div>
              <div><label htmlFor="edit-ai-language" className="block text-label-sm text-on-surface mb-1.5">Language</label><input id="edit-ai-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-surface-container-lowest outline-none text-body-sm text-on-surface" /></div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-body-sm font-semibold text-on-surface">High Thinking Mode Default</p><p className="text-timestamp text-on-surface-variant">GPT-OSS 20B</p></div>
              <ToggleSwitch checked={thinkingDefault} onChange={setThinkingDefault} label="High Thinking Mode default" />
            </div>
            <button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-primary text-on-primary text-label-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        )}

        <section className="p-4 rounded-2xl bg-surface-container-low space-y-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-title-sm text-on-surface">Configuration</h3><span className="material-symbols-outlined text-[18px] text-primary">psychology</span></div>
          {[
            ['Role', assistant.role || 'Not configured'],
            ['Scenario', assistant.scenario || 'Not configured'],
            ['Behaviour', assistant.behaviour || assistant.personality || 'Not configured'],
            ['Response tone', assistant.tone || 'Helpful'],
            ['Languages', assistant.language || 'English'],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 rounded-xl bg-surface-container-lowest px-3 py-2.5">
              <span className="text-caption text-on-surface-variant">{label}</span>
              <span className="text-body-sm text-on-surface text-right break-words">{value}</span>
            </div>
          ))}
          <div className="p-3 rounded-xl bg-surface-container-lowest">
            <div className="flex items-center justify-between gap-2 mb-1"><p className="text-timestamp font-semibold text-on-surface-variant">CUSTOM INSTRUCTIONS</p>{canEdit && <button type="button" onClick={handleEdit} className="text-caption text-primary">Edit Prompt</button>}</div>
            <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap line-clamp-4">{assistant.instructions}</p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-title-sm text-on-surface">Active in Conversations ({activeGroups.length + 1})</h3><span className="w-2 h-2 rounded-full bg-primary" /></div>
          <Link to={`/assistants/${assistant.id}/chat`} className="p-4 rounded-2xl bg-surface-container-low flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">person</span></div>
            <div className="min-w-0 flex-1"><p className="text-body-md-medium text-on-surface">Personal AI Chat</p><p className="text-caption text-primary">1-to-1 · Always active</p></div><span className="w-2 h-2 rounded-full bg-primary" />
          </Link>
          {activeGroups.map((group) => (
            <Link key={group.conversation_id} to={`/groups/${group.conversation_id}`} className="p-4 rounded-2xl bg-surface-container-low flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">groups</span></div>
              <div className="min-w-0 flex-1"><p className="text-body-md-medium text-on-surface truncate">{group.name}</p><p className="text-caption text-on-surface-variant">Group · AI assistant enabled</p></div><span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
            </Link>
          ))}
          {!activeGroups.length && <p className="text-caption text-on-surface-variant px-2">This assistant has not been added to a group yet.</p>}
        </section>

        <section className="p-4 rounded-2xl bg-surface-container-low space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-title-sm text-on-surface">Weekly Analytics</h3><span className="material-symbols-outlined text-[18px] text-on-surface-variant">monitoring</span></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-surface-container-lowest text-center"><p className="text-title-md text-on-surface tabular-nums">{weeklyUsage.length}</p><p className="text-timestamp text-on-surface-variant">Messages</p></div>
            <div className="p-3 rounded-xl bg-surface-container-lowest text-center"><p className="text-title-md text-primary tabular-nums">{avgLatency ? `${avgLatency.toFixed(1)}s` : '—'}</p><p className="text-timestamp text-on-surface-variant">Avg speed</p></div>
            <div className="p-3 rounded-xl bg-surface-container-lowest text-center"><p className="text-title-md text-on-surface tabular-nums">{totalTokens.toLocaleString()}</p><p className="text-timestamp text-on-surface-variant">Tokens</p></div>
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-error-container/40 border border-error/10 space-y-2">
          <div className="flex items-center gap-2 text-error"><span className="material-symbols-outlined text-[18px]">warning</span><h3 className="text-label-md">Danger Zone</h3></div>
          <p className="text-body-sm font-semibold text-error">Delete Assistant</p>
          <p className="text-caption text-on-surface-variant">Permanent deletion can affect associated history and analytics.</p>
          <button type="button" disabled={!import.meta.env.DEV || !canEdit} onClick={() => setConfirmDelete(true)} title={!import.meta.env.DEV ? 'Permanent deletion is disabled in production.' : undefined} className="w-full h-11 rounded-xl bg-error text-on-error text-label-sm font-semibold disabled:opacity-40">
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">delete</span>Delete Assistant
          </button>
          {!import.meta.env.DEV && <p className="text-timestamp text-on-surface-variant">Production deletion is disabled to protect conversation history.</p>}
        </section>
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
