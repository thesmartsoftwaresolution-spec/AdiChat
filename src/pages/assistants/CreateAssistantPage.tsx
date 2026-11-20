import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { ToggleSwitch } from '../../components/ui/Feedback';
import { validateAssistantInput } from '../../utils/validators';

const TONES = [
  { value: 'Friendly', icon: 'sentiment_satisfied', label: 'Friendly' },
  { value: 'Professional', icon: 'business_center', label: 'Professional' },
  { value: 'Funny', icon: 'mood', label: 'Funny' },
  { value: 'Concise', icon: 'bolt', label: 'Concise' },
];

export const CreateAssistantPage: React.FC = () => {
  const { createAssistant } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [scenario, setScenario] = useState('');
  const [behaviour, setBehaviour] = useState('Friendly, clear, practical and proactive.');
  const [instructions, setInstructions] = useState('');
  const [tone, setTone] = useState('Friendly');
  const [language, setLanguage] = useState('English');
  const [starterPrompts, setStarterPrompts] = useState([
    'Explain this concept in simple terms',
    'Quiz me on my notes',
    'Summarize this technical article',
  ]);
  const [newStarter, setNewStarter] = useState('');
  const [thinkingDefault, setThinkingDefault] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be JPG, PNG or WebP and under 2 MB.');
      event.target.value = '';
      return;
    }
    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addStarter = () => {
    const value = newStarter.trim();
    if (!value || starterPrompts.length >= 3) return;
    setStarterPrompts((current) => [...current, value]);
    setNewStarter('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateAssistantInput({ name, instructions });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (role.trim().length < 2) {
      setError('Please add the assistant role or expertise.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createAssistant({
        name,
        description,
        role,
        scenario,
        behaviour,
        personality: behaviour,
        instructions,
        tone,
        language,
        avatarFile,
        starter_prompts: starterPrompts,
        thinking_enabled_default: thinkingDefault,
      });
      if (created) navigate(`/assistants/${created.id}/chat`);
      else setError('Could not save the assistant. Check your connection and try again.');
    } catch {
      setError('Could not save the assistant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileStackLayout title="Create AI Assistant" backTo="/assistants">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto w-full px-margin-mobile pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
          <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-title-md text-on-surface">Craft Custom AI</h2>
            <p className="text-caption text-on-surface-variant">Configure persona, intelligence instructions and behaviour.</p>
          </div>
        </div>

        <section className="flex flex-col items-center py-2">
          <div className="relative w-28 h-28 rounded-full border-2 border-primary p-1 bg-surface-container-low shadow-sm">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Assistant avatar preview" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">smart_toy</span>
              </div>
            )}
            <span className="absolute -bottom-1 right-0 w-8 h-8 rounded-full bg-primary text-on-primary border-2 border-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            </span>
          </div>
          <label className="mt-3 h-9 px-4 rounded-full bg-surface-container-high text-on-surface text-label-sm inline-flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[15px]">image</span>
            {avatarFile ? 'Change Avatar' : 'Choose Avatar'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="sr-only" />
          </label>
          <p className="mt-1 text-timestamp text-on-surface-variant">JPG, PNG or WebP · Max 2 MB</p>
        </section>

        {error && <div role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{error}</div>}

        <section className="space-y-3">
          <div>
            <label htmlFor="ai-name" className="block text-label-sm text-on-surface mb-1.5">Assistant Name <span className="text-primary">Required</span></label>
            <input id="ai-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Study Buddy AI" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface" />
          </div>
          <div>
            <label htmlFor="ai-description" className="block text-label-sm text-on-surface mb-1.5">Short Description</label>
            <p className="text-timestamp text-on-surface-variant mb-1">Shown in contact list and group roster</p>
            <input id="ai-description" maxLength={240} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this assistant specialize in?" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface" />
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-surface-container-low space-y-3">
          <h3 className="text-label-md text-on-surface">Role &amp; Scenario</h3>
          <div>
            <label htmlFor="ai-role" className="block text-label-sm text-on-surface mb-1.5">Role / Expertise *</label>
            <input id="ai-role" required maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Academic study partner, software architect..." className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface" />
          </div>
          <div>
            <label htmlFor="ai-scenario" className="block text-label-sm text-on-surface mb-1.5">Scenario</label>
            <textarea id="ai-scenario" rows={3} maxLength={2000} value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="When should this assistant help, and what context should it understand?" className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" />
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-surface-container-low space-y-3">
          <div>
            <label htmlFor="ai-behaviour" className="block text-label-md text-on-surface mb-1.5">Behaviour</label>
            <textarea id="ai-behaviour" rows={3} maxLength={2000} value={behaviour} onChange={(e) => setBehaviour(e.target.value)} placeholder="How should it think, reply and guide the user?" className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="ai-instructions" className="text-label-md text-on-surface">Custom Instructions *</label>
              <span className="text-timestamp text-on-surface-variant tabular-nums">{instructions.length} / 12,000</span>
            </div>
            <p className="text-timestamp text-on-surface-variant mb-1">Define how this assistant should reason, reply and behave.</p>
            <textarea id="ai-instructions" required rows={5} maxLength={12000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="You are an encouraging assistant. Break down complex topics into clear steps..." className="w-full p-3.5 rounded-xl bg-surface-container-lowest outline-none text-body-md text-on-surface resize-y" />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-label-md text-on-surface">Response Tone</h3>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((item) => (
              <button key={item.value} type="button" onClick={() => setTone(item.value)} aria-pressed={tone === item.value} className={`h-10 px-3 rounded-xl inline-flex items-center gap-2 text-label-sm transition-colors ${tone === item.value ? 'bg-primary-container text-on-primary-container ring-1 ring-primary/20' : 'bg-surface-container-low text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                <span>{item.label}</span>
                {tone === item.value && <span className="material-symbols-outlined text-[15px] ml-auto">check</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <label htmlFor="ai-language" className="block text-label-md text-on-surface">Primary Communication Language</label>
          <select id="ai-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface">
            <option value="English">English (Default)</option>
            <option value="Urdu">Urdu</option>
            <option value="English & Urdu">English &amp; Urdu</option>
            <option value="Arabic">Arabic</option>
            <option value="Spanish">Spanish</option>
          </select>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-label-md text-on-surface">Starter Prompts <span className="text-outline font-normal">(Up to 3)</span></h3>
            <span className="text-timestamp text-on-surface-variant">{starterPrompts.length}/3</span>
          </div>
          <div className="space-y-2">
            {starterPrompts.map((prompt, index) => (
              <div key={`${index}-${prompt}`} className="min-h-10 px-3 rounded-xl bg-surface-container-low flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-primary">chat_bubble_outline</span>
                <span className="flex-1 min-w-0 text-body-sm text-on-surface py-2 break-words">{prompt}</span>
                <button type="button" onClick={() => setStarterPrompts((items) => items.filter((_, i) => i !== index))} aria-label="Remove starter prompt" className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            ))}
          </div>
          {starterPrompts.length < 3 && (
            <div className="flex gap-2">
              <input value={newStarter} onChange={(e) => setNewStarter(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStarter(); } }} placeholder="Add a starter prompt" className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface" />
              <button type="button" onClick={addStarter} disabled={!newStarter.trim()} className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center disabled:opacity-40" aria-label="Add starter prompt">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          )}
        </section>

        <section className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-on-surface">High Thinking Mode Default</p>
            <p className="text-timestamp text-on-surface-variant">Cloudflare Workers AI · GPT-OSS 20B</p>
          </div>
          <ToggleSwitch checked={thinkingDefault} onChange={setThinkingDefault} label="Enable High Thinking Mode by default" />
        </section>

        <section className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-label-md text-on-surface">Live Chat Preview</h3>
            <span className="text-timestamp text-primary inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Preview</span>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary-container flex items-center justify-center">
                {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[16px]">smart_toy</span>}
              </div>
              <div className="min-w-0"><p className="text-label-sm text-on-surface truncate">{name.trim() || 'Your Assistant'}</p><p className="text-timestamp text-on-surface-variant truncate">{description || role || 'Your custom AI assistant'}</p></div>
            </div>
            <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-container text-on-primary-container px-3 py-2 text-body-sm">Can you help me understand this topic?</div></div>
            <div className="flex gap-2 items-start"><div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[14px]">smart_toy</span></div><div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-container-highest px-3 py-2 text-body-sm text-on-surface">{behaviour.trim() ? 'I’ll follow the behaviour and custom instructions you define, and tailor the answer to your scenario.' : 'I’m ready to help with clear, practical guidance.'}</div></div>
          </div>
        </section>

        <button type="submit" disabled={saving} className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
          <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'smart_toy'}</span>
          <span>{saving ? 'Creating assistant…' : 'Create Assistant'}</span>
        </button>
        <Link to="/assistants" className="w-full h-11 rounded-xl bg-surface-container-low text-on-surface text-label-sm flex items-center justify-center">Cancel</Link>
      </form>
    </MobileStackLayout>
  );
};
