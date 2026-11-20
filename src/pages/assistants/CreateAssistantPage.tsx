import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../app/providers/AppStateProvider';
import { MobileStackLayout } from '../../components/layout/AppShells';
import { ToggleSwitch } from '../../components/ui/Feedback';
import { validateAssistantInput } from '../../utils/validators';

export const CreateAssistantPage: React.FC = () => {
  const { createAssistant } = useAppState();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [scenario, setScenario] = useState('');
  const [behaviour, setBehaviour] = useState('Helpful, clear, thoughtful and proactive');
  const [instructions, setInstructions] = useState('');
  const [tone, setTone] = useState('Analytical');
  const [language, setLanguage] = useState('English');
  const [starterText, setStarterText] = useState(
    'Summarize the key tradeoffs\nGenerate a step-by-step plan'
  );
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateAssistantInput({ name, instructions });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (role.trim().length < 2) {
      setError('Please describe the assistant role or expertise.');
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
        starter_prompts: starterText.split('\n').map((line) => line.trim()).filter(Boolean),
        thinking_enabled_default: thinkingDefault,
      });
      if (created) {
        navigate(`/assistants/${created.id}/chat`);
      } else {
        setError('Could not save the assistant. Check your connection and try again.');
      }
    } catch {
      setError('Could not save the assistant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileStackLayout title="Create AI Assistant" backTo="/assistants">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full px-margin-mobile py-5 sm:py-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Assistant profile preview" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-headline-sm text-on-surface">Build your AI Assistant</h2>
            <p className="text-caption text-on-surface-variant">Set its expertise, purpose and response behaviour.</p>
          </div>
          <label className="shrink-0 h-9 px-3 rounded-xl bg-surface-container-high text-on-surface text-label-sm inline-flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            Photo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} className="sr-only" />
          </label>
        </div>

        {error && <div role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{error}</div>}

        <section className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-3.5">
          <div>
            <h3 className="text-label-md text-on-surface">Identity</h3>
            <p className="text-caption text-on-surface-variant mt-0.5">Give your assistant a name and profile.</p>
          </div>
          <div>
            <label htmlFor="ai-name" className="block text-label-sm text-on-surface mb-1.5">Name *</label>
            <input id="ai-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Architecture Copilot" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface" />
          </div>
          <div>
            <label htmlFor="ai-description" className="block text-label-sm text-on-surface mb-1.5">Short description <span className="text-outline">(optional)</span></label>
            <input id="ai-description" maxLength={240} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short introduction shown in your assistant hub" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface" />
          </div>
        </section>

        <section className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-3.5">
          <div>
            <h3 className="text-label-md text-on-surface">Role &amp; Scenario</h3>
            <p className="text-caption text-on-surface-variant mt-0.5">Define what it knows and when it should help.</p>
          </div>
          <div>
            <label htmlFor="ai-role" className="block text-label-sm text-on-surface mb-1.5">Role / Expertise *</label>
            <input id="ai-role" required maxLength={120} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior full-stack software architect" className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface" />
          </div>
          <div>
            <label htmlFor="ai-scenario" className="block text-label-sm text-on-surface mb-1.5">Scenario</label>
            <textarea id="ai-scenario" rows={3} maxLength={2000} value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Describe the situations, users and tasks this assistant is designed for..." className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-y" />
          </div>
        </section>

        <section className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 space-y-3.5">
          <div>
            <h3 className="text-label-md text-on-surface">Behaviour &amp; Custom Instructions</h3>
            <p className="text-caption text-on-surface-variant mt-0.5">Control how it communicates, reasons and formats answers.</p>
          </div>
          <div>
            <label htmlFor="ai-behaviour" className="block text-label-sm text-on-surface mb-1.5">Behaviour</label>
            <textarea id="ai-behaviour" rows={3} maxLength={2000} value={behaviour} onChange={(e) => setBehaviour(e.target.value)} placeholder="e.g. Ask clarifying questions, explain trade-offs, and provide practical steps..." className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-y" />
          </div>
          <div>
            <label htmlFor="ai-instructions" className="block text-label-sm text-on-surface mb-1.5">Custom Instructions *</label>
            <textarea id="ai-instructions" required rows={5} maxLength={12000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Add specific rules, boundaries, workflows, output formats and context..." className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-md text-on-surface resize-y" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-tone" className="block text-label-sm text-on-surface mb-1.5">Response Tone</label>
              <select id="ai-tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface">
                <option>Analytical</option><option>Friendly &amp; Concise</option><option>Direct &amp; Technical</option><option>Creative &amp; Expressive</option><option>Professional</option>
              </select>
            </div>
            <div>
              <label htmlFor="ai-language" className="block text-label-sm text-on-surface mb-1.5">Primary Language</label>
              <input id="ai-language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface" />
            </div>
          </div>
          <div>
            <label htmlFor="ai-starters" className="block text-label-sm text-on-surface mb-1.5">Starter Prompts <span className="text-outline">(one per line)</span></label>
            <textarea id="ai-starters" rows={3} value={starterText} onChange={(e) => setStarterText(e.target.value)} className="w-full p-3.5 rounded-xl bg-surface-container-low outline-none text-body-sm text-on-surface resize-y" />
          </div>
        </section>

        <div className="p-4 rounded-2xl bg-surface-container-low flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-on-surface">Default to High Thinking Mode</p>
            <p className="text-caption text-on-surface-variant">Cloudflare Workers AI · GPT-OSS 20B</p>
          </div>
          <ToggleSwitch checked={thinkingDefault} onChange={setThinkingDefault} label="Enable High Thinking Mode by default" />
        </div>

        <button type="submit" disabled={saving} className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-md flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
          <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'check'}</span>
          <span>{saving ? 'Saving...' : 'Save & Open Chat'}</span>
        </button>
      </form>
    </MobileStackLayout>
  );
};
